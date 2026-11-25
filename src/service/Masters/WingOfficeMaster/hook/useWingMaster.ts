import { useState, useCallback } from 'react';
import { isFailure, toastError } from '@/utils/dialog';
import type { WingMasterData, WingMasterHookReturn } from '../interface/interface';
import { apiService } from '../../../../services/api';
import { isValidState, stateText, STATE_MESSAGE, WING_CODE_MAX, WING_NAME_MAX } from '../utils/officeRules';

const notify = async (type: 'info' | 'warning' | 'error', title: string, message: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`[${type.toUpperCase()}] ${message}\n\n${detail}`);
    }
};

export const useWingMaster = (): WingMasterHookReturn => {
  const [data, setData] = useState<WingMasterData>({
    wingCode: '',
    name: '',
    state: '1'
  });

  // Track whether the wing was loaded from DB (edit mode) or is new (create mode)
  const [isExisting, setIsExisting] = useState(false);

  const updateWingCode = useCallback((value: string) => {
    setData(prev => ({ ...prev, wingCode: value }));
    setIsExisting(false); // reset mode when code changes
  }, []);

  const fetchWing = useCallback(async (code: string) => {
    if (!code) return;
    try {
      const check = await apiService.getWing(code);
      if (isFailure(check)) toastError(check, 'load the wing');
      if (check.success && check.data) {
        const wing = (check.data as any).data || check.data;
        setData(prev => ({
          ...prev,
          name: wing.wingName || wing.wname || '',
          state: stateText(wing.state ?? wing.winstate)
        }));
        setIsExisting(true);
      }
    } catch { /* not found — user can create new */ }
  }, []);

  const updateName = useCallback((value: string) => {
    setData(prev => ({ ...prev, name: value }));
  }, []);

  const updateState = useCallback((value: string) => {
    setData(prev => ({ ...prev, state: value }));
  }, []);

  const handleOK = useCallback(async () => {
    if (!data.wingCode.trim() || !data.name.trim()) {
      await notify('warning', 'Input Validation Error', 'Wing Code and Name Required', 'Please enter both Wing Code and Wing Name before saving.');
      return;
    }
    if (data.wingCode.trim().length > WING_CODE_MAX || data.name.trim().length > WING_NAME_MAX) {
      await notify('warning', 'Input Validation Error', 'Too Long', `Wing Code can have at most ${WING_CODE_MAX} characters and Wing Name at most ${WING_NAME_MAX}.`);
      return;
    }
    if (!isValidState(data.state)) {
      await notify('warning', 'State', 'Invalid State', STATE_MESSAGE);
      return;
    }

    try {
      const payload = {
        wingId: data.wingCode.trim(),
        wingName: data.name.trim(),
        state: data.state
      };

      // BUG FIX: use isExisting flag (set by fetchWing) instead of a second GET call (TOCTOU race).
      let response;
      if (isExisting) {
        response = await apiService.updateWing(data.wingCode.trim(), payload);
      } else {
        response = await apiService.createWing(payload);
      }

      if (response.success) {
        await notify(
          'info',
          'electron-react-ts',
          'Wing Master Saved Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `WING CODE   : ${data.wingCode}\n` +
          `WING NAME   : ${data.name}\n` +
          `STATE       : ${data.state === '1' ? 'In State (1)' : 'Out State (0)'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ ${isExisting ? 'Updated' : 'Created'} in wing master`
        );
      } else {
        await notify('error', 'Wing Master Error', 'Failed to Save Wing', response.message || 'An unexpected error occurred.');
      }

    } catch (error: any) {
      console.error('Wing Master save error:', error);
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [data, isExisting]);

  const handleCancel = useCallback(() => {
    setData({ wingCode: '', name: '', state: '1' });
    setIsExisting(false);
  }, []);

  return {
    data,
    updateWingCode,
    updateName,
    updateState,
    fetchWing,
    handleOK,
    handleCancel
  };
};

export default useWingMaster;
