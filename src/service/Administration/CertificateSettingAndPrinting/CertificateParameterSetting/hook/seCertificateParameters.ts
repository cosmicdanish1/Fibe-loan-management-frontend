// hooks/useCertificateParameters.ts
import { useState, useCallback } from 'react';
import type {
    CertificateParametersState,
    TabType,
    CertificateFormat,
    CertificateDetailSetting,
    CertificateField
} from '../interface/certificateTypes';

export const useCertificateParameters = () => {
  const [state, setState] = useState<CertificateParametersState>({
    activeTab: 'format',
    formatSetting: {
      formatName: '',
      accountType: 'Fixed Deposit - FD'
    },
    detailSetting: {
      formatName: '',
      fields: [
        {
          id: '1',
          name: 'Name',
          row: 0,
          col: 0,
          flag: true,
          inWo: '',
          length: 0,
          visible: true
        }
      ]
    }
  });

  const switchTab = useCallback((tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const updateFormatSetting = useCallback((format: Partial<CertificateFormat>) => {
    setState(prev => ({
      ...prev,
      formatSetting: { ...prev.formatSetting, ...format }
    }));
  }, []);

  const updateDetailSetting = useCallback((detail: Partial<CertificateDetailSetting>) => {
    setState(prev => ({
      ...prev,
      detailSetting: { ...prev.detailSetting, ...detail }
    }));
  }, []);

  const updateField = useCallback((fieldId: string, updates: Partial<CertificateField>) => {
    setState(prev => ({
      ...prev,
      detailSetting: {
        ...prev.detailSetting,
        fields: prev.detailSetting.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  }, []);

  const addField = useCallback((field: CertificateField) => {
    setState(prev => ({
      ...prev,
      detailSetting: {
        ...prev.detailSetting,
        fields: [...prev.detailSetting.fields, field]
      }
    }));
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setState(prev => ({
      ...prev,
      detailSetting: {
        ...prev.detailSetting,
        fields: prev.detailSetting.fields.filter(field => field.id !== fieldId)
      }
    }));
  }, []);

  const handleFind = useCallback(() => {
    console.log('Find action triggered');
  }, []);

  const handleSave = useCallback(() => {
    console.log('Save action triggered', state);
  }, [state]);

  const handleCancel = useCallback(() => {
    console.log('Cancel action triggered');
    setState(prev => ({
      ...prev,
      formatSetting: { formatName: '', accountType: 'Fixed Deposit - FD' },
      detailSetting: { formatName: '', fields: [] }
    }));
  }, []);

  const handleExit = useCallback(() => {
    console.log('Exit action triggered');
  }, []);

  return {
    state,
    switchTab,
    updateFormatSetting,
    updateDetailSetting,
    updateField,
    addField,
    removeField,
    actions: {
      handleFind,
      handleSave,
      handleCancel,
      handleExit
    }
  };
};
