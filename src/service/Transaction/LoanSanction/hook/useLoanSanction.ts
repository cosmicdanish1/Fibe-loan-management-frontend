// hook/useLoanSanction.ts

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import {
    LoanCase,
    LoanDetails,
    SanctionDetails,
    LoanSanctionHookReturn
} from '../interface/LoanSanctionInterfaces';
import { API_ROUTES, getApiBaseUrl } from '../../../../services/apiVersionConfig';
import { reagreementApi, ReagreementQuote } from '../../../../services/reagreementApi';
import { useTranslation } from 'react-i18next';

export interface UseLoanSanctionOptions {
    /** Embedded use (dialog inside Loan Payment): open with this case already chosen, if it is still pending. */
    initialCaseNo?: string;
    /** Called after the sanction was saved, with the case number. */
    onSanctioned?: (caseNo: string) => void;
    /** Replaces the default "close this window" behaviour of Exit. */
    onClose?: () => void;
}

export const useLoanSanction = (options: UseLoanSanctionOptions = {}): LoanSanctionHookReturn => {
  const { t } = useTranslation();
    const [loanCases, setLoanCases] = useState<LoanCase[]>([]);
    const [selectedLoanCase, setSelectedLoanCase] = useState<string>("");
    const [isLoadingCases, setIsLoadingCases] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // A re-agreement is sanctioned like a loan, but its principal is locked and the figures come from the server.
    const [reagreement, setReagreement] = useState<any | null>(null);
    const [raQuote, setRaQuote] = useState<ReagreementQuote | null>(null);
    const [raQuoteLoading, setRaQuoteLoading] = useState(false);
    // ES-506: Business Rules defaults for the selected loan type, and the real EMI preview
    const [rateDefaults, setRateDefaults] = useState<{ rate: number; penalRate: number } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Loan details state (read-only)
    const [loanDetails, setLoanDetails] = useState<LoanDetails>({
        loanCaseNo: "",
        loanType: "",
        memberNo: "",
        memberName: "",
        officeNo: "",
        officeName: "",
        appliedAmount: "",
        applicationDate: "",
        basicPay: "",
        currentBalance: "0",
        shareAmount: "",
        purpose: "",
        formNumber: "0",
        surety1Gr: "",
        surety1Name: "",
        surety1Office: "",
        surety1LoanBalance: "0",
        surety2Gr: "",
        surety2Name: "",
        surety2Office: "",
        surety2LoanBalance: "0",
    });

    // Sanction details state (editable)
    const [sanctionDetails, setSanctionDetails] = useState<SanctionDetails>({
        sanctionedAmount: "",
        sanctionDate: dayjs().format("DD-MM-YYYY"),
        rate: "12.5",
        penalRate: "2.0",
        noOfInstallments: "60",
        installmentAmount: "",
        interestAmount: "",
        rateOverrideReason: "",
    });

    // Share value / RD requirement for the amount being sanctioned (same server check the application uses):
    // what the member holds, what is short, and what is adjusted from the payout. Replaces the old "Rules"
    // checkboxes, which were never sent anywhere and changed nothing.
    const [eligibility, setEligibility] = useState<any | null>(null);
    useEffect(() => {
        const type = (loanDetails.loanType || '').toUpperCase();
        const amount = parseFloat(sanctionDetails.sanctionedAmount);
        if (reagreement || !selectedLoanCase || !loanDetails.memberNo || !['RLN', 'ALN', 'ELN'].includes(type) || !(amount > 0)) {
            setEligibility(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch(
                    `${await getApiBaseUrl()}/loans/eligibility/${encodeURIComponent(loanDetails.memberNo)}?amount=${amount}&loanType=${type}&caseNo=${encodeURIComponent(selectedLoanCase)}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                );
                const body = await res.json().catch(() => ({}));
                if (cancelled) return;
                setEligibility(res.ok ? (body?.data ?? body) : null);
            } catch {
                if (!cancelled) setEligibility(null);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [selectedLoanCase, loanDetails.memberNo, loanDetails.loanType, sanctionDetails.sanctionedAmount, reagreement]);

    useEffect(() => {
        (async () => {
            const pending = await fetchPendingLoanCases();
            if (options.initialCaseNo && pending.some((l: any) => String(l.loanCaseNo) === String(options.initialCaseNo))) {
                handleLoanCaseChange(String(options.initialCaseNo));
            }
        })();
    }, []);

    // Re-agreement: the server recalculates on every tenure / rate edit (debounced); nothing is computed here
    useEffect(() => {
        if (!reagreement) { setRaQuote(null); return; }
        const n = Number(sanctionDetails.noOfInstallments), r = Number(sanctionDetails.rate);
        if (!sanctionDetails.noOfInstallments || !sanctionDetails.rate || !Number.isFinite(n) || !Number.isFinite(r)) { setRaQuote(null); return; }
        let cancelled = false;
        setRaQuoteLoading(true);
        const t = setTimeout(async () => {
            try {
                const q = await reagreementApi.quote({
                    mbno: String(reagreement.mbno), loancaseno: String(reagreement.oldLoanCaseNo), loantype: reagreement.loantype,
                    newInstallments: n, newRate: r, applicationDate: reagreement.applicationDate, reagreementId: reagreement.id,
                });
                if (!cancelled) {
                    setRaQuote(q);
                    if (q.valid && q.neu) {
                        setSanctionDetails(prev => ({ ...prev, installmentAmount: String(q.neu!.monthlyInstallment), interestAmount: String(q.neu!.totalInterestForEmi) }));
                    }
                }
            } catch (e: any) {
                if (!cancelled) { setRaQuote(null); message.error(e.message || 'Could not calculate the re-agreement'); }
            } finally {
                if (!cancelled) setRaQuoteLoading(false);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
    }, [reagreement, sanctionDetails.noOfInstallments, sanctionDetails.rate]);

    // ES-506: Installment Amt and Total Interest are the REAL figures (same calculation as the loan payout), not
    // amount / installments. The server calculates them for the chosen amount, tenure and rate.
    useEffect(() => {
        if (reagreement || !selectedLoanCase) return;
        const amount = parseFloat(sanctionDetails.sanctionedAmount);
        const installments = parseInt(sanctionDetails.noOfInstallments);
        const rateNum = parseFloat(sanctionDetails.rate);
        if (!(amount > 0) || !(installments > 0) || !(rateNum > 0)) {
            setSanctionDetails(prev => ({ ...prev, installmentAmount: '', interestAmount: '' }));
            return;
        }
        let cancelled = false;
        setPreviewLoading(true);
        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch(`${await getApiBaseUrl()}/loans/sanction-preview/${encodeURIComponent(selectedLoanCase)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ sanctionedAmount: amount, noOfInstallments: installments, rate: rateNum }),
                });
                const body = await res.json().catch(() => ({}));
                if (cancelled) return;
                const q = body?.data ?? body;
                if (res.ok && q && q.monthlyInstallment !== undefined) {
                    setSanctionDetails(prev => ({ ...prev, installmentAmount: String(q.monthlyInstallment), interestAmount: String(q.totalInterest) }));
                } else {
                    setSanctionDetails(prev => ({ ...prev, installmentAmount: '', interestAmount: '' }));
                }
            } catch {
                if (!cancelled) setSanctionDetails(prev => ({ ...prev, installmentAmount: '', interestAmount: '' }));
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [selectedLoanCase, sanctionDetails.sanctionedAmount, sanctionDetails.noOfInstallments, sanctionDetails.rate, reagreement]);

    const fetchPendingLoanCases = async (): Promise<any[]> => {
        setIsLoadingCases(true);
        let found: any[] = [];
        try {
            console.log('🔍 Fetching pending loan cases for sanction...');
            const endpoint = API_ROUTES.loans.pending();
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.ok) {
                const result = await response.json();
                const loans = Array.isArray(result) ? result : (result.data || []);

                // Filter only non-sanctioned loans (a re-agreement stays listed so its tenure / rate can be changed)
                const pendingLoans = loans.filter((loan: any) => !loan.sanctioned || loan.applicationKind === 'REAGREEMENT');

                setLoanCases(pendingLoans);
                found = pendingLoans;
                console.log(`✅ Found ${pendingLoans.length} pending loan cases`);
            } else {
                throw new Error('Failed to fetch loan cases');
            }
        } catch (error) {
            console.error('❌ Error fetching loan cases:', error);
            message.error(t('Failed to load loan cases'));
            setLoanCases([]);
        } finally {
            setIsLoadingCases(false);
        }
        return found;
    };

    const handleLoanCaseChange = async (caseNo: string) => {
        setSelectedLoanCase(caseNo);

        setReagreement(null);
        setRaQuote(null);
        setRateDefaults(null);

        if (!caseNo) {
            // Reset
            setLoanDetails({
                loanCaseNo: "",
                loanType: "",
                memberNo: "",
                memberName: "",
                officeNo: "",
                officeName: "",
                appliedAmount: "",
                applicationDate: "",
                basicPay: "",
                currentBalance: "0",
                shareAmount: "",
                purpose: "",
                formNumber: "0",
                surety1Gr: "",
                surety1Name: "",
                surety1Office: "",
                surety1LoanBalance: "0",
                surety2Gr: "",
                surety2Name: "",
                surety2Office: "",
                surety2LoanBalance: "0",
            });
            setSanctionDetails(prev => ({
                ...prev,
                sanctionedAmount: "",
                installmentAmount: "",
                interestAmount: "",
                rateOverrideReason: "",
            }));
            return;
        }

        setIsLoadingDetails(true);
        try {
            console.log(`📋 Loading details for loan case: ${caseNo}`);
            const endpoint = API_ROUTES.loans.caseDetails(caseNo);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Frontend Hook Received Data:', data);

                // Handle potential response wrapping (common in some NestJS setups)
                const details = data.data || data;

                // DEBUG: specific check for structural issues
                if (!details || (!details.loanCaseNo && !details.memberNo)) {
                    console.error('⚠️ Received data seems empty or malformed:', details);
                    message.error(t('Received empty details from server'));
                }

                const mappedDetails: LoanDetails = {
                    loanCaseNo: String(details.loanCaseNo || caseNo),
                    loanType: String(details.loanType || ""),
                    memberNo: String(details.memberNo || ""),
                    memberName: String(details.memberName || ""),
                    officeNo: String(details.officeNo || ""),
                    officeName: String(details.officeName || ""),
                    appliedAmount: String(details.appliedAmount || ""),
                    applicationDate: String(details.applicationDate || ""),
                    basicPay: String(details.basicPay || ""),
                    currentBalance: String(details.currentBalance || "0"),
                    shareAmount: String(details.shareAmount || ""),
                    purpose: String(details.purpose || ""),
                    formNumber: String(details.formNumber || "0"),
                    surety1Gr: String(details.surety1 || ""),
                    surety1Name: String(details.surety1Name || ""),
                    surety1Office: String(details.surety1Office || ""),
                    surety1LoanBalance: String(details.surety1LoanBalance || "0"),
                    surety2Gr: String(details.surety2 || ""),
                    surety2Name: String(details.surety2Name || ""),
                    surety2Office: String(details.surety2Office || ""),
                    surety2LoanBalance: String(details.surety2LoanBalance || "0"),
                };

                console.log('🔄 Setting Loan Details State:', mappedDetails);
                setLoanDetails(mappedDetails);

                // Pre-fill sanction fields from the loan record where available.
                // ES-506: rate and penalty start from the loan type's card in Business Rules (loaded below); they are
                // only an exception for this one customer when the officer changes them (a reason is then required).
                const recordInstallments = parseInt(String(details.noOfInstallments || ""));
                const ra = details.applicationKind === 'REAGREEMENT' ? (details.reagreement || null) : null;
                if (ra) {
                    // principal locked to the outstanding principal; tenure / rate start from the application
                    setSanctionDetails(prev => ({
                        ...prev,
                        sanctionedAmount: String(ra.position?.outstandingPrincipal ?? details.appliedAmount ?? ""),
                        noOfInstallments: String(ra.neu?.installments ?? recordInstallments),
                        rate: String(ra.neu?.rate ?? details.rate ?? prev.rate),
                        penalRate: String(details.penalRate ?? prev.penalRate),
                    }));
                    setReagreement(ra);
                } else {
                setSanctionDetails(prev => ({
                    ...prev,
                    sanctionedAmount: String(details.appliedAmount || ""),
                    noOfInstallments: recordInstallments > 0
                        ? String(recordInstallments)
                        : prev.noOfInstallments,
                }));
                }

            } else {
                throw new Error('Failed to load loan details');
            }
        } catch (error) {
            console.error('❌ Error loading loan details:', error);
            message.error(t('Failed to load loan details'));
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // ES-506: load the Business Rules rate / penalty for the chosen loan type and put them in the fields
    useEffect(() => {
        if (!selectedLoanCase || !loanDetails.loanType) return;
        let cancelled = false;
        (async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch(`${await getApiBaseUrl()}/loans/rate-defaults?loanType=${encodeURIComponent(loanDetails.loanType)}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const body = await res.json().catch(() => ({}));
                const d = body?.data ?? body;
                if (cancelled || !res.ok || !(Number(d?.rate) > 0)) return;
                setRateDefaults({ rate: Number(d.rate), penalRate: Number(d.penalRate) });
                // A re-agreement keeps the rate it was applied with (the quote is built on it); only the penalty
                // starts from Business Rules, and the officer may change it for this one loan.
                setSanctionDetails(prev => reagreement
                    ? { ...prev, penalRate: String(d.penalRate), rateOverrideReason: '' }
                    : { ...prev, rate: String(d.rate), penalRate: String(d.penalRate), rateOverrideReason: '' });
            } catch { /* the fields keep their last values */ }
        })();
        return () => { cancelled = true; };
    }, [selectedLoanCase, loanDetails.loanType, reagreement]);

    const updateSanctionField = useCallback((field: keyof SanctionDetails, value: string) => {
        setSanctionDetails(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleSanctionSave = async () => {
        // Validation
        if (!selectedLoanCase) {
            message.error(t('Please select a loan case'));
            return;
        }

        if (!sanctionDetails.sanctionedAmount || parseFloat(sanctionDetails.sanctionedAmount) <= 0) {
            message.error(t('Please enter a valid sanctioned amount'));
            return;
        }

        if (!sanctionDetails.noOfInstallments || parseInt(sanctionDetails.noOfInstallments) <= 0) {
            message.error(t('Please enter valid number of installments'));
            return;
        }

        // ES-506: a rate / penalty different from Business Rules is an exception for this customer and needs a reason
        // (for a re-agreement only the penalty is compared: its interest rate is the new term being priced)
        const differsFromRules = !!rateDefaults && (
            (!reagreement && Math.abs(parseFloat(sanctionDetails.rate) - rateDefaults.rate) > 0.0001) ||
            Math.abs(parseFloat(sanctionDetails.penalRate) - rateDefaults.penalRate) > 0.0001
        );
        if (differsFromRules && !sanctionDetails.rateOverrideReason.trim()) {
            message.error(t('Give a reason for the rate / penalty that differs from Business Rules'));
            return;
        }

        setIsSaving(true);
        try {
            const sanctionData = {
                sanctionedAmount: parseFloat(sanctionDetails.sanctionedAmount),
                sanctionDate: sanctionDetails.sanctionDate,
                noOfInstallments: parseInt(sanctionDetails.noOfInstallments),
                rate: parseFloat(sanctionDetails.rate),
                penalRate: parseFloat(sanctionDetails.penalRate),
                ...(differsFromRules ? { rateOverrideReason: sanctionDetails.rateOverrideReason.trim() } : {}),
                installmentAmount: parseFloat(sanctionDetails.installmentAmount),
                sanctionedBy: (() => { try { return JSON.parse(localStorage.getItem('user') || '{}')?.username || undefined; } catch { return undefined; } })(),
            };

            console.log('💾 Saving sanction data:', sanctionData);

            const endpoint = API_ROUTES.loans.sanction(selectedLoanCase);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${await getApiBaseUrl()}${endpoint}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(sanctionData)
                }
            );

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Sanction saved successfully:', result);

                message.success(reagreement
                    ? '✅ ' + t('Re-agreement case {{1}} sanctioned: {{2}} installments @ {{3}}%. Continue in Loan Payment.', { 1: selectedLoanCase, 2: sanctionDetails.noOfInstallments, 3: sanctionDetails.rate })
                    : '✅ ' + t('Loan Case {{1}} sanctioned successfully!', { 1: selectedLoanCase }));

                // Send success message to parent window if opened from loan payment
                if ((window as any).electronAPI) {
                    (window as any).electronAPI.send('loan-sanctioned', {
                        loanCaseNo: selectedLoanCase,
                        sanctionedAmount: sanctionDetails.sanctionedAmount,
                        memberName: loanDetails.memberName,
                    });
                }

                options.onSanctioned?.(String(selectedLoanCase));

                // Refresh loan cases
                await fetchPendingLoanCases();

                // Reset selection
                setSelectedLoanCase("");
                setReagreement(null);
                setRaQuote(null);

            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(Array.isArray(errorData.message) ? errorData.message.join(', ') : (errorData.message || 'Failed to save sanction'));
            }
        } catch (error: any) {
            console.error('❌ Error saving sanction:', error);
            message.error(t('Failed to save sanction: {{1}}', { 1: error.message }));
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
    };

    const handleExit = useCallback(() => {
        if (options.onClose) { options.onClose(); return; }
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, [options.onClose]);

    return {
        reagreement,
        raQuote,
        raQuoteLoading,
        rateDefaults,
        previewLoading,
        loanCases,
        selectedLoanCase,
        isLoadingCases,
        isLoadingDetails,
        isSaving,
        loanDetails,
        sanctionDetails,
        eligibility,
        handleLoanCaseChange,
        updateSanctionField,
        handleSanctionSave,
        formatCurrency,
        handleExit,
    };
};
