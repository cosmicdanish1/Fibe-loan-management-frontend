// hook/useCompulsoryDeposit.ts

import { useState, useCallback, useEffect } from 'react';
import {
    DepositTransaction,
    CompulsoryDepositHookReturn,
    CDMember,
    IncomeHead
} from '../interface/CompulsoryDepositInterfaces';
import { apiService } from '../../../../services/api';

// BUG FIX: removed 'message' and 'Modal' from antd — both silently fail in Electron renderer windows.
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

// BUG FIX: Modal.confirm is also broken in Electron — replaced with native question dialog.
const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question',
            title: 'electron-react-ts',
            message: title,
            detail,
            buttons: ['Confirm', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

export const useCompulsoryDeposit = (): CompulsoryDepositHookReturn => {
    const [formData, setFormData] = useState<DepositTransaction>({
        amount: '',
        incomeHead: '',
        narration: 'Interest Posting',
    });
    const [members, setMembers] = useState<CDMember[]>([]);
    const [incomeHeads, setIncomeHeads] = useState<IncomeHead[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [memberRes, headRes] = await Promise.all([
                apiService.getCDMembers(),
                apiService.getCDIncomeHeads()
            ]);
            if (memberRes.success) {
                setMembers((memberRes.data || []).map((m: any) => ({ ...m, postAmount: '' })));
            }
            if (headRes.success) {
                setIncomeHeads(headRes.data || []);
            }
        } catch (error: any) {
            console.error('Error fetching CD data', error);
            await showDialog('error', 'electron-react-ts', 'Data Load Failed', `Failed to load members or income heads.\n\nTechnical: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateField = useCallback((field: keyof DepositTransaction, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateMemberAmount = useCallback((memberNo: number, amount: string) => {
        setMembers(prev => prev.map(m =>
            m.memberNo === memberNo ? { ...m, postAmount: amount } : m
        ));
    }, []);

    const distributeEqually = useCallback(async () => {
        const total = parseFloat(formData.amount);
        if (isNaN(total) || total <= 0) {
            await showDialog('warning', 'electron-react-ts', 'Invalid Total Amount', 'Please enter a valid total amount before distributing equally.');
            return;
        }
        if (members.length === 0) return;

        const perMember = (total / members.length).toFixed(2);
        setMembers(prev => prev.map(m => ({ ...m, postAmount: perMember })));
        await showDialog(
            'info',
            'electron-react-ts',
            'Amount Distributed',
            `₹${total.toLocaleString('en-IN')} distributed equally among ${members.length} members.\nPer member: ₹${perMember}`
        );
    }, [formData.amount, members.length]);

    const handleSave = async () => {
        if (!formData.incomeHead) {
            await showDialog('error', 'electron-react-ts', 'Income Head Required', 'Please select an Income Head (Debit GL code) before posting.');
            return;
        }

        const validDistributions = members
            .filter(m => parseFloat(m.postAmount as string) > 0)
            .map(m => ({
                memberNo: m.memberNo,
                memberName: m.memberName,
                currentBalance: m.currentBalance,
                postAmount: parseFloat(m.postAmount as string)
            }));

        if (validDistributions.length === 0) {
            await showDialog('error', 'electron-react-ts', 'No Amounts Entered', 'No valid credit amounts found in the members list. Please enter amounts before posting.');
            return;
        }

        const totalDistributed = validDistributions.reduce((sum, d) => sum + d.postAmount, 0);

        // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog.
        const confirmed = await showConfirm(
            'Confirm Bulk CD Posting',
            `You are about to post ₹${totalDistributed.toLocaleString('en-IN')} to ${validDistributions.length} members.\n\nDebit Head   : ${formData.incomeHead}\nNarration    : ${formData.narration || '—'}\n\nThis will immediately update all member CD balances and the ledger.`
        );
        if (!confirmed) return;

        setIsPosting(true);
        try {
            const response = await apiService.postCDTransaction({
                incomeHeadCode: formData.incomeHead,
                totalAmount: totalDistributed,
                distributions: validDistributions,
                narration: formData.narration
            });

            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'CD Transaction Posted Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${response.data?.voucherNo || '—'}\n` +
                    `DEBIT HEAD    : ${formData.incomeHead}\n` +
                    `TOTAL AMOUNT  : ₹${totalDistributed.toLocaleString('en-IN')}\n` +
                    `MEMBERS       : ${validDistributions.length}\n` +
                    `NARRATION     : ${formData.narration || '—'}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Member CD balances updated\n` +
                    `✓ Ledger entries posted`
                );
                fetchData(); // Refresh member list with updated balances
                setFormData(prev => ({ ...prev, amount: '' }));
            } else {
                await showDialog('error', 'electron-react-ts', 'CD Posting Failed', response.message || 'An unexpected error occurred. Please try again.');
            }
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    const handleReset = useCallback(async () => {
        // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog.
        const confirmed = await showConfirm('Reset Form?', 'This will clear all current inputs and individual member amounts. Continue?');
        if (!confirmed) return;

        setFormData({
            amount: '',
            incomeHead: '',
            narration: 'Interest Posting',
        });
        setMembers(prev => prev.map(m => ({ ...m, postAmount: '' })));
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData,
        members,
        incomeHeads,
        isLoading,
        isPosting,
        updateField,
        updateMemberAmount,
        handleSave,
        handleReset,
        handleExit,
        distributeEqually
    };
};
