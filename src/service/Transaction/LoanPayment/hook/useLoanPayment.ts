// hook/useLoanPayment.ts

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
    LoanPaymentData,
    ModalData,
    LoanPaymentHookReturn,
    LoanCase,
    PaymentEntry
} from '../interface/LoanPaymentInterfaces';
import { API_ROUTES, API_BASE_URL, getApiBaseUrl } from '../../../../services/apiVersionConfig';

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

export const useLoanPayment = (): LoanPaymentHookReturn => {
    const [formData, setFormData] = useState<LoanPaymentData>({
        loanCaseNo: '',
        memberNo: '',
        memberName: '',
        sanctionAmount: '',
        officeNo: '',
        subDivision: '',
        hCode: '',
        hName: '',
        paymentMode: 'cash',
        chequeDate: dayjs(),
        chequeNo: '',
        bankName: '',
        narration: '',
        sanctionLoanAmount: '',
        noOfInstallments: ''
    });

    const [modalData, setModalData] = useState<ModalData>({
        isOpen: false,
        loanCaseNo: '',
        loanType: '',
        memberNo: '',
        memberName: '',
        officeNo: '',
        subDivision: '',
        appliedAmount: '',
        applicationDate: '',
        basicPay: '',
        currentBalance: '0',
        shareAmount: '',
        purpose: '',
        formNumber: '0',
        surety1Gr: '',
        surety1Name: '',
        surety1Office: '',
        surety1Division: '',
        surety1LoanBalance: '0',
        surety2Gr: '',
        surety2Name: '',
        surety2Office: '',
        surety2Division: '',
        surety2LoanBalance: '0',
        sanctionedAmount: '',
        sanctionDate: '',
        noOfInstallments: '',
        rate: '',
        penalRate: '',
        installmentAmount: '',
        intAmount: ''
    });

    const [loanCases, setLoanCases] = useState<LoanCase[]>([]);
    const [isLoadingCases, setIsLoadingCases] = useState(false);
    const [actualAmount, setActualAmount] = useState(0);
    const [bankBalance, setBankBalance] = useState(0);
    const [totalReceipt, setTotalReceipt] = useState(0);
    const [totalPayment, setTotalPayment] = useState(0);
    const [voucherEntries, setVoucherEntries] = useState<PaymentEntry[]>([]);
    const [headList, setHeadList] = useState<{ code: string; name: string }[]>([]);
    const [bankList, setBankList] = useState<{ code: string; name: string }[]>([]);

    useEffect(() => {
        const sanctionAmt = parseFloat(formData.sanctionLoanAmount) || 0;
        let receipts = 0;
        let payments = 0;
        voucherEntries.forEach(entry => {
            if (entry.rp === 'Receipt') receipts += entry.amount || 0;
            else if (entry.rp === 'Payment') payments += entry.amount || 0;
        });
        setTotalReceipt(receipts);
        setTotalPayment(payments);
        // Actual Amount = Sanction - all deductions (Receipt entries)
        setActualAmount(sanctionAmt - receipts);
    }, [voucherEntries, formData.sanctionLoanAmount]);

    useEffect(() => {
        fetchPendingLoans();
        fetchHeadList();
        fetchBankList();
    }, []);

    // Live balance of the disbursing account — cash (A1001) or the selected bank account
    const activeAccount = formData.paymentMode === 'bank' ? (formData.bankName || 'A1001') : 'A1001';
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`${await getApiBaseUrl()}/utilities/head-balance/${activeAccount}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (!response.ok) { if (!cancelled) setBankBalance(0); return; }
                const result = await response.json();
                const bal = result?.data?.balance ?? result?.data?.data?.balance ?? 0;
                if (!cancelled) setBankBalance(Number(bal) || 0);
            } catch { if (!cancelled) setBankBalance(0); }
        })();
        return () => { cancelled = true; };
    }, [activeAccount]);

    const fetchBankList = async () => {
        try {
            const endpoint = API_ROUTES.reports.banks();
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const result = await response.json();
                const banks = Array.isArray(result) ? result : (result.data || []);
                setBankList(Array.isArray(banks) ? banks : []);
            } else {
                setBankList([]);
            }
        } catch (error) {
            console.error('Error fetching bank list:', error);
            setBankList([]);
        }
    };

    const fetchHeadList = async () => {
        try {
            const endpoint = API_ROUTES.reports.heads();
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const result = await response.json();
                const heads = Array.isArray(result) ? result : (result.data || []);
                setHeadList(Array.isArray(heads) ? heads : []);
            } else {
                setHeadList([]);
            }
        } catch (error) {
            console.error('Error fetching head list:', error);
            setHeadList([]);
        }
    };

    const addVoucherEntry = useCallback(() => {
        setVoucherEntries(prev => {
            const nextSrNo = (prev.length + 1).toString();
            const newEntry: PaymentEntry = {
                key: Date.now().toString(),
                srNo: nextSrNo,
                code: '',
                name: '',
                rp: 'Receipt',  // Default to Receipt = deduction from loan amount
                amount: 0
            };
            return [...prev, newEntry];
        });
    }, []);

    const updateVoucherEntry = useCallback((index: number, field: keyof PaymentEntry, value: any) => {
        setVoucherEntries(prev => {
            const newEntries: PaymentEntry[] = [...prev];
            const entry: PaymentEntry = { ...newEntries[index] } as PaymentEntry;
            if (field === 'code') {
                entry.code = value;
                const head = headList.find(h => h.code === value);
                if (head) entry.name = head.name;
            } else if (field === 'amount') {
                entry.amount = parseFloat(value) || 0;
            } else {
                (entry as any)[field] = value;
            }
            const updatedEntries = [...newEntries];
            updatedEntries[index] = entry;
            return updatedEntries;
        });
    }, [headList]);

    const removeVoucherEntry = useCallback((index: number) => {
        setVoucherEntries(prev => prev.filter((_, i) => i !== index));
    }, []);

    const fetchPendingLoans = async () => {
        setIsLoadingCases(true);
        try {
            const endpoint = API_ROUTES.loans.sanctioned();
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const result = await response.json();
                const loans = Array.isArray(result) ? result : (result.data || []);
                setLoanCases(loans);
            } else {
                setLoanCases([]);
            }
        } catch (error) {
            console.error('Error fetching pending loans:', error);
            setLoanCases([]);
        } finally {
            setIsLoadingCases(false);
        }
    };

    const updateField = useCallback((field: keyof LoanPaymentData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateModalField = useCallback((field: keyof ModalData, value: any) => {
        setModalData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleLoanCaseChange = async (caseNo: string) => {
        updateField('loanCaseNo', caseNo);
        if (!caseNo) {
            handleReset(true);
            return;
        }
        try {
            const endpoint = API_ROUTES.loans.caseDetails(caseNo);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const result = await response.json();
                const loanData = result.data;
                if (!loanData) return;
                const sancAmt = loanData.sanctionedAmount || loanData.appliedAmount || '0';
                setFormData(prev => ({
                    ...prev,
                    memberNo: loanData.memberNo,
                    memberName: loanData.memberName,
                    sanctionAmount: loanData.appliedAmount,
                    sanctionLoanAmount: sancAmt,
                    noOfInstallments: loanData.noOfInstallments,
                    officeNo: loanData.officeName || loanData.officeNo,
                    subDivision: loanData.subDivision,
                    hCode: loanData.hCode,
                    hName: loanData.hName,
                }));
                setModalData(prev => ({
                    ...prev,
                    loanCaseNo: loanData.loanCaseNo,
                    loanType: loanData.loanType,
                    memberNo: loanData.memberNo,
                    memberName: loanData.memberName,
                    officeNo: loanData.officeNo,
                    subDivision: loanData.subDivision,
                    appliedAmount: loanData.appliedAmount,
                    applicationDate: loanData.applicationDate,
                    basicPay: loanData.basicPay,
                    currentBalance: loanData.currentBalance,
                    shareAmount: loanData.shareAmount,
                    purpose: loanData.purpose,
                    formNumber: loanData.formNumber,
                    rate: loanData.rate,
                    penalRate: loanData.penalRate,
                    noOfInstallments: loanData.noOfInstallments,
                    installmentAmount: loanData.installmentAmount,
                    sanctionedAmount: sancAmt,
                    sanctionDate: loanData.sanctionDate || '',
                    surety1Gr: loanData.surety1Gr || '0',
                    surety1Name: loanData.surety1Name || '',
                    surety1Office: loanData.surety1Office || '',
                    surety1LoanBalance: loanData.surety1LoanBalance || '0',
                    surety2Gr: loanData.surety2Gr || '0',
                    surety2Name: loanData.surety2Name || '',
                    surety2Office: loanData.surety2Office || '',
                    surety2LoanBalance: loanData.surety2LoanBalance || '0',
                }));
                // Auto-calculate 5% Share & FD deductions
                setVoucherEntries([]);
                const memberNo = loanData.memberNo;
                const loanAmount = parseFloat(sancAmt) || 0;
                if (memberNo && loanAmount > 0) {
                    try {
                        const eligResp = await fetch(`${await getApiBaseUrl()}/loans/eligibility/${memberNo}?amount=${loanAmount}`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        if (eligResp.ok) {
                            const eligResult = await eligResp.json();
                            const elig = eligResult.data || eligResult;
                            const autoEntries: PaymentEntry[] = [];

                            // Check for existing active loans (top-up detection)
                            let hasExistingLoan = false;
                            try {
                                const balResp = await fetch(`${await getApiBaseUrl()}/loans/member/${memberNo}/balances`, {
                                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                                });
                                if (balResp.ok) {
                                    const balResult = await balResp.json();
                                    const b = balResult.data || balResult;
                                    const totalOutstanding = (parseFloat(b.regularLoanBal) || 0) + (parseFloat(b.emergencyLoanBal) || 0);
                                    hasExistingLoan = totalOutstanding > 0;
                                }
                            } catch (e) { /* ignore — will proceed without top-up detection */ }

                            if (!hasExistingLoan) {
                                if (elig.additionalShareRequired > 0) {
                                    autoEntries.push({
                                        key: 'auto-share-' + Date.now(),
                                        srNo: '1',
                                        code: 'L1001',
                                        name: 'SHARE VALUE (5% Auto)',
                                        rp: 'Receipt',
                                        amount: elig.additionalShareRequired,
                                    });
                                }
                                if (elig.additionalFdRequired > 0) {
                                    autoEntries.push({
                                        key: 'auto-fd-' + Date.now(),
                                        srNo: String(autoEntries.length + 1),
                                        code: 'A003',
                                        name: 'FIXED DEPOSIT (5% Auto)',
                                        rp: 'Receipt',
                                        amount: elig.additionalFdRequired,
                                    });
                                }
                            }
                            if (autoEntries.length > 0) {
                                setVoucherEntries(autoEntries);
                            }
                        }
                    } catch (e) {
                        console.warn('[LoanPayment] Could not fetch eligibility for auto-deductions:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching loan case details:', error);
        }
    };

    const openSanctionWindow = useCallback(() => {
        if ((window as any).electronAPI) {
            (window as any).electronAPI.send('open-window', { route: '/loan-sanction' });
            if ((window as any).electronAPI.on) {
                (window as any).electronAPI.on('loan-sanctioned', (data: any) => {
                    if (data.loanCaseNo === formData.loanCaseNo) {
                        updateField('sanctionLoanAmount', data.sanctionedAmount);
                        showDialog('info', 'electron-react-ts', 'Loan Sanctioned', `Loan Case ${data.loanCaseNo} has been sanctioned for ₹${parseFloat(data.sanctionedAmount).toLocaleString('en-IN')}.`);
                        fetchPendingLoans();
                    }
                });
            }
        } else {
            setModalData(prev => ({ ...prev, isOpen: true }));
        }
    }, [formData.loanCaseNo]);

    const closeModal = useCallback(() => {
        setModalData(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleModalSave = async () => {
        try {
            const sanctionData = {
                sanctionedAmount: modalData.sanctionedAmount,
                sanctionDate: modalData.sanctionDate,
                noOfInstallments: parseInt(modalData.noOfInstallments) || 0,
                rate: parseFloat(modalData.rate) || 0,
                penalRate: parseFloat(modalData.penalRate) || 0,
                installmentAmount: parseFloat(modalData.installmentAmount) || 0
            };

            const endpoint = API_ROUTES.loans.sanction(modalData.loanCaseNo);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(sanctionData)
            });

            if (response.ok) {
                updateField('sanctionLoanAmount', modalData.sanctionedAmount);
                updateField('noOfInstallments', modalData.noOfInstallments);
                await showDialog('info', 'electron-react-ts', 'Loan Sanctioned', `Loan Case ${modalData.loanCaseNo} has been sanctioned for ₹${parseFloat(modalData.sanctionedAmount).toLocaleString('en-IN')}.`);
                closeModal();
                fetchPendingLoans();
            } else {
                throw new Error('Failed to save sanction');
            }
        } catch (error: any) {
            console.error('Error saving sanction:', error);
            await showDialog('error', 'electron-react-ts', 'Sanction Failed', `Failed to save loan sanction.\n\nTechnical: ${error.message}`);
        }
    };

    const handleSave = async () => {
        if (!formData.loanCaseNo) {
            await showDialog('warning', 'electron-react-ts', 'Loan Case Required', 'Please select a loan case before generating the voucher.');
            return;
        }
        if (!formData.sanctionLoanAmount || parseFloat(formData.sanctionLoanAmount) <= 0) {
            await showDialog('warning', 'electron-react-ts', 'Loan Not Sanctioned', 'Please sanction the loan first before generating the payment voucher.');
            return;
        }
        // BUG FIX: validate cheque fields for bank mode
        if (formData.paymentMode === 'bank' || formData.paymentMode === 'BANK') {
            if (!formData.chequeNo) {
                await showDialog('warning', 'electron-react-ts', 'Cheque Number Required', 'Please enter the cheque number for bank/cheque payment mode.');
                return;
            }
            if (!formData.bankName) {
                await showDialog('warning', 'electron-react-ts', 'Bank Name Required', 'Please enter the bank name for bank/cheque payment mode.');
                return;
            }
        }

        try {
            // Build full breakdown: main loan payment + user-added deduction entries
            const sanctionAmt = parseFloat(formData.sanctionLoanAmount) || 0;
            const mainLoanEntry: PaymentEntry = {
                key: 'main',
                srNo: '0',
                code: formData.hCode || 'A1047',
                name: formData.hName || 'EMERGENCY LOAN',
                rp: 'Payment',
                amount: sanctionAmt
            };
            const fullBreakdown = [mainLoanEntry, ...voucherEntries];

            const voucherData = {
                loanCaseNo: formData.loanCaseNo,
                paymentMode: formData.paymentMode.toUpperCase(),
                actualAmount: actualAmount || sanctionAmt,
                bankName: formData.bankName,
                chequeNo: formData.chequeNo,
                chequeDate: formData.chequeDate ? formData.chequeDate.format('YYYY-MM-DD') : null,
                narration: formData.narration || `Loan disbursement for case ${formData.loanCaseNo}`,
                breakdown: fullBreakdown,
                createdBy: 'admin'
            };

            const endpoint = API_ROUTES.transactions.generateLoanVoucher();
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(voucherData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${response.status} — ${errorText}`);
            }

            const result = await response.json();
            const vNo = result.voucherNo || result.data?.voucherNo;

            await showDialog(
                'info',
                'electron-react-ts',
                'Loan Voucher Generated!',
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `VOUCHER NO    : ${vNo || '—'}\n` +
                `LOAN CASE     : ${formData.loanCaseNo}\n` +
                `MEMBER        : ${formData.memberNo} — ${formData.memberName}\n` +
                `AMOUNT        : ₹${parseFloat(formData.sanctionLoanAmount).toLocaleString('en-IN')}\n` +
                `MODE          : ${formData.paymentMode.toUpperCase()}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✓ Voucher staged (status: PENDING)\n` +
                `➜ Go to 'Pass Transactions' to post to ledger`
            );

            fetchPendingLoans();
            handleReset(true);

        } catch (error: any) {
            console.error('Error saving voucher:', error);
            await showDialog('error', 'electron-react-ts', 'Voucher Generation Failed', `Failed to generate loan voucher.\n\nTechnical: ${error.message}`);
        }
    };

    const handleReset = useCallback((skipConfirm = false) => {
        const doReset = () => {
            setFormData({
                loanCaseNo: '',
                memberNo: '',
                memberName: '',
                sanctionAmount: '',
                officeNo: '',
                subDivision: '',
                hCode: '',
                hName: '',
                paymentMode: 'cash',
                chequeDate: dayjs(),
                chequeNo: '',
                bankName: '',
                narration: '',
                sanctionLoanAmount: '',
                noOfInstallments: ''
            });
            setVoucherEntries([]);
        };

        if (skipConfirm) {
            doReset();
        } else {
            // BUG FIX: Modal.confirm silently no-ops in Electron — replaced with native confirm dialog
            showConfirm('Reset Form?', 'This will clear all current inputs and the voucher breakdown. Continue?')
                .then(confirmed => { if (confirmed) doReset(); });
        }
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        formData,
        modalData,
        loanCases,
        isLoadingCases,
        actualAmount,
        bankBalance,
        totalReceipt,
        totalPayment,
        data: voucherEntries,
        updateField,
        updateModalField,
        headList,
        bankList,
        addVoucherEntry,
        updateVoucherEntry,
        removeVoucherEntry,
        handleLoanCaseChange,
        openSanctionWindow,
        closeModal,
        handleModalSave,
        handleSave,
        handleReset,
        handleExit,
    };
};
