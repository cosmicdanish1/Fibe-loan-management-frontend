// hook/usePassTransactions.ts

import { useState, useCallback, useEffect } from 'react';
import {
    TransactionEntry,
    PassTransactionsHookReturn
} from '../interface/PassTransactionsInterfaces';
import { apiService } from '../../../../services/api';

// BUG FIX: removed 'message' and 'Modal' from antd — both silently fail in Electron renderer windows.
// All notifications now use window.electronAPI?.showMessageBox (native OS dialog).
// CRITICAL: Pass and Delete are irreversible — the Modal.confirm that was used here would
// silently no-op in Electron, meaning the user had NO confirmation dialog before ledger posting.

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
// Returns true if the user clicked the first button (confirmed).
const showConfirm = async (title: string, detail: string, confirmLabel = 'Confirm'): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question',
            title: 'electron-react-ts',
            message: title,
            detail,
            buttons: [confirmLabel, 'Cancel'],
            defaultId: 0,
            cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

export const usePassTransactions = (): PassTransactionsHookReturn => {
    const [transactionData, setTransactionData] = useState<TransactionEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPendingVouchers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getPendingVouchers();
            if (response.success && response.data) {
                setTransactionData(response.data.map((item: any, index: number) => ({
                    ...item,
                    key: item.voucherNo || index.toString()
                })));
            }
        } catch (error: any) {
            console.error('Error fetching pending vouchers:', error);
            await showDialog('error', 'electron-react-ts', 'Failed to Load Vouchers', `Could not retrieve pending vouchers.\n\nTechnical: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingVouchers();
    }, [fetchPendingVouchers]);

    const handleRefresh = useCallback(() => {
        fetchPendingVouchers();
    }, [fetchPendingVouchers]);

    const handlePass = async (voucherNo: string) => {
        // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog.
        // This is a CRITICAL fix: passing a voucher posts permanently to the ledger.
        // Without this fix, the user saw no dialog and the pass never executed.
        const confirmed = await showConfirm(
            'Pass Voucher — Final Confirmation',
            `Voucher No: ${voucherNo}\n\nThis will PERMANENTLY post the transaction to the ledger and cashbook. This action cannot be undone.\n\nAre you sure you want to proceed?`,
            'Pass'
        );
        if (!confirmed) return;

        try {
            const response = await apiService.passTransaction(voucherNo);
            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Voucher Passed Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${voucherNo}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Transaction posted to ledger\n` +
                    `✓ Cashbook updated\n` +
                    `✓ Voucher status: POSTED`
                );
                fetchPendingVouchers();
            } else {
                // BUG FIX: was response.error || response.message — .error field doesn't exist on TransformInterceptor response
                await showDialog('error', 'electron-react-ts', 'Pass Transaction Failed', response.message || `Failed to pass voucher: ${voucherNo}`);
            }
        } catch (error: any) {
            console.error('[PassTransaction] Error:', error);
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    };

    const handleDelete = async (voucherNo: string) => {
        // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog.
        // This is a CRITICAL fix: deleting a voucher permanently removes it and all its entries.
        // Without this fix, the user saw no dialog and the delete never executed.
        const confirmed = await showConfirm(
            'Delete Voucher — Final Confirmation',
            `Voucher No: ${voucherNo}\n\nThis will PERMANENTLY DELETE this voucher and all its transaction entries. This action cannot be undone.\n\nAre you sure you want to delete?`,
            'Delete'
        );
        if (!confirmed) return;

        try {
            const response = await apiService.deleteVoucher(voucherNo);
            if (response.success) {
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Voucher Deleted',
                    `Voucher ${voucherNo} and all its transaction entries have been permanently removed.`
                );
                fetchPendingVouchers();
            } else {
                // BUG FIX: was response.error || response.message — .error field doesn't exist
                await showDialog('error', 'electron-react-ts', 'Delete Failed', response.message || `Failed to delete voucher: ${voucherNo}`);
            }
        } catch (error: any) {
            console.error('[PassTransaction] Delete Error:', error);
            await showDialog('error', 'electron-react-ts', 'Unable to Connect to Server', `Technical details: ${error.message}`);
        }
    };

    const handleExport = useCallback(() => {
        if (!transactionData || transactionData.length === 0) {
            showDialog('warning', 'electron-react-ts', 'Nothing to Export', 'There are no pending vouchers to export.');
            return;
        }
        const headers = ['Tr No', 'Voucher No', 'Member No', 'Name', 'No. of Acc', 'Head', 'Trans Type', 'Amount', 'Vchr Type', 'Cheque No'];
        const rows = transactionData.map(r => [
            r.trNo, r.voucherNo, r.memberNo, r.memberName, r.noOfAcc, r.head, r.transType, r.amount, r.vchrType, r.chequeNo,
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pending-vouchers-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [transactionData]);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        transactionData,
        isLoading,
        handleRefresh,
        handlePass,
        handleDelete,
        handleExport,
        handleExit,
    };
};
