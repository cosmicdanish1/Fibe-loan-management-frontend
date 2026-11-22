// hook/useCompulsoryDepositLegacy.ts
// RD/CD Transaction Legacy: a bulk CHARGE. Each member's Compulsory Deposit is debited and the chosen head is credited
// (the opposite of RD/CD Transaction, which credits members with interest).

import { useState, useCallback, useEffect, useRef } from 'react';
import { DepositTransaction, CompulsoryDepositHookReturn, CDMember, IncomeHead } from '../../CompulsoryDepositTransaction/interface/CompulsoryDepositInterfaces';
import { apiService } from '../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';

const DEFAULT_NARRATION = 'Transfer for CDS';

// Modal.confirm does not work in Electron renderer windows; the native question box is used (browser: window.confirm).
const showConfirm = async (title: string, detail: string): Promise<boolean> => {
    if ((window as any).electronAPI?.showMessageBox) {
        const result = await (window as any).electronAPI.showMessageBox({
            type: 'question', title: 'electron-react-ts', message: title, detail,
            buttons: ['Yes', 'No'], defaultId: 1, cancelId: 1,
        });
        return result?.response === 0;
    }
    return window.confirm(`${title}\n\n${detail}`);
};

export const useCompulsoryDepositLegacy = (): CompulsoryDepositHookReturn => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<DepositTransaction>({ amount: '', incomeHead: '', narration: DEFAULT_NARRATION });
    const [members, setMembers] = useState<CDMember[]>([]);
    const [incomeHeads, setIncomeHeads] = useState<IncomeHead[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const postingRef = useRef(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [memberRes, headRes] = await Promise.all([apiService.getCDMembers(), apiService.getCDChargeHeads()]);
            if (memberRes.success) setMembers((memberRes.data || []).map((m: any) => ({ ...m, postAmount: '' })));
            if (headRes.success) setIncomeHeads(headRes.data || []);
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', t('Data Load Failed'), t('Failed to load members or income heads. Technical: {{1}}', { 1: error.message }));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const updateField = useCallback((field: keyof DepositTransaction, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateMemberAmount = useCallback((memberNo: number, amount: string) => {
        setMembers(prev => prev.map(m => (m.memberNo === memberNo ? { ...m, postAmount: amount } : m)));
    }, []);

    // Equal share to every member who can bear it: a member whose balance is below the share is left at 0.
    const distributeEqually = useCallback(async () => {
        const total = parseFloat(formData.amount);
        if (isNaN(total) || total <= 0) {
            await showDialog('warning', 'electron-react-ts', t('Invalid Total Amount'), t('Please enter a valid total amount before distributing equally.'));
            return;
        }
        const eligible = members.filter(m => Number(m.currentBalance || 0) > 0);
        if (eligible.length === 0) return;
        const totalPaise = Math.round(total * 100);
        const base = Math.floor(totalPaise / eligible.length);
        const remainder = totalPaise - base * eligible.length;
        const shares = new Map<number, string>();
        eligible.forEach((m, i) => shares.set(m.memberNo, ((base + (i < remainder ? 1 : 0)) / 100).toFixed(2)));
        setMembers(prev => prev.map(m => ({ ...m, postAmount: shares.get(m.memberNo) ?? '' })));
        await showDialog('info', 'electron-react-ts', t('Amount Distributed'),
            `₹${(totalPaise / 100).toLocaleString('en-IN')} shared among ${eligible.length} members with a Compulsory Deposit balance.\nA member holding less than the share is marked in red and must be corrected before posting.`);
    }, [formData.amount, members]);

    const handleSave = async () => {
        if (postingRef.current) return;
        if (!formData.incomeHead) {
            await showDialog('error', 'electron-react-ts', t('Credit Head Required'), t('Please select the head to credit before posting.'));
            return;
        }
        const rows = members
            .filter(m => parseFloat(m.postAmount as string) > 0)
            .map(m => ({ memberNo: m.memberNo, memberName: m.memberName, currentBalance: m.currentBalance, postAmount: Math.round(parseFloat(m.postAmount as string) * 100) / 100 }))
            .filter(d => d.postAmount > 0);
        if (rows.length === 0) {
            await showDialog('error', 'electron-react-ts', t('No Amounts Entered'), t('No valid charge amounts found in the members list. Please enter amounts before posting.'));
            return;
        }
        const tooMuch = rows.filter(r => r.postAmount > Number(r.currentBalance || 0));
        if (tooMuch.length > 0) {
            await showDialog('error', 'electron-react-ts', t('Charge Exceeds Balance'),
                `${tooMuch.length} member(s) hold less Compulsory Deposit than the charge, for example ${tooMuch[0]!.memberNo} (balance ₹${Number(tooMuch[0]!.currentBalance || 0).toLocaleString('en-IN')}, charge ₹${tooMuch[0]!.postAmount.toLocaleString('en-IN')}). Correct the marked rows and post again.`);
            return;
        }
        const total = rows.reduce((sum, d) => sum + Math.round(d.postAmount * 100), 0) / 100;
        const typed = parseFloat(formData.amount);
        const mismatch = !isNaN(typed) && typed > 0 && Math.round(typed * 100) !== Math.round(total * 100);

        const confirmed = await showConfirm(
            'Do You Really Want to Post Charges?',
            `₹${total.toLocaleString('en-IN')} will be taken from the Compulsory Deposit of ${rows.length} members.\n\nCredit Head : ${formData.incomeHead}\nNarration   : ${formData.narration || '—'}${mismatch ? `\n\nWARNING: the typed amount (₹${typed.toLocaleString('en-IN')}) differs from the sum of the member amounts (₹${total.toLocaleString('en-IN')}). The member amounts will be posted.` : ''}\n\nThis immediately lowers the member balances and posts the ledger.`);
        if (!confirmed) return;

        postingRef.current = true;
        setIsPosting(true);
        try {
            const response = await apiService.postCDCharge({ incomeHeadCode: formData.incomeHead, totalAmount: total, distributions: rows, narration: formData.narration });
            if (response.success) {
                await showDialog('info', 'electron-react-ts', t('Charges Posted Successfully!'),
                    `VOUCHER NO    : ${response.data?.voucherNo || '—'}\nCREDIT HEAD   : ${formData.incomeHead}\nTOTAL AMOUNT  : ₹${total.toLocaleString('en-IN')}\nMEMBERS       : ${rows.length}\n✓ Member CD balances lowered\n✓ Ledger entries posted`);
                fetchData();
                setFormData(prev => ({ ...prev, amount: '' }));
            } else {
                await showDialog('error', 'electron-react-ts', t('CD Posting Failed'), response.message || t('An unexpected error occurred. Please try again.'));
            }
        } catch (error: any) {
            await showDialog('error', 'electron-react-ts', t('Unable to Connect to Server'), t('Technical details: {{1}}', { 1: error.message }));
        } finally {
            postingRef.current = false;
            setIsPosting(false);
        }
    };

    const handleReset = useCallback(async () => {
        const confirmed = await showConfirm('Reset Form?', 'This will clear all current inputs and individual member amounts. Continue?');
        if (!confirmed) return;
        setFormData({ amount: '', incomeHead: '', narration: DEFAULT_NARRATION });
        setMembers(prev => prev.map(m => ({ ...m, postAmount: '' })));
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    }, []);

    return { formData, members, incomeHeads, isLoading, isPosting, updateField, updateMemberAmount, handleSave, handleReset, handleExit, distributeEqually };
};
