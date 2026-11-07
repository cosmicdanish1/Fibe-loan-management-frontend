// hook/useLoanEntry.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { LoanEntryData, LoanEntryHookReturn, LoanEligibilityStatus } from '../interface/LoanEntryInterfaces';
import { apiService } from '../../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';

const emptyForm = (): LoanEntryData => ({
  memberNo: '', memberName: '',
  loanType: 'ALN',
  loanAmount: '', rate: '', noOfInstal: '', instalAmt: '',
  paymentDate: dayjs().format('YYYY-MM-DD'),
  purpose: '', penalRate: '2',
  g1MbNo: '', g1Name: '',
  g2MbNo: '', g2Name: '',
});

export const useLoanEntry = (): LoanEntryHookReturn => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoanEntryData>(emptyForm());
  const [isLoading, setIsLoading] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<LoanEligibilityStatus | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const savingRef = useRef(false); // in-flight guard for Save

  const updateField = useCallback((field: keyof LoanEntryData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMemberSelect = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    setFormData(prev => ({
      ...prev,
      memberNo: actualNo,
      memberName: memberData?.memberName || '',
    }));
  }, []);

  const handleG1Select = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    setFormData(prev => ({
      ...prev,
      g1MbNo: actualNo,
      g1Name: memberData?.memberName || '',
    }));
  }, []);

  const handleG2Select = useCallback((memberNo: string, memberData?: any) => {
    const actualNo = memberData?.memberNo || memberNo;
    setFormData(prev => ({
      ...prev,
      g2MbNo: actualNo,
      g2Name: memberData?.memberName || '',
    }));
  }, []);

  // --- Eligibility Check Effect ---
  useEffect(() => {
    const amount = parseFloat(formData.loanAmount) || 0;
    const memberNo = formData.memberNo;

    // Reset if below threshold or missing member
    if (!memberNo || amount <= 500000) {
      setEligibilityStatus(null);
      setIsCheckingEligibility(false);
      return;
    }

    // Debounce the API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    setIsCheckingEligibility(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiService.checkLoanEligibility(memberNo, amount.toString());
        if (res.success && res.data) {
          setEligibilityStatus(res.data);
        } else {
          setEligibilityStatus(null);
        }
      } catch (err) {
        console.error('Failed to check loan eligibility:', err);
        setEligibilityStatus(null);
      } finally {
        setIsCheckingEligibility(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.loanAmount, formData.memberNo]);

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;
    if (!formData.memberNo) {
      await showDialog('warning', t('Input Validation Error'), t('Member Required'), t('Please select a member before saving.'));
      return;
    }
    if (!formData.loanType) {
      await showDialog('warning', t('Input Validation Error'), t('Loan Type Required'), t('Please select a loan type before saving.'));
      return;
    }
    if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Loan Amount'), t('Please enter a valid loan amount greater than zero.'));
      return;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Interest Rate'), t('Please enter a valid interest rate greater than zero.'));
      return;
    }
    if (!formData.noOfInstal || parseInt(formData.noOfInstal) <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Installments'), t('Please enter the number of installments greater than zero.'));
      return;
    }
    if (!formData.instalAmt || parseFloat(formData.instalAmt) <= 0) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Installment Amount'), t('Please enter a valid installment amount greater than zero.'));
      return;
    }
    const g1 = String(formData.g1MbNo || '').trim();
    const g2 = String(formData.g2MbNo || '').trim();
    const borrower = String(formData.memberNo).trim();
    if ((g1 && g1 === borrower) || (g2 && g2 === borrower)) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Surety'), t('A surety cannot be the borrower. Please choose a different member.'));
      return;
    }
    if (g1 && g2 && g1 === g2) {
      await showDialog('warning', t('Input Validation Error'), t('Invalid Surety'), t('Surety 1 and Surety 2 must be different members.'));
      return;
    }
    if (eligibilityStatus && !eligibilityStatus.isEligible) {
      await showDialog('error', t('Eligibility Failed'), t('Cannot Save Loan'), eligibilityStatus.message || t('The member does not meet the 5% Share Value and 5% FD balance requirements.'));
      return;
    }

    savingRef.current = true;
    setIsLoading(true);
    try {
      const payload = {
        memberNo: parseInt(formData.memberNo),
        loanType: formData.loanType,
        loanAmount: parseFloat(formData.loanAmount) || 0,
        rate: parseFloat(formData.rate) || 0,
        noOfInstal: parseInt(formData.noOfInstal) || 0,
        instalAmt: parseFloat(formData.instalAmt) || 0,
        paymentDate: formData.paymentDate,
        purpose: formData.purpose,
        penalRate: parseFloat(formData.penalRate) || 0,
        g1MbNo: formData.g1MbNo ? parseInt(formData.g1MbNo) : 0,
        g2MbNo: formData.g2MbNo ? parseInt(formData.g2MbNo) : 0,
      };

      const response = await apiService.saveLoanEntry(payload);
      if (response.success) {
        const result = response.data;
        const caseNo = result?.loanCaseNo || '—';
        await showDialog(
          'info',
          'electron-react-ts',
          t('{{1}} Loan Entry Saved Successfully!', { 1: formData.loanType }),
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `LOAN CASE NO  : ${caseNo}\n` +
          `MEMBER NO     : ${formData.memberNo} - ${formData.memberName || 'N/A'}\n` +
          `LOAN TYPE     : ${formData.loanType}\n` +
          `LOAN AMOUNT   : ₹${parseFloat(formData.loanAmount).toLocaleString('en-IN')}\n` +
          `INTEREST RATE : ${formData.rate}%\n` +
          `INSTALLMENTS  : ${formData.noOfInstal} × ₹${parseFloat(formData.instalAmt).toLocaleString('en-IN')}\n` +
          (formData.purpose ? `PURPOSE       : ${formData.purpose}\n` : '') +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Saved to loan_master\n` +
          `✓ Surety record updated`,
        );
        setFormData(emptyForm());
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await showDialog('error', t('Loan Entry Error'), t('Failed to Save Loan Entry'), response.message || t('An unexpected error occurred. Please try again.'));
      }
    } catch (err: any) {
      await showDialog('error', t('System Connection Error'), t('Unable to Connect to Server'), t('Technical details: {{1}}', { 1: err.message }));
    } finally {
      savingRef.current = false;
      setIsLoading(false);
    }
  }, [formData, eligibilityStatus]);

  const handleClear = useCallback(() => {
    setFormData(emptyForm());
  }, []);

  const handleExit = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('window-close');
    }
  }, []);

  return {
    formData, updateField,
    handleMemberSelect, handleG1Select, handleG2Select,
    handleSave, handleClear, handleExit,
    isLoading,
    eligibilityStatus,
    isCheckingEligibility,
  };
};
