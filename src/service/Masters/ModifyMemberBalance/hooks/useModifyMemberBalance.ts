import { useState, useCallback, useEffect, useRef } from 'react';
import type { MemberBalanceData, MemberBalanceHookReturn, Wing } from '../interfaces/interface';

const notify = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail: string) => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
  }
};
import { apiService } from '../../../../services/api';

const emptyForm = (): MemberBalanceData => ({
  shareOpBal: '', shareAmt: '',
  mdOpBal: '', mdAmt: '',
  cdOpBal: '', cdAmt: '',
  lnExecRec: '', suspBal: '',
  rlnOpBal: '', rlnAmt: '',
  elnOpBal: '', elnAmt: '',
});

export const useModifyMemberBalance = (): MemberBalanceHookReturn => {
  const [wing, setWing] = useState<string>('');
  const [wings, setWings] = useState<Wing[]>([]);
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [memberIndex, setMemberIndex] = useState<number>(0);
  const [memberTotal, setMemberTotal] = useState<number>(0);
  const [formData, setFormData] = useState<MemberBalanceData>(emptyForm());

  // Ordered list of member numbers for navigation
  const memberListRef = useRef<string[]>([]);

  // Load the wing list once on mount (only wings that actually have members).
  useEffect(() => {
    apiService.get('/admin/member-funds/wings')
      .then(response => {
        const raw = Array.isArray(response.data) ? response.data : [];
        setWings(raw.map((w: any) => ({ id: String(w.id), name: w.name || `Wing ${w.id}` })));
      })
      .catch(err => console.error('[ModifyMemberBalance] Failed to load wings:', err));
  }, []);

  // (Re)load the ordered member list whenever the wing filter changes.
  useEffect(() => {
    const url = wing ? `/admin/member-funds/list?wing=${encodeURIComponent(wing)}` : '/admin/member-funds/list';
    apiService.get(url)
      .then(response => {
        const list: string[] = Array.isArray(response.data) ? response.data : [];
        memberListRef.current = list;
        setMemberTotal(list.length);
        // Keep the index in sync with the (possibly filtered) list.
        const idx = memberNo ? list.indexOf(memberNo) : -1;
        setMemberIndex(idx >= 0 ? idx + 1 : 0);
      })
      .catch(err => console.error('[ModifyMemberBalance] Failed to load member list:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wing]);

  // Load a member's funds by member number
  const loadMember = useCallback(async (no: string, name?: string) => {
    if (!no || !no.trim()) return;

    // Defense in depth: refuse to fetch/commit anything that isn't a real member
    // number. handleMemberSelect already guards against raw search keystrokes,
    // but this is the last line of defense before a network call is made.
    const numericNo = parseInt(no, 10);
    if (!Number.isFinite(numericNo) || numericNo <= 0) {
      console.error('[ModifyMemberBalance] Refusing to load invalid member number:', no);
      return;
    }

    setMemberNo(no);
    setMemberName(name || '');
    setFormData(emptyForm());

    // Update index in list — reset to 0 (unranked) when the loaded member isn't
    // part of the current wing-filtered list, instead of leaving a stale value
    // from whatever member was previously shown.
    const idx = memberListRef.current.indexOf(no);
    setMemberIndex(idx >= 0 ? idx + 1 : 0);

    // If no name provided, try to get it from member lookup
    if (!name) {
      apiService.lookupMembers(no, 1, 0)
        .then(r => {
          const members = Array.isArray(r.data) ? r.data : [];
          if (members.length > 0) setMemberName(members[0].memberName || '');
        })
        .catch(() => {});
    }

    try {
      const response = await apiService.getMemberFunds(numericNo);
      const data = response?.data;
      if (data) {
        setFormData({
          shareOpBal: (data.sharesOpeningBalance ?? 0).toString(),
          shareAmt: (data.sharesInstallment ?? 0).toString(),
          mdOpBal: (data.monthlyContributionOpeningBalance ?? 0).toString(),
          mdAmt: (data.monthlyContributionInstallment ?? 0).toString(),
          cdOpBal: (data.compulsoryDepositOpeningBalance ?? 0).toString(),
          cdAmt: (data.compulsoryDepositInstallment ?? 0).toString(),
          lnExecRec: (data.loanExecutionReceipt ?? 0).toString(),
          suspBal: (data.suspenseBalance ?? 0).toString(),
          rlnOpBal: (data.rlnOpBal ?? 0).toString(),
          rlnAmt: (data.rlnAmt ?? 0).toString(),
          elnOpBal: (data.elnOpBal ?? 0).toString(),
          elnAmt: (data.elnAmt ?? 0).toString(),
        });
      }
    } catch (err) {
      console.error('[ModifyMemberBalance] Failed to fetch funds:', err);
      notify('error', 'Load Error', 'Failed to Load Member Balances', 'Could not retrieve balance data for this member. Please try again.');
    }
  }, []);

  const handleMemberSelect = useCallback((no: string, memberData?: any) => {
    // MemberLookupInput fires onChange on every keystroke while the user is still
    // typing/searching (memberData is undefined then), not just on an actual pick
    // from the dropdown. Treating raw partial text as a committed member number
    // used to send parseInt(partialText) (=> NaN) straight to the backend, which
    // silently created/overwrote a bogus mbno='NaN' row in fundsmaster on Save.
    // Only commit + fetch once a real member has been selected.
    if (memberData?.memberNo) {
      loadMember(memberData.memberNo, memberData.memberName);
    }
  }, [loadMember]);

  const navigateMember = useCallback((direction: 'first' | 'prev' | 'next' | 'last') => {
    const list = memberListRef.current;
    if (list.length === 0) return;

    let idx = memberListRef.current.indexOf(memberNo);
    if (idx < 0) idx = 0;

    let newIdx = idx;
    switch (direction) {
      case 'first': newIdx = 0; break;
      case 'prev':  newIdx = Math.max(0, idx - 1); break;
      case 'next':  newIdx = Math.min(list.length - 1, idx + 1); break;
      case 'last':  newIdx = list.length - 1; break;
    }

    if (newIdx !== idx || direction === 'first' || direction === 'last') {
      loadMember(list[newIdx]);
    }
  }, [memberNo, loadMember]);

  const save = useCallback(async () => {
    const numericMemberNo = memberNo ? parseInt(memberNo, 10) : NaN;
    if (!memberNo || !memberNo.trim() || !Number.isFinite(numericMemberNo) || numericMemberNo <= 0) {
      await notify('warning', 'Input Validation Error', 'No Member Selected', 'Please select a valid member before saving balances.');
      return;
    }

    // Balances can't be negative — reject before the confirm dialog rather than
    // letting the backend's @Min(0) validation bounce it after the user commits.
    const negativeField = Object.entries(formData).find(([, v]) => parseFloat(v as string) < 0);
    if (negativeField) {
      await notify('warning', 'Input Validation Error', 'Negative Amount Not Allowed', 'Balance and installment fields cannot be negative. Please correct the highlighted value.');
      return;
    }

    // Confirm before overwriting balances — this directly edits fundsmaster and is logged.
    const eAPI = (window as any).electronAPI;
    if (eAPI?.showMessageBox) {
      const res = await eAPI.showMessageBox({
        type: 'warning',
        title: 'Confirm Balance Change',
        message: `Overwrite balances for member ${memberNo}?`,
        detail: `${memberName ? memberName + '\n\n' : ''}This directly updates the member's balances in fundsmaster and is recorded in the audit log.`,
        buttons: ['Cancel', 'Confirm & Save'],
        defaultId: 1,
        cancelId: 0,
      });
      if (res?.response !== 1) return;
    } else if (!window.confirm(`Overwrite balances for member ${memberNo}? This is logged.`)) {
      return;
    }

    const payload = {
      sharesOpeningBalance: parseFloat(formData.shareOpBal) || 0,
      sharesInstallment: parseFloat(formData.shareAmt) || 0,
      monthlyContributionOpeningBalance: parseFloat(formData.mdOpBal) || 0,
      monthlyContributionInstallment: parseFloat(formData.mdAmt) || 0,
      compulsoryDepositOpeningBalance: parseFloat(formData.cdOpBal) || 0,
      compulsoryDepositInstallment: parseFloat(formData.cdAmt) || 0,
      loanExecutionReceipt: parseFloat(formData.lnExecRec) || 0,
      suspenseBalance: parseFloat(formData.suspBal) || 0,
      rlnOpBal: parseFloat(formData.rlnOpBal) || 0,
      rlnAmt: parseFloat(formData.rlnAmt) || 0,
      elnOpBal: parseFloat(formData.elnOpBal) || 0,
      elnAmt: parseFloat(formData.elnAmt) || 0,
    };

    try {
      const response = await apiService.updateMemberFunds(numericMemberNo, payload);
      if (response.success) {
        await notify(
          'info',
          'electron-react-ts',
          'Member Balance Saved Successfully!',
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `MEMBER NO         : ${memberNo}\n` +
          `MEMBER NAME       : ${memberName || '—'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `SHARES OP.BAL     : ${formData.shareOpBal}\n` +
          `MD OP.BAL         : ${formData.mdOpBal}\n` +
          `CD OP.BAL         : ${formData.cdOpBal}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `✓ Updated in fundsmaster`
        );
      } else {
        // BUG FIX: was response.error — apiService returns response.message, not response.error
        await notify('error', 'Member Balance Error', 'Failed to Save Balance', response.message || 'An unexpected error occurred. Please try again.');
      }
    } catch (error: any) {
      await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Technical details: ${error.message}`);
    }
  }, [formData, memberNo, memberName]);

  const reset = useCallback(() => {
    if (memberNo) {
      loadMember(memberNo, memberName);
    } else {
      setFormData(emptyForm());
    }
  }, [memberNo, memberName, loadMember]);

  return {
    formData, setFormData,
    wing, setWing, wings,
    memberNo, memberName,
    memberIndex, memberTotal,
    handleMemberSelect,
    navigateMember,
    save, reset,
  };
};
