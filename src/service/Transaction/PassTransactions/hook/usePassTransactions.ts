// hook/usePassTransactions.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    TransactionEntry,
    PassTransactionsHookReturn
} from '../interface/PassTransactionsInterfaces';
import { apiService } from '../../../../services/api';
import { csvCell } from '@/utils/csv';
import { localISODate } from '../../../../utils/dates';

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

const formatMoney = (value: unknown) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const usePassTransactions = (): PassTransactionsHookReturn => {
    const [transactionData, setTransactionData] = useState<TransactionEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [reagreementResult, setReagreementResult] = useState<any | null>(null);
    // Per-voucher in-flight guard: the ref blocks a second click synchronously, the state disables the buttons
    const inFlight = useRef<Set<string>>(new Set());
    const [busyVouchers, setBusyVouchers] = useState<string[]>([]);
    const withVoucherLock = async (voucherNo: string, fn: () => Promise<void>) => {
        if (inFlight.current.has(voucherNo)) return;
        inFlight.current.add(voucherNo);
        setBusyVouchers(Array.from(inFlight.current));
        try {
            await fn();
        } finally {
            inFlight.current.delete(voucherNo);
            setBusyVouchers(Array.from(inFlight.current));
        }
    };

    const fetchPendingVouchers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getPendingVouchers();
            if (response.success && response.data) {
                setTransactionData(response.data.map((item: any, index: number) => ({
                    ...item,
                    // a multi-line voucher repeats voucherNo, so the row key must include the position
                    key: `${item.voucherNo || 'row'}-${item.trNo ?? ''}-${index}`
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

    const handlePass = (voucherNo: string) => withVoucherLock(voucherNo, () => runPass(voucherNo));

    const runPass = async (voucherNo: string) => {
        // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog.
        // This is a CRITICAL fix: passing a voucher posts permanently to the ledger.
        // Without this fix, the user saw no dialog and the pass never executed.
        const pendingRow: any = transactionData.find(t => t.voucherNo === voucherNo);
        const raInfo = pendingRow?.kind === 'REAGREEMENT' ? pendingRow.reagreement : null;
        const confirmed = await showConfirm(
            raInfo ? 'Pass Loan Re-agreement — Final Confirmation' : 'Pass Voucher — Final Confirmation',
            raInfo
                ? `Voucher No: ${voucherNo}\nRe-agreement ${raInfo.reagreementNo}: case ${raInfo.oldLoanCaseNo} -> new case ${raInfo.newLoanCaseNo}\n\n`
                  + `Collected now: ${formatMoney(raInfo.collect?.total)} (NR interest + penalty)\n`
                  + `New agreement: ${raInfo.neu?.installments} installments @ ${raInfo.neu?.rate}%, EMI ${formatMoney(raInfo.neu?.monthlyInstallment)}\n\n`
                  + `This will make the new loan case active, close the old case as re-agreed, post the receipts to the ledger and save the printed agreement. The figures are re-checked first; the pass is refused if the loan has changed since the voucher was created.\n\nProceed?`
                : `Voucher No: ${voucherNo}\n\nThis will PERMANENTLY post the transaction to the ledger and cashbook. This action cannot be undone.\n\nAre you sure you want to proceed?`,
            'Pass'
        );
        if (!confirmed) return;

        try {
            const response = await apiService.passTransaction(voucherNo);
            if (response.success) {
                // Surface loan consolidation explicitly — passTransaction()
                // now returns a `consolidation` block whenever this
                // disbursement absorbed an existing same-type loan (see
                // pass-transaction.service.ts). Previously this happened
                // silently: an old case got zeroed and a new combined one
                // created with no indication to the operator it occurred.
                const consolidation = (response.data as any)?.consolidation;
                const reagreement = (response.data as any)?.reagreement;
                if (reagreement) {
                    // The screen shows the result + the saved agreement (view / print / PDF / image).
                    setReagreementResult({ ...reagreement, voucherNo });
                    fetchPendingVouchers();
                    return;
                }
                let consolidationDetail = '';
                if (consolidation) {
                    const caseLines = consolidation.consolidatedCases
                        .map((c: any) =>
                            `CASE ${c.loancaseno} WAS SETTLED\n`
                            + `  Outstanding principal                 ${formatMoney(c.oldBalance)}\n`
                            + `  Closure interest: NR ${formatMoney(c.nrInterest)} + AP ${formatMoney(c.apInterest)} + Penal ${formatMoney(c.penalInterest)}\n`
                            + `  Settlement Amount                     ${formatMoney(c.oldBalance)} + ${formatMoney(c.closureInterest)} = ${formatMoney(Number(c.oldBalance) + Number(c.closureInterest))}`
                        )
                        .join('\n\n');
                    const deductionLines = (consolidation.disbursementDeductions || [])
                        .map((d: any) => `  ${d.name} (${d.code})                 ${formatMoney(d.amount)}`)
                        .join('\n');
                    const plan = consolidation.repaymentPlan;
                    consolidationDetail =
                        `\n\nLOAN CONSOLIDATION COMPLETED\n` +
                        `Member: ${consolidation.memberNo}    Loan Type: ${consolidation.loanType}\n` +
                        `The active loan of the same type was settled and replaced by the new loan.\n\n` +
                        `1. OLD LOAN SETTLEMENT\n${caseLines}\n\n` +
                        `2. NEW CONSOLIDATED LOAN\n` +
                        `  Fresh Sanctioned Amount              ${formatMoney(consolidation.sanctionedAmount)}\n` +
                        `+ Old Outstanding Principal            ${formatMoney(consolidation.existingOutstandingPrincipal)}\n` +
                        `= Consolidated Loan Amount             ${formatMoney(consolidation.combinedPrincipal)}\n` +
                        `  New Loan Case                         ${consolidation.newLoanCaseNo}\n\n` +
                        `3. CASH PAYOUT TO THE MEMBER\n` +
                        `  Fresh Sanctioned Amount              ${formatMoney(consolidation.sanctionedAmount)}\n` +
                        `- Old loan closure interest            ${formatMoney(consolidation.oldClosureInterestTotal)}\n` +
                        (deductionLines ? `- RD / Share deductions\n${deductionLines}\n` : '') +
                        `= Net Disbursement Amount              ${formatMoney(consolidation.netDisbursement)}\n` +
                        `  Note: old principal is carried into the new loan, not deducted from the cash payout.\n\n` +
                        `4. NEW REPAYMENT BASIS\n` +
                        `  Installments                           ${plan?.installments ?? '—'}\n` +
                        `  Principal per installment             ${formatMoney(plan?.monthlyPrincipal)}\n` +
                        `  Scheduled interest per installment    ${formatMoney(plan?.monthlyInterest)}\n` +
                        `  Scheduled installment amount          ${formatMoney(plan?.monthlyInstallment)}\n` +
                        `  Slot / sub-slot                       Slot ${plan?.slot ?? '—'} / ${plan?.subSlot ?? '—'}\n` +
                        `  Interest delay                       ${plan?.interestDelayMonths ?? '—'} month(s)\n` +
                        `  First EMI delay                      ${plan?.firstDueDelayMonths ?? plan?.delayMonths ?? '—'} month(s)\n\n` +
                        `Audit result: the old case balance is zero and linked to new case ${consolidation.newLoanCaseNo}.`;
                }
                await showDialog(
                    'info',
                    'electron-react-ts',
                    'Voucher Passed Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `VOUCHER NO    : ${voucherNo}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Transaction posted to ledger\n` +
                    `✓ Cashbook updated\n` +
                    `✓ Voucher status: POSTED` +
                    consolidationDetail
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

    const handleDelete = (voucherNo: string) => withVoucherLock(voucherNo, () => runDelete(voucherNo));

    const runDelete = async (voucherNo: string) => {
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
            .map(row => row.map(c => csvCell(c)).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pending-vouchers-${localISODate()}.csv`;
        link.click();
        // Revoking immediately can cancel the download in some browsers - defer it
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [transactionData]);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    const clearReagreementResult = useCallback(() => setReagreementResult(null), []);

    return {
        reagreementResult,
        clearReagreementResult,
        transactionData,
        isLoading,
        busyVouchers,
        handleRefresh,
        handlePass,
        handleDelete,
        handleExport,
        handleExit,
    };
};
