import { useState, useCallback, useEffect } from 'react';
import { isFailure, toastError } from '@/utils/dialog';
import type { OfficeMasterData, OfficeMasterHookReturn, WingOption } from '../interface/interface';
import { apiService } from '../../../../services/api';
import { officeProblems, buildOfficePayload, movedText } from '../utils/officeRules';

const notify = async (type: 'info' | 'warning' | 'error', title: string, message: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`[${type.toUpperCase()}] ${message}\n\n${detail}`);
    }
};

const EMPTY: OfficeMasterData = { branchNo: '', name: '', wingId: '', divisionNo: '', address: '', city: '' };

export const useOfficeMaster = (): OfficeMasterHookReturn => {
  const [data, setData] = useState<OfficeMasterData>(EMPTY);
  const [wings, setWings] = useState<WingOption[]>([]);

  // Track whether the office was loaded from DB (update) vs new (create): no GET-then-update/catch-create race.
  const [isExisting, setIsExisting] = useState(false);

  const refreshWings = useCallback(async () => {
    try {
      const res: any = await apiService.getWings();
      const raw = res?.data?.data ?? res?.data ?? [];
      if (res?.success !== false && Array.isArray(raw)) {
        setWings(raw.map((w: any) => ({ wingId: String(w.wingId ?? ''), wingName: String(w.wingName ?? ''), state: String(w.state ?? '1') })));
      }
    } catch { /* the box stays empty; the message at save explains */ }
  }, []);

  useEffect(() => { refreshWings(); }, [refreshWings]);

  const fetchOffice = useCallback(async (branchNo: string) => {
    if (!branchNo || !/^\d+$/.test(branchNo.trim())) return;
    try {
      const response = await apiService.getOffice(parseInt(branchNo, 10));
      if (isFailure(response)) toastError(response, 'load the office');
      if (response.success && response.data) {
        const office = (response.data as any).data || response.data;
        setData(prev => ({
          ...prev,
          name: office.officeName || '',
          wingId: String(office.wingId ?? ''),
          divisionNo: office.division === null || office.division === undefined ? '' : String(office.division),
          address: office.address || '',
          city: office.city || ''
        }));
        setIsExisting(true);
        return;
      }
      setIsExisting(false);
    } catch {
      // Not found: switch to "new" mode, clear dependent fields and tell the user.
      setIsExisting(false);
      setData(prev => ({ ...prev, name: '', wingId: '', divisionNo: '', address: '', city: '' }));
      await notify('info', 'Office Lookup', 'No Existing Office', `No office found with number ${branchNo}. Fill in details to create a new one.`);
    }
  }, []);

  const updateBranchNo = useCallback((value: string) => {
    setData(prev => ({ ...prev, branchNo: value }));
    setIsExisting(false); // reset mode when the number changes
  }, []);
  const updateName = useCallback((value: string) => setData(prev => ({ ...prev, name: value })), []);
  const updateWingId = useCallback((value: string) => setData(prev => ({ ...prev, wingId: value })), []);
  const updateDivisionNo = useCallback((value: string) => setData(prev => ({ ...prev, divisionNo: value })), []);
  const updateAddress = useCallback((value: string) => setData(prev => ({ ...prev, address: value })), []);
  const updateCity = useCallback((value: string) => setData(prev => ({ ...prev, city: value })), []);

  const save = useCallback(async () => {
    const problems = officeProblems(data);
    if (problems.length > 0) {
      await notify('warning', 'Input Validation Error', problems[0]!, problems.join('\n'));
      return;
    }
    try {
      const payload = buildOfficePayload(data);
      // A blank Branch No is a new branch: the server gives the next number (highest + 1) so two users never collide.
      const response: any = isExisting && payload.officeId !== undefined
        ? await apiService.updateOffice(payload.officeId as number, payload)
        : await apiService.createOffice(payload);

      if (response.success) {
        const saved = response.data?.data ?? response.data ?? {};
        const officeId = saved.officeId ?? payload.officeId;
        setData(prev => ({ ...prev, branchNo: String(officeId ?? prev.branchNo) }));
        setIsExisting(true); // it now exists: a later save updates it
        const wingName = wings.find(w => w.wingId === data.wingId)?.wingName ?? '';
        await notify(
          'info',
          'Office Master',
          'Office Master Saved Successfully!',
          `OFFICE NO   : ${officeId}\n` +
          `OFFICE NAME : ${data.name.trim()}\n` +
          `DIVISION/RO : ${wingName ? `${wingName} (${data.wingId})` : data.wingId}\n` +
          `CITY        : ${data.city.trim() || '—'}` +
          (movedText(saved.membersMoved) ? `\n\n${movedText(saved.membersMoved)}` : ''),
        );
      } else {
        await notify('error', 'Office Master Error', 'Failed to Save Office', response.message || 'An unexpected error occurred.');
      }
    } catch (error: any) {
      console.error('Office Master save error:', error);
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [data, isExisting, wings]);

  const reset = useCallback(() => {
    setData(EMPTY);
    setIsExisting(false);
  }, []);

  return { data, wings, refreshWings, fetchOffice, updateBranchNo, updateName, updateWingId, updateDivisionNo, updateAddress, updateCity, save, reset };
};

export default useOfficeMaster;
