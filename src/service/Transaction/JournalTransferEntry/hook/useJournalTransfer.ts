import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    JournalTransferData,
    JournalTransferHookReturn,
    JournalEntry,
    VoucherOption,
} from '../interface/JournalTransferInterfaces';
import { apiService } from '../../../../services/api';
import { API_ROUTES, getApiBaseUrl } from '../../../../services/apiVersionConfig';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
    } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

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

    useEffect(() => { fetchHeadList(); fetchVoucherList(); fetchMemberList(); }, []);

    const fetchHeadList = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}${API_ROUTES.reports.heads()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (response.ok) {
                const result = await response.json();
                setHeadList(Array.isArray(result) ? result : (result.data || []));
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
    const fetchMemberList = async () => {
        try {
            const response = await apiService.lookupMembers(undefined, 100);
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
            if (response.success && response.data) {
                const items = Array.isArray(response.data) ? response.data : [];
                // Store ALL flat rows so handleVoucherSelect can use them directly
                setRawVoucherRows(items);

                const seen = new Set<string>();
                const vouchers: VoucherOption[] = [];
                for (const item of items) {
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
            return;
        }

        // Use the already-loaded flat rows — no extra network call needed.
        // The backend returns one flat row per transaction line under each voucher.
        const matchingRows = rawVoucherRows.filter(r => r.voucherNo === voucherNo);

        // Member info is identical on every row for the same voucher
        const mbno = String(matchingRows[0]?.memberNo || '');
        const mName = matchingRows[0]?.memberName || '';
        setActiveMember({ mbno, name: mName });

        if (matchingRows.length > 0 && matchingRows[0].head) {
            // Voucher already has transaction lines — populate grid from them
            const rows: JournalEntry[] = matchingRows.map(r => ({
                key: generateRowKey(),
                mbno,
                name: mName,
                code: r.head || '',
                accountName: '',
                debit: r.transType === 'DR' ? String(r.amount || '') : '',
                credit: r.transType === 'CR' ? String(r.amount || '') : '',
                rdSdSrNo: '',
                narration: r.narration || '',
            }));
            setData(rows);
            setFormData(prev => ({
                ...prev,
                narration: matchingRows[0]?.narration || 'Journal Transfer',
            }));
        } else {
            // Voucher exists but has no transaction lines yet — one pre-filled empty row
            setData([{ ...createEmptyRow(), mbno, name: mName }]);
        }
    }, [rawVoucherRows]);

    const totalDebit = useMemo(() => data.reduce((sum, r) => sum + (parseFloat(r.debit as string) || 0), 0), [data]);
    const totalCredit = useMemo(() => data.reduce((sum, r) => sum + (parseFloat(r.credit as string) || 0), 0), [data]);

    const updateField = useCallback((field: keyof JournalTransferData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            await showDialog('error', 'electron-react-ts', 'Debit - Credit is not equal',
                `Total Debit: ₹${totalDebit.toFixed(2)}\nTotal Credit: ₹${totalCredit.toFixed(2)}\nDifference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`);
            return;
        }
        if (totalDebit <= 0) {
            await showDialog('warning', 'electron-react-ts', 'Invalid Amount', 'Amount must be greater than zero.');
            return;
        }

        const validRows = data.filter(r => (parseFloat(r.debit as string) || 0) > 0 || (parseFloat(r.credit as string) || 0) > 0);
        if (validRows.length < 2) {
            await showDialog('warning', 'electron-react-ts', 'Insufficient Rows', 'At least 2 rows with amounts required.');
            return;
        }

        const rowsWithoutCode = validRows.filter(r => !r.code?.trim());
        if (rowsWithoutCode.length > 0) {
            await showDialog('warning', 'electron-react-ts', 'Code Missing', 'All rows with amounts must have a Head Code.');
            return;
        }

        if (formData.transferType === 'memberToMember') {
            const rowsWithoutMember = validRows.filter(r => !r.mbno?.trim());
            if (rowsWithoutMember.length > 0) {
                await showDialog('warning', 'electron-react-ts', 'Member No Missing', 'All rows must have a Member No for Member-to-Member transfers.');
                return;
            }
        }

        const confirmed = await showConfirm('Confirm Journal Entry',
            `Amount: ₹${totalDebit.toLocaleString('en-IN')}\nRows: ${validRows.length}\nType: ${formData.transferType === 'headToHead' ? 'Head-to-Head' : 'Member-to-Member'}\n\nThis will create a PENDING voucher for Pass Transaction.`);
        if (!confirmed) return;

        setIsLoading(true);
        try {
            const res = await apiService.postJournalTransaction({
                transferType: formData.transferType,
                narration: formData.narration,
                chequeNo: formData.chequeNo,
                rows: validRows.map(r => ({
                    mbno: r.mbno ? parseInt(r.mbno) : undefined,
                    code: r.code,
                    debit: parseFloat(r.debit as string) || 0,
                    credit: parseFloat(r.credit as string) || 0,
                    narration: r.narration,
                    rdSdSrNo: r.rdSdSrNo,
                })),
            });
            if (res.success) {
                await showDialog('info', 'electron-react-ts', 'Journal Voucher Created!',
                    `Voucher No: ${res.data?.voucherNo || '—'}\nTotal: ₹${totalDebit.toLocaleString('en-IN')}\nRows: ${validRows.length}\n\n✓ Voucher staged (PENDING)\n➜ Go to Pass Transactions to post`);
                handleReset();
                fetchVoucherList();
            } else {
                await showDialog('error', 'electron-react-ts', 'Failed', res.error || res.message || 'Unknown error');
            }
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', 'Server Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = useCallback(() => {
        setFormData({ voucherNo: '', transferType: 'headToHead', narration: 'Journal Transfer Entry', chequeNo: '' });
        setData([]);
        setActiveMember({ mbno: '', name: '' });
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electronAPI?.closeWindow) (window as any).electronAPI.closeWindow();
        else if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    }, []);

    return {
        formData, totalDebit, totalCredit, data, isLoading, voucherList, headList, memberList,
        updateField, updateRow, addRow, removeRow, handleVoucherSelect,
        handleSave, handleReset, handleExit,
    };
};
