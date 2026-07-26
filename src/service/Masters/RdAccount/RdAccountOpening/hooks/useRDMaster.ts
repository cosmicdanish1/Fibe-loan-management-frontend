import { useState, useCallback, useEffect } from 'react';
import type { RDMasterData, RDMasterHookReturn, NomineeDetail, RDNotification } from '../interfaces/interface';
import { API_BASE_URL, getApiBaseUrl } from '../../../../../services/apiVersionConfig';

export const useRDMaster = (): RDMasterHookReturn => {
  const [notification, setNotification] = useState<RDNotification>(null);

  // Auto-dismiss notification after 5 s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(t);
  }, [notification]);

  // Fetch next auto-generated account number on mount
  const fetchNextAccountNo = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${await getApiBaseUrl()}/admin/rd-accounts/next-number`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const result = await res.json();
        const next = result?.data?.nextAccountNumber ?? result?.nextAccountNumber;
        if (next) setData(prev => ({ ...prev, accountNo: String(next) }));
      }
    } catch {
      // silent — user can still type manually
    }
  }, []);

  useEffect(() => { fetchNextAccountNo(); }, [fetchNextAccountNo]);

  const clearNotification = useCallback(() => setNotification(null), []);

  const [data, setData] = useState<RDMasterData>({
    memberNo: '',
    accountNo: '',
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    rdHeadName: '',
    depositDate: new Date().toISOString().split('T')[0],
    openingBalance: '',
    depositUnit: 'Months',
    depositPeriod: '',
    rate: '',
    amount: '',
    maturityDate: '',
    maturityAmount: '',
    nominees: [],
    recoveryThroughDemand: false,
    specialInstructions: ''
  });

  // Auto-derive Maturity Date from Deposit Date + Period + Unit.
  // Deterministic (no interest formula), so it's safe to compute. Stays editable —
  // a manual override survives until one of the three driver fields changes again.
  useEffect(() => {
    const period = parseInt(data.depositPeriod, 10);
    if (!data.depositDate || !period || period <= 0) return;
    const d = new Date(data.depositDate);
    if (isNaN(d.getTime())) return;
    if (data.depositUnit === 'Years') d.setFullYear(d.getFullYear() + period);
    else d.setMonth(d.getMonth() + period);
    const iso = d.toISOString().split('T')[0];
    setData(prev => (prev.maturityDate === iso ? prev : { ...prev, maturityDate: iso }));
  }, [data.depositDate, data.depositPeriod, data.depositUnit]);

  // Auto-derive Maturity Amount using the standard cooperative-society RD
  // simple-interest formula (interest accrues on each installment for the months
  // it stays on deposit). Stays editable — recomputes only when a driver changes.
  //   n  = number of monthly installments     P = monthly installment
  //   r  = annual rate %                       OB = opening lump sum (full-term interest)
  //   maturity = P*n + P*(r/1200)*n(n+1)/2  +  OB*(1 + (r/100)*(n/12))
  useEffect(() => {
    const period = parseFloat(data.depositPeriod);
    const P = parseFloat(data.amount);
    const r = parseFloat(data.rate);
    if (!period || period <= 0 || !P || P <= 0) return;
    const n = data.depositUnit === 'Years' ? Math.round(period * 12) : Math.round(period);
    const rate = isNaN(r) ? 0 : r;
    const OB = parseFloat(data.openingBalance) || 0;
    const installmentPrincipal = P * n;
    const installmentInterest = P * (rate / 1200) * ((n * (n + 1)) / 2);
    const openingWithInterest = OB * (1 + (rate / 100) * (n / 12));
    const maturity = installmentPrincipal + installmentInterest + openingWithInterest;
    const rounded = (Math.round(maturity * 100) / 100).toFixed(2);
    setData(prev => (prev.maturityAmount === rounded ? prev : { ...prev, maturityAmount: rounded }));
  }, [data.amount, data.rate, data.depositPeriod, data.depositUnit, data.openingBalance]);

  const updateMemberNo = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, memberNo: value }));
  }, []);

  const updateAccountNo = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, accountNo: value }));
  }, []);

  const updatePrefix = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, prefix: value }));
  }, []);

  const updateFirstName = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, firstName: value }));
  }, []);

  const updateMiddleName = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, middleName: value }));
  }, []);

  const updateLastName = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, lastName: value }));
  }, []);

  const updateRdHeadName = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, rdHeadName: value }));
  }, []);

  const updateDepositDate = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, depositDate: value }));
  }, []);

  const updateOpeningBalance = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, openingBalance: value }));
  }, []);

  const updateDepositUnit = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, depositUnit: value }));
  }, []);

  const updateDepositPeriod = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, depositPeriod: value }));
  }, []);

  const updateRate = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, rate: value }));
  }, []);

  const updateAmount = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, amount: value }));
  }, []);

  const updateMaturityDate = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, maturityDate: value }));
  }, []);

  const updateMaturityAmount = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, maturityAmount: value }));
  }, []);

  const updateRecoveryThroughDemand = useCallback((value: boolean) => {
    setData((prev: RDMasterData) => ({ ...prev, recoveryThroughDemand: value }));
  }, []);

  const updateSpecialInstructions = useCallback((value: string) => {
    setData((prev: RDMasterData) => ({ ...prev, specialInstructions: value }));
  }, []);

  const addNominee = useCallback(() => {
    setData((prev: RDMasterData) => {
      // BUG FIX 5: fdmaster has single nominee columns — only the first nominee is persisted.
      // Warn the user when they add a second one so data loss is explicit, not silent.
      if (prev.nominees.length >= 1) {
        setNotification({ type: 'warning', message: 'Only the first nominee will be saved to the database. Additional nominees are for reference only.' });
      }
      const newNominee: NomineeDetail = {
        id: Date.now().toString(),
        name: '',
        address: '',
        age: '',
        relation: ''
      };
      return { ...prev, nominees: [...prev.nominees, newNominee] };
    });
  }, []);

  const removeNominee = useCallback((id: string) => {
    setData((prev: RDMasterData) => ({ ...prev, nominees: prev.nominees.filter((n: NomineeDetail) => n.id !== id) }));
  }, []);

  const updateNominee = useCallback((id: string, field: keyof Omit<NomineeDetail, 'id'>, value: string) => {
    setData((prev: RDMasterData) => ({
      ...prev,
      nominees: prev.nominees.map((nominee: NomineeDetail) =>
        nominee.id === id ? { ...nominee, [field]: value } : nominee
      )
    }));
  }, []);

  const save = async () => {
    if (!data.memberNo) {
      if ((window as any).electronAPI?.showMessageBox) {
        (window as any).electronAPI.showMessageBox({ type: 'warning', title: 'Input Validation Error', message: 'Member Selection Required', detail: 'Please select a member before saving the RD account.', buttons: ['OK'] });
      } else {
        setNotification({ type: 'warning', message: 'Member No is required — please select a member first' });
      }
      return;
    }
    if (!data.accountNo) {
      // Account No is auto-generated — if still empty, fetch it now and wait
      await fetchNextAccountNo();
      // Give state a tick to update, then re-check
      await new Promise(r => setTimeout(r, 200));
      // If still empty after fetch attempt, it means backend not yet restarted
      setNotification({ type: 'warning', message: 'Account No not yet generated — please restart the backend server and try again' });
      return;
    }
    if (!data.depositDate) {
      if ((window as any).electronAPI?.showMessageBox) {
        (window as any).electronAPI.showMessageBox({ type: 'warning', title: 'Input Validation Error', message: 'Deposit Date Required', detail: 'Please select the deposit date before saving.', buttons: ['OK'] });
      } else {
        setNotification({ type: 'warning', message: 'Deposit Date is required' });
      }
      return;
    }
    if (!data.amount) {
      if ((window as any).electronAPI?.showMessageBox) {
        (window as any).electronAPI.showMessageBox({ type: 'warning', title: 'Input Validation Error', message: 'Installment Amount Required', detail: 'Please enter the monthly installment amount before saving.', buttons: ['OK'] });
      } else {
        setNotification({ type: 'warning', message: 'Installment Amount is required' });
      }
      return;
    }

    try {
      const primaryNominee = data.nominees.length > 0 ? data.nominees[0] : null;

      // Helper: convert any date string to YYYY-MM-DD for the backend
      const toISODate = (val: string): string | null => {
        if (!val) return null;
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        // DD-MMM-YYYY (e.g. 01-May-2026)
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0] || null;
        }
        return null;
      };

      const payload = {
        accountNumber: parseInt(data.accountNo, 10),
        memberNo: parseInt(data.memberNo, 10),
        prefix: data.prefix,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        depositDate: toISODate(data.depositDate),
        // BUG FIX 4: openingBalance was missing from payload — backend was hardcoding openbal=0
        openingBalance: parseFloat(data.openingBalance) || 0,
        amount: parseFloat(data.amount) || 0,
        rate: parseFloat(data.rate) || 0,
        depositPeriod: parseFloat(data.depositPeriod) || 0,
        depositUnit: data.depositUnit === 'Years' ? 2 : 1,
        maturityDate: toISODate(data.maturityDate),
        maturityAmount: parseFloat(data.maturityAmount) || 0,
        // BUG FIX 5: only first nominee is sent — fdmaster has single nominee column set
        nominee: primaryNominee ? primaryNominee.name : undefined,
        nomineeAge: primaryNominee ? primaryNominee.age : undefined,
        nomineeAddress: primaryNominee ? primaryNominee.address : undefined,
        nomineeRelation: primaryNominee ? primaryNominee.relation : undefined,
        specialInstructions: data.specialInstructions,
        // BUG FIX 6: now persisted — backend ensures a recovery_through_demand column on fdmaster
        recoveryThroughDemand: data.recoveryThroughDemand,
      };

      // Use fetch directly to avoid any apiService token issues
      const token = localStorage.getItem('accessToken');
      const fetchResponse = await fetch(`${await getApiBaseUrl()}/admin/rd-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await fetchResponse.json();

      if (fetchResponse.ok) {
        const fullName = [data.prefix, data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
        const fmtAmount = (v: string) => v ? `₹${parseFloat(v).toLocaleString('en-IN')}` : '—';

        if ((window as any).electronAPI?.showMessageBox) {
          await (window as any).electronAPI.showMessageBox({
            type: 'info',
            title: 'electron-react-ts',
            message: 'RD Account Opened Successfully!',
            detail:
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `ACCOUNT NO            : ${data.accountNo}\n` +
              `MEMBER DETAILS        : ${data.memberNo} - ${fullName || 'N/A'}\n` +
              `DEPOSIT AMOUNT        : ${fmtAmount(data.amount)}\n` +
              `DEPOSIT PERIOD        : ${data.depositPeriod} ${data.depositUnit}\n` +
              `INTEREST RATE         : ${data.rate}%\n` +
              (data.maturityDate ? `MATURITY DATE         : ${data.maturityDate}\n` : '') +
              (data.maturityAmount ? `MATURITY AMOUNT       : ${fmtAmount(data.maturityAmount)}\n` : '') +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `✓ Saved to fdmaster (RD)\n` +
              `✓ Pending administrative processing`,
            buttons: ['OK'],
            defaultId: 0,
          });
        } else {
          setNotification({ type: 'success', message: 'RD Account opened successfully' });
        }
        reset();
        fetchNextAccountNo(); // refresh for next entry
      } else {
        if ((window as any).electronAPI?.showMessageBox) {
          await (window as any).electronAPI.showMessageBox({
            type: 'error',
            title: 'RD Account Error',
            message: 'Failed to Open RD Account',
            detail: result.message || 'An unexpected error occurred. Please try again.',
            buttons: ['Try Again'],
            defaultId: 0,
          });
        } else {
          setNotification({ type: 'error', message: result.message || 'Failed to open RD Account' });
        }
      }

    } catch (error: any) {
      console.error('RD Account Save Error:', error);
      if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({
          type: 'error',
          title: 'System Connection Error',
          message: 'Unable to Connect to Server',
          detail: `Please check your network connection.\n\nTechnical details: ${error.message}`,
          buttons: ['Close'],
          defaultId: 0,
        });
      } else {
        setNotification({ type: 'error', message: error.message || 'Error occurred during save' });
      }
    }
  };

  const reset = useCallback((): void => {
    setData({
      memberNo: '',
      accountNo: '',
      prefix: '',
      firstName: '',
      middleName: '',
      lastName: '',
      rdHeadName: '',
      depositDate: new Date().toISOString().split('T')[0],
      openingBalance: '',
      depositUnit: 'Months',
      depositPeriod: '',
      rate: '',
      amount: '',
      maturityDate: '',
      maturityAmount: '',
      nominees: [],
      recoveryThroughDemand: false,
      specialInstructions: ''
    } as RDMasterData);
  }, []);

  return {
    data,
    updateMemberNo,
    updateAccountNo,
    updatePrefix,
    updateFirstName,
    updateMiddleName,
    updateLastName,
    updateRdHeadName,
    updateDepositDate,
    updateOpeningBalance,
    updateDepositUnit,
    updateDepositPeriod,
    updateRate,
    updateAmount,
    updateMaturityDate,
    updateMaturityAmount,
    updateRecoveryThroughDemand,
    updateSpecialInstructions,
    addNominee,
    removeNominee,
    updateNominee,
    save,
    reset,
    notification,
    clearNotification
  };
};
