// hook/useGenerate.ts

import { useState, useCallback } from 'react';
import { apiService } from '../../../../../services/api';
import {
    DemandGenerationData,
    GenerateHookReturn
} from '../interface/GenerateInterfaces';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';

// BUG FIX: removed 'message' from antd — silently fails in Electron renderer windows.
// message.loading / message.success keyed API also requires App context absent in Electron.
// All notifications now use window.electronAPI?.showMessageBox (native OS dialog).

export const useGenerate = (): GenerateHookReturn => {
  const { t } = useTranslation();
    const [formData, setFormData] = useState<DemandGenerationData>({
        month: 'APR',
        year: new Date().getFullYear().toString(),
        divisionRO: '',
        from: '',
        to: ''
    });
    const [, setIsGenerating] = useState(false);

    const updateField = useCallback((field: keyof DemandGenerationData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const resetForm = useCallback(() => {
        setFormData({
            month: 'APR',
            year: new Date().getFullYear().toString(),
            divisionRO: '',
            from: '',
            to: ''
        });
    }, []);

    const generateDemand = useCallback(async () => {
        if (!formData.divisionRO) {
            await showDialog('warning', 'electron-react-ts', t('Administrative Unit Required'), t('Please select an Administrative Unit (Division/RO) before generating the demand list.'));
            return;
        }
        // BUG FIX: validate year — empty/invalid year causes the backend to silently generate for month=0, year=NaN
        const yearNum = parseInt(formData.year);
        if (!formData.year || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Year'), t('Please enter a valid 4-digit year (e.g. 2025).'));
            return;
        }

        setIsGenerating(true);
        try {
            const response = await apiService.generateDemand({
                month: formData.month,
                year: formData.year,
                divisionRO: formData.divisionRO,
                from: formData.from,
                to: formData.to
            });

            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    t('Demand Generation Successful!'),
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `MONTH         : ${formData.month}\n` +
                    `YEAR          : ${formData.year}\n` +
                    `DIVISION / RO : ${formData.divisionRO}\n` +
                    (formData.from ? `FROM MEMBER   : ${formData.from}\n` : '') +
                    (formData.to   ? `TO MEMBER     : ${formData.to}\n`   : '') +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `${response.data?.message || response.message || 'Demand generated successfully.'}`
                );
            } else {
                await showDialog('error', 'electron-react-ts', t('Demand Generation Failed'), response.message || t('An unexpected error occurred. Please try again.'));
            }
        } catch (error: any) {
            console.error(error);
            await showDialog('error', 'electron-react-ts', t('Unable to Connect to Server'), t('Technical details: {{1}}', { 1: error.message }));
        } finally {
            setIsGenerating(false);
        }
    }, [formData]);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        formData,
        updateField,
        resetForm,
        generateDemand,
        handleExit
    };
};
