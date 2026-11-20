import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    JournalTransferData,
    JournalTransferHookReturn,
    JournalEntry,
    VoucherOption,
} from '../interface/JournalTransferInterfaces';
import { apiService } from '../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog, toastError, isFailure } from '@/utils/dialog';

const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question', title: 'electron-react-ts', message: title, detail,
            buttons: ['Confirm', 'Cancel'], defaultId: 0, cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

let rowKeyCounter = 0;
const generateRowKey = (): string => `jr_${Date.now()}_${++rowKeyCounter}`;

const createEmptyRow = (): JournalEntry => ({
    key: generateRowKey(), mbno: '', name: '', code: '', accountName: '',
    debit: '', credit: '', rdSdSrNo: '', narration: '',
});

export const useJournalTransfer = (): JournalTransferHookReturn => {
  const { t } = useTranslation();
    const [formData, setFormData] = useState<JournalTransferData>({
        voucherNo: '',
        transferType: 'headToHead',
        narration: 'Journal Transfer Entry',
        chequeNo: '',
    });

    const [data, setData] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [headList, setHeadList] = useState<{ code: string; name: string }[]>([]);
    const [memberList, setMemberList] = useState<{ mbno: string; name: string }[]>([]);
    const [voucherList, setVoucherList] = useState<VoucherOption[]>([]);
    const [activeMember, setActiveMember] = useState<{ mbno: string; name: string }>({ mbno: '', name: '' });
    const [rawVoucherRows, setRawVoucherRows] = useState<any[]>([]);
    const [viewingExisting, setViewingExisting] = useState(false);
    const savingRef = useRef(false); // in-flight guard for Save

    useEffect(() => { fetchHeadList(); fetchVoucherList(); fetchMemberList(); }, []);

    const fetchHeadList = async () => {
        try {
            // apiService handles the auth header and 401 refresh/redirect (the raw fetch used here did not)
            const response = await apiService.getHeadList();
            if (response.success) {
                const result: any = response.data;
                setHeadList(Array.isArray(result) ? result : (result?.data || []));
            }
        } catch (e) { console.error('Head list fetch error:', e); }
    };

    // BUG FIX: the primary lookup hit `/search?type=member` — a route that doesn't
    // exist (404) — and since a 404 doesn't make fetch() throw, the catch-block
    // fallback never actually ran. That fallback (`/members?limit=300`) was itself
    // broken too: 300 exceeds the endpoint's max limit (400 Bad Request), and its
    // response shape/field names don't match what the mapping expected anyway.
    // Both replaced with apiService.lookupMembers(), already proven working
    // elsewhere in this app with exactly the memberNo/memberName shape this
    // screen expects.
    // NOTE: only the first 100 members are preloaded for the Member No picker (the lookup endpoint is paged);
    // members beyond that are not offered here and must be typed in.
    const fetchMemberList = async () => {
        try {
            const response = await apiService.lookupMembers(undefined, 100);
            if (isFailure(response)) toastError(response, 'load the member list');
            if (response.success && Array.isArray(response.data)) {
                setMemberList(response.data.map((m: any) => ({
                    mbno: String(m.memberNo || m.mbno || ''),
                    name: (m.memberName || m.name || '').trim(),
                })).filter((m: any) => m.mbno));
            }
        } catch (e) { console.error('Member list fetch error:', e); }
    };

    const fetchVoucherList = async () => {
        try {
            const response = await apiService.getPendingVouchers();
            if (isFailure(response)) toastError(response, 'load the pending vouchers');
            if (response.success && response.data) {
                const items = Array.isArray(response.data) ? response.data : [];
                // Store ALL flat rows so handleVoucherSelect can use them directly
                setRawVoucherRows(items);

                const seen = new Set<string>();
                const vouchers: VoucherOption[] = [];
                for (const item of items) {
                    // This is the Journal screen: Receipt / Payment / loan vouchers are not journals and cannot be
                    // shown here (they have their own windows), so only journal vouchers are offered.
                    if (String(item.vchrType || '').toUpperCase() !== 'JOURNAL') continue;
                    if (!item.voucherNo || seen.has(item.voucherNo)) continue;
                    seen.add(item.voucherNo);
                    vouchers.push({
                        voucherNo: item.voucherNo,
                        memberNo: String(item.memberNo || ''),
                        memberName: item.memberName || '',
                        amount: item.amount || 0,
                        type: item.vchrType || 'P',
                    });
                }
                setVoucherList(vouchers);
            }
        } catch (e) { console.error('Voucher list fetch error:', e); }
    };

    const handleVoucherSelect = useCallback((voucherNo: string) => {
        setFormData(prev => ({ ...prev, voucherNo }));
        if (!voucherNo) {
            setData([]);
            setActiveMember({ mbno: '', name: '' });
            setViewingExisting(false);
            return;
        }

        // The pending list returns ONE row per voucher with its lines in `breakdown` (head code, DR/CR, amount,
        // account no., and the line's member). The old code looked for flat per-line rows (`head`, `transType`)
        // that the API never sends, so a selected voucher always showed a single empty row.
        const voucher = rawVoucherRows.find(r => r.voucherNo === voucherNo);
        const lines: any[] = Array.isArray(voucher?.breakdown) ? voucher.breakdown : [];
        const headerMbno = String(voucher?.memberNo || '');
        const headerName = voucher?.memberName || '';
        setActiveMember({ mbno: headerMbno, name: headerName });

        if (lines.length > 0) {
            const nameFor = (m: string) => (m && m === headerMbno ? headerName : (memberList.find(x => x.mbno === m)?.name || ''));
            const rows: JournalEntry[] = lines.map(l => {
                const m = String(l.mbno || '');
                const head = headList.find(h => h.code === l.code);
                return {
                    key: generateRowKey(),
                    mbno: m,
                    name: nameFor(m),
                    code: l.code || '',
                    accountName: head?.name || l.headName || '',
                    debit: l.transType === 'DR' ? String(l.amount || '') : '',
                    credit: l.transType === 'CR' ? String(l.amount || '') : '',
                    rdSdSrNo: l.accNo && l.accNo !== '0' ? String(l.accNo) : '',
                    narration: l.name || '',
                };
            });
            setData(rows);
            setFormData(prev => ({
                ...prev,
                voucherNo,
                transferType: rows.some(r => r.mbno) ? 'memberToMember' : 'headToHead',
                narration: voucher?.narration || 'Journal Transfer Entry',
            }));
        } else {
            setData([]);
        }
        setViewingExisting(true);
    }, [rawVoucherRows, headList, memberList]);

    // Totals count only positive amounts - exactly the rows that get posted - so a negative cell can never
    // make an unbalanced voucher look balanced.
    // Summed in whole paise so 0.1 + 0.2 style float drift can never show a wrong total or a false "Balanced".
    const sumPaise = (col: 'debit' | 'credit') => data.reduce((sum, r) => { const v = parseFloat(r[col] as string); return v > 0 ? sum + Math.round(v * 100) : sum; }, 0) / 100;
    const totalDebit = useMemo(() => sumPaise('debit'), [data]);
    const totalCredit = useMemo(() => sumPaise('credit'), [data]);

    const updateField = useCallback((field: keyof JournalTransferData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Head-to-Head hides the member columns, so a member number left on a row from Member-to-Member (or from a
        // loaded voucher) would still be saved even though the user can no longer see it.
        if (field === 'transferType' && value === 'headToHead') {
            setData(prev => prev.map(r => ({ ...r, mbno: '', name: '' })));
            setActiveMember({ mbno: '', name: '' });
        }
    }, []);

    const addRow = useCallback(() => {
        const newRow = createEmptyRow();
        if (activeMember.mbno) {
            newRow.mbno = activeMember.mbno;
            newRow.name = activeMember.name;
        }
        setData(prev => [...prev, newRow]);
    }, [activeMember]);

    const removeRow = useCallback((key: string) => {
        setData(prev => prev.filter(row => row.key !== key));
    }, []);

    const updateRow = useCallback((key: string, field: keyof JournalEntry, value: any) => {
        setData(prev => prev.map(row => {
            if (row.key !== key) return row;
            const updated = { ...row, [field]: value };
            if (field === 'code' && value) {
                const code = value.toString().toUpperCase();
                const head = headList.find((h: any) => h.code === code || h.headCode === code || h.maincode === code);
                updated.accountName = head ? ((head as any).name || (head as any).headName || '') : '';
            }
            if (field === 'debit' && value && parseFloat(value) > 0) updated.credit = '';
            else if (field === 'credit' && value && parseFloat(value) > 0) updated.debit = '';
            return updated;
        }));
    }, [headList]);

    const handleSave = async () => {
        if (savingRef.current) return;
        if (viewingExisting) {
            // Save always creates a NEW voucher. An already-saved one is approved or rejected in Pass Transactions.
            await showDialog('warning', 'electron-react-ts', t('Voucher already saved'),
                t('Voucher {{1}} is already saved and waiting in Pass Transactions. Click Clear to enter a new journal.', { 1: formData.voucherNo }));
            return;
        }
        const hasTooManyDecimals = data.some(r => [r.debit, r.credit].some(v => {
            const n = parseFloat(String(v ?? '').trim());
            return n > 0 && Math.abs(n * 100 - Math.round(n * 100)) > 1e-6;
        }));
        if (hasTooManyDecimals) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Amount'), t('Debit and Credit amounts can have at most 2 decimal places.'));
            return;
        }
        if (data.some(r => String(r.rdSdSrNo ?? '').trim() !== '' && !/^\d{1,15}$/.test(String(r.rdSdSrNo).trim()))) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Reference'), t('RD / SD Sr No must be a number (digits only).'));
            return;
        }
        const hasBadAmount = data.some(r => {
            const d = String(r.debit ?? '').trim();
            const c = String(r.credit ?? '').trim();
            return (d !== '' && !(parseFloat(d) >= 0)) || (c !== '' && !(parseFloat(c) >= 0));
        });
        if (hasBadAmount) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Amount'), t('Debit and Credit amounts cannot be negative or non-numeric. Please correct the highlighted rows.'));
            return;
        }
        if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
            await showDialog('error', 'electron-react-ts', t('Debit - Credit is not equal'),
                t('Total Debit: ₹{{1}} Total Credit: ₹{{2}} Difference: ₹{{3}}', { 1: totalDebit.toFixed(2), 2: totalCredit.toFixed(2), 3: Math.abs(totalDebit - totalCredit).toFixed(2) }));
            return;
        }
        if (totalDebit <= 0) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Amount'), t('Amount must be greater than zero.'));
            return;
        }

        const validRows = data.filter(r => (parseFloat(r.debit as string) || 0) > 0 || (parseFloat(r.credit as string) || 0) > 0);
        if (validRows.length < 2) {
            await showDialog('warning', 'electron-react-ts', t('Insufficient Rows'), t('At least 2 rows with amounts required.'));
            return;
        }

        const rowsWithoutCode = validRows.filter(r => !r.code?.trim());
        if (rowsWithoutCode.length > 0) {
            await showDialog('warning', 'electron-react-ts', t('Code Missing'), t('All rows with amounts must have a Head Code.'));
            return;
        }

        if (formData.transferType === 'memberToMember') {
            // The member goes on the row that adjusts the member's account (e.g. the loan head); the counter row
            // (e.g. Cash in Hand) has no member. So one member row is enough.
            if (!validRows.some(r => r.mbno?.trim())) {
                await showDialog('warning', 'electron-react-ts', t('Member No Missing'), t('At least one row must have a Member No for Member-to-Member transfers.'));
                return;
            }
        }

        const confirmed = await showConfirm('Confirm Journal Entry',
            `Amount: ₹${totalDebit.toLocaleString('en-IN')}\nRows: ${validRows.length}\nType: ${formData.transferType === 'headToHead' ? 'Head-to-Head' : 'Member-to-Member'}\n\nThis will create a PENDING voucher for Pass Transaction.`);
        if (!confirmed) return;

        savingRef.current = true;
        setIsLoading(true);
        try {
            const res = await apiService.postJournalTransaction({
                transferType: formData.transferType,
                narration: formData.narration,
                chequeNo: formData.chequeNo,
                rows: validRows.map(r => ({
                    // member columns exist only in Member-to-Member mode
                    mbno: formData.transferType === 'memberToMember' && r.mbno ? parseInt(r.mbno) : undefined,
                    code: r.code,
                    debit: parseFloat(r.debit as string) || 0,
                    credit: parseFloat(r.credit as string) || 0,
                    narration: r.narration,
                    rdSdSrNo: r.rdSdSrNo,
                })),
            });
            if (res.success) {
                await showDialog('info', 'electron-react-ts', t('Journal Voucher Created!'),
                    t('Voucher No: {{1}} Total: ₹{{2}} Rows: {{3}} ✓ Voucher staged (PENDING) ➜ Go to Pass Transactions to post', { 1: res.data?.voucherNo || '—', 2: totalDebit.toLocaleString('en-IN'), 3: validRows.length }));
                handleReset();
                fetchVoucherList();
            } else {
                await showDialog('error', 'electron-react-ts', t('Failed'), res.error || res.message || t('Unknown error'));
            }
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', t('Server Error'), error.message);
        } finally {
            savingRef.current = false;
            setIsLoading(false);
        }
    };

    const handleReset = useCallback(() => {
        setFormData({ voucherNo: '', transferType: 'headToHead', narration: 'Journal Transfer Entry', chequeNo: '' });
        setData([]);
        setActiveMember({ mbno: '', name: '' });
        setViewingExisting(false);
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electronAPI?.closeWindow) (window as any).electronAPI.closeWindow();
        else if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    }, []);

    return {
        formData, totalDebit, totalCredit, data, isLoading, voucherList, viewingExisting, headList, memberList,
        updateField, updateRow, addRow, removeRow, handleVoucherSelect,
        handleSave, handleReset, handleExit,
    };
};
