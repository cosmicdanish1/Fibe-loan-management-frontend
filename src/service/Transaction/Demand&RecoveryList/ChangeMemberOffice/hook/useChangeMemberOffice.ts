// hook/useChangeMemberOffice.ts

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../../../../../services/api';
import {
    ChangeMemberOfficeFormData,
    ChangeMemberOfficeHookReturn
} from '../interface/ChangeMemberOfficeInterfaces';

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

// BUG FIX: office transfer is irreversible — requires explicit user confirmation.
const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question',
            title: 'electron-react-ts',
            message: title,
            detail,
            buttons: ['Transfer', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

export const useChangeMemberOffice = (): ChangeMemberOfficeHookReturn => {
    const [formData, setFormData] = useState<ChangeMemberOfficeFormData>({
        month: 'APR',
        year: new Date().getFullYear().toString(),
        memberNo: '',
        currentBranchNo: '',
        newBranchNo: '',
    });

    const [isProcessing, setIsProcessing] = useState(false);

    const updateField = useCallback((field: keyof ChangeMemberOfficeFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Autofetch current branch when member ID changes (debounced 500ms)
    useEffect(() => {
        if (!formData.memberNo || formData.memberNo.trim() === '') {
            updateField('currentBranchNo', '');
            return;
        }
        // BUG FIX: validate memberNo before parseInt — NaN passed to API caused silent 404/500
        const mbNoInt = parseInt(formData.memberNo);
        if (isNaN(mbNoInt) || mbNoInt <= 0) {
            updateField('currentBranchNo', '');
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await apiService.getMemberAdminDetails(mbNoInt);
                if (response.success && response.data) {
                    updateField('currentBranchNo', response.data.officeId || 'Not Assigned');
                } else {
                    updateField('currentBranchNo', 'Member not found');
                }
            } catch (error) {
                console.error('Error fetching member details:', error);
                updateField('currentBranchNo', '');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.memberNo, updateField]);

    const handleTransfer = useCallback(async () => {
        if (!formData.memberNo || !formData.newBranchNo) {
            await showDialog('warning', 'electron-react-ts', 'Required Fields Missing', 'Please enter both Member No and the New Branch/Office before transferring.');
            return;
        }
        // BUG FIX: validate memberNo as integer
        const mbNoInt = parseInt(formData.memberNo);
        if (isNaN(mbNoInt) || mbNoInt <= 0) {
            await showDialog('warning', 'electron-react-ts', 'Invalid Member No', 'Please enter a valid numeric Member No.');
            return;
        }
        // BUG FIX: prevent same-office transfer — would silently succeed with no real change
        if (formData.newBranchNo === formData.currentBranchNo) {
            await showDialog('warning', 'electron-react-ts', 'Same Office Selected', `Member ${formData.memberNo} is already assigned to office "${formData.currentBranchNo}".\nPlease select a different new office.`);
            return;
        }

        // BUG FIX: office change is an irreversible operation — must confirm before executing
        const confirmed = await showConfirm(
            'Confirm Office Transfer',
            `Member No     : ${formData.memberNo}\n` +
            `Current Office: ${formData.currentBranchNo || '—'}\n` +
            `New Office    : ${formData.newBranchNo}\n\n` +
            `This will permanently reassign the member's office. Continue?`
        );
        if (!confirmed) return;

        setIsProcessing(true);
        try {
            const response = await apiService.transferMemberAdmin({
                memberNo: mbNoInt,
                newOfficeId: formData.newBranchNo
            });

            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Member Transferred Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `MEMBER NO     : ${formData.memberNo}\n` +
                    `FROM OFFICE   : ${formData.currentBranchNo || '—'}\n` +
                    `TO OFFICE     : ${formData.newBranchNo}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Office assignment updated`
                );
                handleCancel();
            } else {
                await showDialog('error', 'electron-react-ts', 'Transfer Failed', response.message || 'The server could not complete the transfer. Please try again.');
            }
        } catch (error: any) {
            console.error('Transfer error:', error);
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [formData]);

    const handleCancel = useCallback(() => {
        setFormData({
            month: 'APR',
            year: new Date().getFullYear().toString(),
            memberNo: '',
            currentBranchNo: '',
            newBranchNo: '',
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
        handleTransfer,
        handleCancel,
        handleExit,
        isProcessing,
    };
};
