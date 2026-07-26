import { useState, useCallback } from 'react';
import type { OfficeMasterData, OfficeMasterHookReturn } from '../interface/interface';
import { apiService } from '../../../../services/api';

const notify = async (type: 'info' | 'warning' | 'error', title: string, message: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`[${type.toUpperCase()}] ${message}\n\n${detail}`);
    }
};

export const useOfficeMaster = (): OfficeMasterHookReturn => {
  const [data, setData] = useState<OfficeMasterData>({
    branchNo: '',
    name: '',
    divisionRO: '',
    address: '',
    city: ''
  });

  // Track whether the office was loaded from DB (update) vs new (create) — mirrors the Wing flow,
  // avoiding the GET-then-update/catch-create TOCTOU pattern.
  const [isExisting, setIsExisting] = useState(false);

  const fetchOffice = useCallback(async (branchNo: string) => {
    if (!branchNo || isNaN(parseInt(branchNo))) return;
    try {
      const response = await apiService.getOffice(parseInt(branchNo));
      if (response.success && response.data) {
        const office = (response.data as any).data || response.data;
        setData(prev => ({
          ...prev,
          name: office.officeName || office.office_name || '',
          divisionRO: (office.division ?? '').toString(),
          address: office.address || '',
          city: office.city || ''
        }));
        setIsExisting(true);
        return;
      }
      setIsExisting(false);
    } catch {
      // Not found — switch to "new" mode, clear dependent fields and tell the user.
      setIsExisting(false);
      setData(prev => ({ ...prev, name: '', divisionRO: '', address: '', city: '' }));
      await notify('info', 'Office Lookup', 'No Existing Office', `No office found with number ${branchNo}. Fill in details to create a new one.`);
    }
  }, []);

  const updateBranchNo = useCallback((value: string) => {
    setData(prev => ({ ...prev, branchNo: value }));
    setIsExisting(false); // reset mode when the number changes
  }, []);

  const updateName = useCallback((value: string) => {
    setData(prev => ({ ...prev, name: value }));
  }, []);

  const updateDivisionRO = useCallback((value: string) => {
    setData(prev => ({ ...prev, divisionRO: value }));
  }, []);

  const updateAddress = useCallback((value: string) => {
    setData(prev => ({ ...prev, address: value }));
  }, []);

  const updateCity = useCallback((value: string) => {
    setData(prev => ({ ...prev, city: value }));
  }, []);

  const save = useCallback(async () => {
    if (!data.name) {
      await notify('warning', 'Input Validation Error', 'Office Name Required', 'Please enter an office name before saving.');
      return;
    }

    try {
      // officeno is NOT NULL. The UI says "leave blank for new", so when blank we auto-assign
      // the next number (MAX + 1) instead of blocking the user. A typed value must be numeric.
      let officeId: number;
      if (!data.branchNo || data.branchNo.trim() === '') {
        try {
          const list = await apiService.getOffices();
          const offices = (list.data as any)?.data || list.data || [];
          const maxNo = Array.isArray(offices)
            ? offices.reduce((m: number, o: any) => Math.max(m, Number(o.officeId ?? o.officeno ?? 0)), 0)
            : 0;
          officeId = maxNo + 1;
        } catch {
          officeId = 1;
        }
      } else if (isNaN(parseInt(data.branchNo))) {
        await notify('warning', 'Input Validation Error', 'Invalid Branch No', 'Branch / Office No must be numeric. Leave it blank to auto-assign a new number.');
        return;
      } else {
        officeId = parseInt(data.branchNo);
      }

      const payload = {
        officeId,
        officeName: data.name,
        division: data.divisionRO,
        address: data.address,
        city: data.city
      };

      // Use the isExisting flag (set by fetchOffice) instead of a second GET — no TOCTOU race.
      const response = isExisting
        ? await apiService.updateOffice(officeId, payload)
        : await apiService.createOffice(payload);

      if (response.success) {
        setData(prev => ({ ...prev, branchNo: String(officeId) })); // reflect the (possibly auto-assigned) number
        setIsExisting(true); // it now exists — a subsequent save updates rather than re-creates
        await notify(
          'info',
          'electron-react-ts',
          'Office Master Saved Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `OFFICE NO   : ${officeId}\n` +
          `OFFICE NAME : ${data.name}\n` +
          `DIVISION/RO : ${data.divisionRO || '—'}\n` +
          `CITY        : ${data.city || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved to office master`
        );
      } else {
        await notify('error', 'Office Master Error', 'Failed to Save Office', response.message || 'An unexpected error occurred.');
      }

    } catch (error: any) {
      console.error('Office Master save error:', error);
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [data, isExisting]);

  const reset = useCallback(() => {
    setData({ branchNo: '', name: '', divisionRO: '', address: '', city: '' });
    setIsExisting(false);
  }, []);

  return {
    data,
    fetchOffice,
    updateBranchNo,
    updateName,
    updateDivisionRO,
    updateAddress,
    updateCity,
    save,
    reset
  };
};

export default useOfficeMaster;
