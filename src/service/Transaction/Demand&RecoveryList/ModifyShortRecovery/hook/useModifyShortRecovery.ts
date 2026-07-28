// hook/useModifyShortRecovery.ts

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../../../../../services/api';
import {
    ModifyShortRecoveryFormData,
    ShortRecoveryRecord,
    ModifyShortRecoveryHookReturn
} from '../interface/ModifyShortRecoveryInterfaces';

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

// BUG FIX: zeroing a member's balance is irreversible — requires explicit confirmation.
const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question',
            title: 'electron-react-ts',
            message: title,
            detail,
            buttons: ['Adjust', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

export const useModifyShortRecovery = (): ModifyShortRecoveryHookReturn => {
    const [formData, setFormData] = useState<ModifyShortRecoveryFormData>({
        wing: 'Wing A',
        month: 'APR',
        year: new Date().getFullYear().toString(),
        selectedMemberId: '',
        adjustmentReason: ''
    });

    const [shortRecoveryList, setShortRecoveryList] = useState<ShortRecoveryRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ShortRecoveryRecord | null>(null);

    const fetchRecoveries = useCallback(async () => {
        try {
            const response = await apiService.getShortRecoveries({
                month: formData.month,
                year: formData.year,
                wing: formData.wing
            });
            if (response.success && response.data) {
                setShortRecoveryList(response.data);
            } else {
                setShortRecoveryList([]);
            }
        } catch (error: any) {
            console.error(error);
            await showDialog('error', 'electron-react-ts', 'Failed to Fetch Recoveries', `Could not retrieve short recovery records.\n\nTechnical: ${error.message}`);
        }
    }, [formData.month, formData.year, formData.wing]);

    useEffect(() => {
        fetchRecoveries();
    }, [fetchRecoveries]);

    const updateField = useCallback((field: keyof ModifyShortRecoveryFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSelectRecord = useCallback((record: ShortRecoveryRecord) => {
        setSelectedRecord(record);
        setFormData(prev => ({ ...prev, selectedMemberId: record.memberNo }));
    }, []);

    const handleSaveAdjustment = useCallback(async () => {
        if (!selectedRecord) {
            await showDialog('warning', 'electron-react-ts', 'No Record Selected', 'Please select a member record from the list before saving an adjustment.');
            return;
        }
        // BUG FIX: adjustmentReason is required — backend saves it but was never validated on frontend;
        // an empty reason creates an adjustment record with no audit trail.
        if (!formData.adjustmentReason || formData.adjustmentReason.trim() === '') {
            await showDialog('warning', 'electron-react-ts', 'Reason Required', 'Please enter an adjustment reason before proceeding. This is required for the audit trail.');
            return;
        }
        // BUG FIX: parseInt(selectedRecord.id) can produce NaN if id is undefined/empty string,
        // causing the backend to receive demandId=NaN and silently throw "Demand not found".
        const demandId = parseInt(selectedRecord.id);
        if (isNaN(demandId) || demandId <= 0) {
            await showDialog('error', 'electron-react-ts', 'Invalid Record', 'The selected record has an invalid ID. Please refresh the list and try again.');
            return;
        }

        // BUG FIX: zeroing a member's shortfall balance is irreversible — confirm before executing.
        const confirmed = await showConfirm(
            'Confirm Short Recovery Adjustment',
            `Member No     : ${selectedRecord.memberNo}\n` +
            `Member Name   : ${selectedRecord.memberName || '—'}\n` +
            `Shortfall Amt : ₹${Number(selectedRecord.shortfallAmount).toLocaleString('en-IN')}\n` +
            `Reason        : ${formData.adjustmentReason}\n\n` +
            `This will permanently zero the shortfall balance for this member. Continue?`
        );
        if (!confirmed) return;

        try {
            const response = await apiService.adjustShortRecovery({
                demandId,
                reason: formData.adjustmentReason.trim(),
                amount: selectedRecord.shortfallAmount
            });

            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Recovery Adjusted Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `MEMBER NO     : ${selectedRecord.memberNo}\n` +
                    `SHORTFALL AMT : ₹${Number(selectedRecord.shortfallAmount).toLocaleString('en-IN')}\n` +
                    `REASON        : ${formData.adjustmentReason}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Demand balance set to zero\n` +
                    `✓ Adjustment record saved`
                );
                // Remove the adjusted record from local list
                setShortRecoveryList(prev => prev.filter(item => item.id !== selectedRecord.id));
                setSelectedRecord(null);
                setFormData(prev => ({ ...prev, adjustmentReason: '' }));
            } else {
                await showDialog('error', 'electron-react-ts', 'Adjustment Failed', response.message || 'The server could not complete the adjustment. Please try again.');
            }
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    }, [selectedRecord, formData.adjustmentReason]);

    const handleRefresh = useCallback(() => {
        fetchRecoveries();
        setSelectedRecord(null);
    }, [fetchRecoveries]);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        formData,
        updateField,
        shortRecoveryList,
        selectedRecord,
        handleSelectRecord,
        handleSaveAdjustment,
        handleRefresh,
        handleExit
    };
};
