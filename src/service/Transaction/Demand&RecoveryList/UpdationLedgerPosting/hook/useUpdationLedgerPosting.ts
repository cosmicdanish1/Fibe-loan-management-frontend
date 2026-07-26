// hook/useUpdationLedgerPosting.ts

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    PostingFormData,
    MemberDemandGroup,
    BranchOption,
    UpdationLedgerPostingHookReturn,
} from '../interface/UpdationLedgerPostingInterfaces';
import { getApiBaseUrl } from '../../../../../services/serverConfig';

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

const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question', title: 'electron-react-ts', message: title, detail,
            buttons: ['Post', 'Cancel'], defaultId: 0, cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

const currentMonth = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();

export const useUpdationLedgerPosting = (): UpdationLedgerPostingHookReturn => {
    const [formData, setFormData] = useState<PostingFormData>({
        month: currentMonth,
        year: new Date().getFullYear().toString(),
        branch: '',
        fromMember: '',
        toMember: '',
        modeOfReceipt: 'CASH',
        totalOfficeAmount: '',
    });

    const [memberGroups, setMemberGroups] = useState<MemberDemandGroup[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const base = await getApiBaseUrl();
                const token = localStorage.getItem('accessToken');
                const resp = await fetch(`${base}/admin/offices`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (resp.ok) {
                    const result = await resp.json();
                    const offices = Array.isArray(result) ? result : (result.data || []);
                    setBranches(offices.map((o: any) => ({
                        officeno: o.officeno || o.officeId,
                        office_name: o.office_name || o.officeName || '',
                        division: o.division || '',
                    })));
                }
            } catch (e) {
                console.error('Failed to fetch branches:', e);
            }
        })();
    }, []);

    const grandTotalSend = useMemo(() => memberGroups.reduce((s, g) => s + g.totalSend, 0), [memberGroups]);
    const grandTotalReceived = useMemo(() => memberGroups.reduce((s, g) => s + g.totalReceived, 0), [memberGroups]);
    const grandTotalShort = useMemo(() => memberGroups.reduce((s, g) => s + g.totalShort, 0), [memberGroups]);

    const updateField = useCallback((field: keyof PostingFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleLoad = useCallback(async () => {
        if (!formData.month || !formData.year) {
            await showDialog('warning', 'electron-react-ts', 'Missing Fields', 'Please select Month and Year.');
            return;
        }

        setIsLoading(true);
        setMemberGroups([]);

        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const params = new URLSearchParams({
                month: formData.month,
                year: formData.year,
                branch: formData.branch,
            });
            if (formData.fromMember) params.append('fromMember', formData.fromMember);
            if (formData.toMember) params.append('toMember', formData.toMember);

            const resp = await fetch(`${base}/transactions/ledger-posting/summary?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!resp.ok) throw new Error(await resp.text());

            const result = await resp.json();
            const groups: MemberDemandGroup[] = result.data || result || [];
            setMemberGroups(groups);

            if (groups.length === 0) {
                await showDialog('info', 'electron-react-ts', 'No Pending Demands',
                    'No unposted demand records found for this period/branch.\n\nMake sure you have imported and saved demand data first.');
            }
        } catch (err: any) {
            console.error('Load failed:', err);
            await showDialog('error', 'electron-react-ts', 'Load Failed', err.message || 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [formData]);

    const handlePosting = useCallback(async () => {
        if (memberGroups.length === 0) {
            await showDialog('warning', 'electron-react-ts', 'No Data', 'Please load demand data first.');
            return;
        }

        if (grandTotalSend !== grandTotalReceived) {
            await showDialog('error', 'electron-react-ts', 'Totals Do Not Match',
                `Demand Send (₹${grandTotalSend.toLocaleString('en-IN')}) ≠ Demand Received (₹${grandTotalReceived.toLocaleString('en-IN')}).\n\n` +
                `Both totals must be equal before posting.`);
            return;
        }

        const confirmed = await showConfirm(
            'Post to Ledger?',
            `This will post ${memberGroups.length} member demands to the General Ledger.\n\n` +
            `Total Amount: ₹${grandTotalSend.toLocaleString('en-IN')}\n` +
            `Mode: ${formData.modeOfReceipt}\n\n` +
            `This action cannot be undone.`
        );
        if (!confirmed) return;

        setIsPosting(true);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const resp = await fetch(`${base}/transactions/ledger-posting/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    month: formData.month,
                    year: formData.year,
                    branch: formData.branch,
                    modeOfReceipt: formData.modeOfReceipt,
                    totalOfficeAmount: grandTotalSend,
                }),
            });

            if (!resp.ok) throw new Error(await resp.text());

            const result = await resp.json();
            const data = result.data || result;

            await showDialog('info', 'electron-react-ts', 'Ledger Posting Successful!',
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `VOUCHER NO    : ${data.voucherNo || '—'}\n` +
                `MEMBERS       : ${data.recordCount || memberGroups.length}\n` +
                `TOTAL POSTED  : ₹${(data.totalPosted || grandTotalSend).toLocaleString('en-IN')}\n` +
                `MODE          : ${formData.modeOfReceipt}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✓ Posted to ledger\n` +
                `✓ Member balances updated\n` +
                `✓ Demand marked as posted`
            );
            setMemberGroups([]);
        } catch (err: any) {
            console.error('Posting failed:', err);
            let msg = err.message || 'Unknown error';
            try { msg = JSON.parse(msg)?.message || msg; } catch {}
            await showDialog('error', 'electron-react-ts', 'Posting Failed', msg);
        } finally {
            setIsPosting(false);
        }
    }, [formData, memberGroups, grandTotalSend, grandTotalReceived]);

    const handleReset = useCallback(() => {
        setMemberGroups([]);
        setFormData(prev => ({ ...prev, fromMember: '', toMember: '', totalOfficeAmount: '' }));
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    }, []);

    return {
        formData, memberGroups, branches,
        isLoading, isPosting,
        grandTotalSend, grandTotalReceived, grandTotalShort,
        updateField, handleLoad, handlePosting, handleReset, handleExit,
    };
};
