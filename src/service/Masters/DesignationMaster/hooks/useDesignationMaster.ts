import { useState, useCallback, useEffect } from 'react';
import type { DesignationData, DesignationHookReturn } from '../interfaces/interface';
import { apiService } from '../../../../services/api';

const notify = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail: string) => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
  }
};

export const useDesignationMaster = (): DesignationHookReturn => {
  const [formData, setFormData] = useState<DesignationData>({ code: '', name: '', level: '' });
  const [designations, setDesignations] = useState<DesignationData[]>([]);

  const fetchDesignations = useCallback(async () => {
    try {
      const response = await apiService.getDesignations();
      if (response.success && response.data) {
        const raw = Array.isArray(response.data) ? response.data : [];
        setDesignations(raw.map((d: any) => ({
          code: (d.code || d.designationcode || '').toString(),
          name: d.name || d.designationName || d.designationname || '',
          level: d.level != null ? d.level.toString() : (d.designationlevel != null ? d.designationlevel.toString() : ''),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch designations:', error);
      notify('error', 'Load Error', 'Failed to Load Designations', 'Could not retrieve the designation list. Please refresh and try again.');
    }
  }, []);

  useEffect(() => { fetchDesignations(); }, [fetchDesignations]);

  // Existence is derived from the loaded list — no dependency on a single-fetch endpoint.
  const isExisting = !!formData.code && designations.some(d => d.code === formData.code);

  const handleChange = useCallback((field: keyof DesignationData, value: string) => {
    // Level is a whole number; strip non-digits. Code/name free text.
    const v = field === 'level' ? value.replace(/[^0-9]/g, '') : value;
    setFormData(prev => ({ ...prev, [field]: v }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.code || !formData.name) {
      await notify('warning', 'Input Validation Error', 'Code and Name Required', 'Please enter both Designation Code and Name before saving.');
      return;
    }

    const exists = designations.some(d => d.code === formData.code);
    try {
      const dto = {
        code: formData.code,
        name: formData.name,
        level: formData.level ? parseInt(formData.level) : undefined,
      };

      const response = exists
        ? await apiService.updateDesignation(formData.code, dto)
        : await apiService.createDesignation(dto);

      if (response.success) {
        await notify(
          'info',
          'electron-react-ts',
          `Designation ${exists ? 'Updated' : 'Created'} Successfully!`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `CODE   : ${formData.code}\n` +
          `NAME   : ${formData.name}\n` +
          `LEVEL  : ${formData.level || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ ${exists ? 'Updated' : 'Saved to'} designation master`
        );
        setFormData({ code: '', name: '', level: '' });
        fetchDesignations();
      } else {
        await notify('error', 'Designation Error', `Failed to ${exists ? 'Update' : 'Create'} Designation`, response.message || 'An unexpected error occurred.');
      }
    } catch (error: any) {
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [formData, designations, fetchDesignations]);

  const editDesignation = useCallback((d: DesignationData) => {
    setFormData(d);
  }, []);

  const deleteDesignation = useCallback(async (code: string) => {
    const d = designations.find(x => x.code === code);

    // Confirm before deleting a master record.
    const eAPI = (window as any).electronAPI;
    if (eAPI?.showMessageBox) {
      const res = await eAPI.showMessageBox({
        type: 'warning',
        title: 'Confirm Delete',
        message: `Delete designation "${d?.name || code}"?`,
        detail: 'This permanently removes the designation from designation_master.',
        buttons: ['Cancel', 'Delete'],
        defaultId: 0,
        cancelId: 0,
      });
      if (res?.response !== 1) return;
    } else if (!window.confirm(`Delete designation "${d?.name || code}"?`)) {
      return;
    }

    try {
      const response = await apiService.deleteDesignation(code);
      if (response.success) {
        await notify('info', 'electron-react-ts', 'Designation Deleted', `Designation ${code} has been removed.`);
        if (formData.code === code) setFormData({ code: '', name: '', level: '' });
        fetchDesignations();
      } else {
        await notify('error', 'Delete Error', 'Failed to Delete Designation', response.message || 'An unexpected error occurred.');
      }
    } catch (error: any) {
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [designations, formData.code, fetchDesignations]);

  const handleCancel = useCallback(() => {
    setFormData({ code: '', name: '', level: '' });
  }, []);

  const handleExit = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('close-window');
    }
  }, []);

  return {
    formData,
    designations,
    isExisting,
    handleChange,
    editDesignation,
    deleteDesignation,
    handleSave,
    handleCancel,
    handleExit,
  };
};
