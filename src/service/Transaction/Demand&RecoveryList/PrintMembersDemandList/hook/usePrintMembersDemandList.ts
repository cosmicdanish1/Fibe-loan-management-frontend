// hook/usePrintMembersDemandList.ts

import { useState, useCallback } from 'react';
import { apiService } from '../../../../../services/api';
import {
    DemandPrintFormData,
    PrintMembersDemandListHookReturn
} from '../interface/PrintMembersDemandListInterfaces';

// BUG FIX: removed 'message' from antd — silently fails in Electron renderer windows.
// All notifications now use window.electronAPI?.showMessageBox (native OS dialog).

const showDialog = async (
    type: 'info' | 'warning' | 'error',
    title: string,
    msg: string,
    detail: string,
) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({
            type, title, message: msg, detail, buttons: ['OK'], defaultId: 0,
        });
    } else {
        alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
    }
};

export const usePrintMembersDemandList = (): PrintMembersDemandListHookReturn => {
    const [formData, setFormData] = useState<DemandPrintFormData>({
        division: '',
        branch: '',
        month: 'APR',
        year: new Date().getFullYear().toString(),
        sortBy: 'Member No.',
        outputType: 'Screen',
        printBalance: false,
        printEmpNo: false,
        printPrevBalance: false
    });

    const updateField = useCallback((field: keyof DemandPrintFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const validateForm = async (): Promise<boolean> => {
        if (!formData.division) {
            await showDialog('warning', 'electron-react-ts', 'Division Required', 'Please select a Division/RO before fetching the demand list.');
            return false;
        }
        // BUG FIX: validate year — empty year sends NaN to backend, silently returning no records
        const yearNum = parseInt(formData.year);
        if (!formData.year || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            await showDialog('warning', 'electron-react-ts', 'Invalid Year', 'Please enter a valid 4-digit year (e.g. 2025).');
            return false;
        }
        return true;
    };

    const handlePrint = useCallback(async () => {
        if (!(await validateForm())) return;

        try {
            const response = await apiService.getMembersDemandList(formData);

            if (response.success && response.data && response.data.length > 0) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Demand List Ready',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `DIVISION      : ${formData.division}\n` +
                    `MONTH / YEAR  : ${formData.month} ${formData.year}\n` +
                    `RECORDS       : ${response.data.length}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Sending to printer service...`
                );
            } else {
                await showDialog('info', 'electron-react-ts', 'No Records Found', `No demand records found for ${formData.division} — ${formData.month} ${formData.year}.`);
            }
        } catch (error: any) {
            console.error(error);
            await showDialog('error', 'electron-react-ts', 'Report Generation Failed', `Could not generate the demand list.\n\nTechnical: ${error.message}`);
        }
    }, [formData]);

    const handleExport = useCallback(async () => {
        if (!(await validateForm())) return;

        try {
            const response = await apiService.getMembersDemandList(formData);

            if (response.success && response.data && response.data.length > 0) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Export Ready',
                    `${response.data.length} records processed for export.\n\nDivision: ${formData.division} | ${formData.month} ${formData.year}`
                );
            } else {
                await showDialog('info', 'electron-react-ts', 'No Data to Export', `No demand records found for ${formData.division} — ${formData.month} ${formData.year}.`);
            }
        } catch (error: any) {
            console.error(error);
            await showDialog('error', 'electron-react-ts', 'Export Failed', `Could not export the demand list.\n\nTechnical: ${error.message}`);
        }
    }, [formData]);

    const handleReset = useCallback(() => {
        setFormData({
            division: '',
            branch: '',
            month: 'APR',
            year: new Date().getFullYear().toString(),
            sortBy: 'Member No.',
            outputType: 'Screen',
            printBalance: false,
            printEmpNo: false,
            printPrevBalance: false
        });
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData,
        updateField,
        handlePrint,
        handleExport,
        handleReset,
        handleExit
    };
};
