// hook/useLoanSanction.ts

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import {
    LoanCase,
    LoanDetails,
    SanctionDetails,
    SanctionRules,
    LoanSanctionHookReturn
} from '../interface/LoanSanctionInterfaces';
import { API_ROUTES, API_BASE_URL, getApiBaseUrl } from '../../../../services/apiVersionConfig';

export const useLoanSanction = (): LoanSanctionHookReturn => {
    const [loanCases, setLoanCases] = useState<LoanCase[]>([]);
    const [selectedLoanCase, setSelectedLoanCase] = useState<string>("");
    const [isLoadingCases, setIsLoadingCases] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
    });

    // Sanction recovery rules (legacy "Rules" panel) — operator acknowledgement
    const [rules, setRules] = useState<SanctionRules>({
        sharesBalance: false,
        tenPercentOfLoan: false,
    });

    const toggleRule = useCallback((key: keyof SanctionRules) => {
        setRules(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    useEffect(() => {
        fetchPendingLoanCases();
    }, []);

    // Auto-calculate installment amount
    useEffect(() => {
        if (sanctionDetails.sanctionedAmount && sanctionDetails.noOfInstallments) {
            const amount = parseFloat(sanctionDetails.sanctionedAmount);
            const installments = parseInt(sanctionDetails.noOfInstallments);
            if (amount > 0 && installments > 0) {
                const installmentAmount = Math.round(amount / installments);
                setSanctionDetails(prev => ({
                    ...prev,
                    installmentAmount: installmentAmount.toString()
                }));
            }
        }
    }, [sanctionDetails.sanctionedAmount, sanctionDetails.noOfInstallments]);

    const fetchPendingLoanCases = async () => {
        setIsLoadingCases(true);
        try {
            console.log('🔍 Fetching pending loan cases for sanction...');
            const endpoint = API_ROUTES.loans.pending();
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`);

            if (response.ok) {
                const result = await response.json();
                const loans = Array.isArray(result) ? result : (result.data || []);

                // Filter only non-sanctioned loans
                const pendingLoans = loans.filter((loan: any) => !loan.sanctioned);

                setLoanCases(pendingLoans);
                console.log(`✅ Found ${pendingLoans.length} pending loan cases`);
            } else {
                throw new Error('Failed to fetch loan cases');
            }
        } catch (error) {
            console.error('❌ Error fetching loan cases:', error);
            message.error('Failed to load loan cases');
            setLoanCases([]);
        } finally {
            setIsLoadingCases(false);
        }
    };

    const handleLoanCaseChange = async (caseNo: string) => {
        setSelectedLoanCase(caseNo);

        // Reset rule acknowledgements whenever the selected case changes
        setRules({ sharesBalance: false, tenPercentOfLoan: false });

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
            }));
            return;
        }

        setIsLoadingDetails(true);
        try {
            console.log(`📋 Loading details for loan case: ${caseNo}`);
            const endpoint = API_ROUTES.loans.caseDetails(caseNo);
            const response = await fetch(`${await getApiBaseUrl()}${endpoint}`);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Frontend Hook Received Data:', data);

                // Handle potential response wrapping (common in some NestJS setups)
                const details = data.data || data;

                // DEBUG: specific check for structural issues
                if (!details || (!details.loanCaseNo && !details.memberNo)) {
                    console.error('⚠️ Received data seems empty or malformed:', details);
                    message.error('Received empty details from server');
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
                // NOTE: loan_pending has no rate/penalRate columns, so those keep
                // their editable defaults and are entered at sanction time.
                const recordInstallments = parseInt(String(details.noOfInstallments || ""));
                setSanctionDetails(prev => ({
                    ...prev,
                    sanctionedAmount: String(details.appliedAmount || ""),
                    noOfInstallments: recordInstallments > 0
                        ? String(recordInstallments)
                        : prev.noOfInstallments,
                }));

            } else {
                throw new Error('Failed to load loan details');
            }
        } catch (error) {
            console.error('❌ Error loading loan details:', error);
            message.error('Failed to load loan details');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const updateSanctionField = useCallback((field: keyof SanctionDetails, value: string) => {
        setSanctionDetails(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleSanctionSave = async () => {
        // Validation
        if (!selectedLoanCase) {
            message.error('Please select a loan case');
            return;
        }

        if (!sanctionDetails.sanctionedAmount || parseFloat(sanctionDetails.sanctionedAmount) <= 0) {
            message.error('Please enter a valid sanctioned amount');
            return;
        }

        if (!sanctionDetails.noOfInstallments || parseInt(sanctionDetails.noOfInstallments) <= 0) {
            message.error('Please enter valid number of installments');
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
                installmentAmount: parseFloat(sanctionDetails.installmentAmount),
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

                message.success(`✅ Loan Case ${selectedLoanCase} sanctioned successfully!`);

                // Send success message to parent window if opened from loan payment
                if ((window as any).electronAPI) {
                    (window as any).electronAPI.send('loan-sanctioned', {
                        loanCaseNo: selectedLoanCase,
                        sanctionedAmount: sanctionDetails.sanctionedAmount,
                        memberName: loanDetails.memberName,
                    });
                }

                // Refresh loan cases
                await fetchPendingLoanCases();

                // Reset selection
                setSelectedLoanCase("");

            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save sanction');
            }
        } catch (error: any) {
            console.error('❌ Error saving sanction:', error);
            message.error(`Failed to save sanction: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
    };

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    }, []);

    return {
        loanCases,
        selectedLoanCase,
        isLoadingCases,
        isLoadingDetails,
        isSaving,
        loanDetails,
        sanctionDetails,
        rules,
        toggleRule,
        handleLoanCaseChange,
        updateSanctionField,
        handleSanctionSave,
        formatCurrency,
        handleExit,
    };
};
