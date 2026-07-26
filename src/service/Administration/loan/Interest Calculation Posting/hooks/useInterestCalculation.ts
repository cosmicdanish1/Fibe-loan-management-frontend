import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import type { InterestCalculationData, MemberRecord } from '../types/types';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';
import { accountHeadMap } from '../constants/options';
import { message } from 'antd';

export const useInterestCalculation = () => {
  const [formData, setFormData] = useState<InterestCalculationData>({
    calcInterestFor: 'all_members',
    accountType: 'SB',
    fromDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    memberNo: '',
    memberName: '',
    interestRate: 4.0,
  });

  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  // Fetch current interest rate on load
  useEffect(() => {
    const fetchCurrentRate = async () => {
      try {
        const response = await fetch(`${await getApiBaseUrl()}/interest/current-rate`);
        if (response.ok) {
          const data = await response.json();
          if (data.rate) setFormData(prev => ({ ...prev, interestRate: data.rate }));
        }
      } catch (err) {
        console.error('Error fetching interest rate:', err);
      }
    };
    fetchCurrentRate();
  }, []);

  const handleInputChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleMemberLookup = useCallback(() => {
    setIsLookupOpen(true);
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    setFormData(prev => ({
      ...prev,
      memberNo: member.memberNo || member.mbno || member.memberNumber || '',
      memberName: member.memberName || member.name || '',
    }));
    setIsLookupOpen(false);
  }, []);

  const buildPayload = useCallback((formData: InterestCalculationData) => {
    const payload: Record<string, any> = {
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      interestRate: Number(formData.interestRate || 4),
      accountType: formData.accountType,
      accountHead: accountHeadMap[formData.accountType] ?? 'A1001',
      narration: `Interest posting for ${formData.accountType} — ${formData.fromDate} to ${formData.toDate}`,
    };
    if (formData.calcInterestFor === 'specific_member' && formData.memberNo) {
      payload.memberNo = formData.memberNo;
    }
    return payload;
  }, []);

  const mapResponseToRecords = (memberCalculations: any[]): MemberRecord[] =>
    memberCalculations.map((calc, index) => ({
      srNo: index + 1,
      mbNo: calc.memberNumber,
      name: calc.memberName,
      openBal: calc.openingBalance,
      debit: calc.totalDebit,
      credit: calc.totalCredit,
      balance: calc.closingBalance,
      interest: calc.interestAmount,
      avgBalance: calc.averageBalance,
      days: calc.days,
    }));

  // Preview — loads records into table without posting
  const handlePrintList = useCallback(async () => {
    if (!formData.calcInterestFor) {
      message.warning('Please select an Interest Type first');
      return;
    }
    try {
      setIsLoading(true);
      setMemberRecords([]);

      const endpoint = formData.calcInterestFor === 'yearly_fund_process'
        ? `${await getApiBaseUrl()}/interest/preview-yearly-fund`
        : `${await getApiBaseUrl()}/interest/preview-calculation`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(formData)),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to fetch preview');
      }

      const data = await response.json();
      const records = mapResponseToRecords(data.memberCalculations ?? []);
      setMemberRecords(records);

      if (records.length === 0) {
        message.info('No eligible members found for the selected parameters');
      } else {
        message.success(`Preview loaded — ${records.length} record(s)`);
      }
    } catch (err: any) {
      message.error(err.message || 'Error fetching interest preview');
      console.error('Preview error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formData, buildPayload]);

  // Post — commits interest to ledger
  const handlePost = useCallback(async () => {
    if (memberRecords.length === 0) {
      message.warning('Run Preview first to load records before posting');
      return;
    }
    try {
      setIsLoading(true);

      const endpoint = formData.calcInterestFor === 'yearly_fund_process'
        ? `${await getApiBaseUrl()}/interest/process-yearly-fund`
        : `${await getApiBaseUrl()}/interest/update-saving-interest`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(formData)),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to post interest');
      }

      const data = await response.json();
      const postedAmt = Number(data.totalInterestAmount).toLocaleString('en-IN');
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: 'Interest Posted Successfully',
          message: 'Interest posting completed.',
          detail: `Posted ₹${postedAmt} for ${data.totalMembers} member(s)\nVoucher: ${data.voucherNumber}`,
          buttons: ['OK'],
        });
      } else {
        alert(`✅ Interest Posted\n\n₹${postedAmt} for ${data.totalMembers} member(s)\nVoucher: ${data.voucherNumber}`);
      }
      setMemberRecords([]);
    } catch (err: any) {
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Posting Failed',
          message: 'Failed to post interest to ledger.',
          detail: err.message || 'Server error occurred.',
          buttons: ['OK'],
        });
      } else {
        alert(`❌ Error posting interest: ${err.message}`);
      }
      console.error('Post error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formData, memberRecords.length, buildPayload]);

  const resetForm = useCallback(() => {
    setFormData({
      calcInterestFor: 'all_members',
      accountType: 'SB',
      fromDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
      toDate: dayjs().format('YYYY-MM-DD'),
      memberNo: '',
      memberName: '',
      interestRate: 4.0,
    });
    setMemberRecords([]);
  }, []);

  return {
    formData,
    memberRecords,
    isLoading,
    handleInputChange,
    handleMemberLookup,
    handlePrintList,
    handlePost,
    resetForm,
    isLookupOpen,
    setIsLookupOpen,
    handleMemberSelect,
  };
};
