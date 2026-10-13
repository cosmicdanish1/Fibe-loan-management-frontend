import { useState, useCallback, useEffect, useRef } from 'react';
import { SavingAccountData, SavingAccountHookReturn, SavingNominee } from '../interfaces/interface';
import { apiService } from '../../../../services/api';

const notify = async (type: 'info' | 'warning' | 'error', title: string, message: string, detail: string) => {
    if ((window as any).electronAPI?.showMessageBox) {
        await (window as any).electronAPI.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`[${type.toUpperCase()}] ${message}\n\n${detail}`);
    }
};

// Local (not UTC) calendar date as YYYY-MM-DD
const localToday = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useSavingAccountOpening = (): SavingAccountHookReturn => {
    const [data, setData] = useState<SavingAccountData>({
        memberNo: '',
        accountNo: '',
        prefix: 'Mr.',
        firstName: '',
        middleName: '',
        lastName: '',
        openingDate: localToday(),
        openingBalance: '0.00',
        ledgerGroup: 'General',
        specialInstructions: '',
        nominees: []
    });
    const savingRef = useRef(false);

    const updateField = (field: keyof SavingAccountData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    // FIX 1: auto-generate the next account number on mount (still editable).
    const fetchNextAccountNo = useCallback(async () => {
        try {
            const res = await apiService.getNextSbAccountNumber();
            const next = (res.data as any)?.nextAccountNumber ?? (res.data as any)?.data?.nextAccountNumber;
            if (res.success && next) {
                setData(prev => (prev.accountNo ? prev : { ...prev, accountNo: String(next) }));
            }
        } catch { /* silent — user can still type manually */ }
    }, []);

    useEffect(() => { fetchNextAccountNo(); }, [fetchNextAccountNo]);

    const addNominee = () => {
        const newNominee: SavingNominee = {
            id: Date.now(),
            name: '',
            address: '',
            age: '',
            relation: ''
        };
        // FIX 2: sbmaster stores a single nominee — warn before adding extras (consistent with RD).
        // The dialog is raised here, not inside the state updater (updaters must be pure; StrictMode runs them twice).
        if (data.nominees.length >= 1) {
            notify('warning', 'Nominee Limit', 'Only the first nominee is saved',
                'The savings account record stores one nominee. Additional nominees are for reference only and will not be persisted.');
        }
        setData(prev => ({ ...prev, nominees: [...prev.nominees, newNominee] }));
    };

    // BUG FIX: removeNominee was missing — users could add nominees but never delete them
    const removeNominee = useCallback((id: number) => {
        setData(prev => ({ ...prev, nominees: prev.nominees.filter(n => n.id !== id) }));
    }, []);

    const updateNominee = (id: number, field: keyof SavingNominee, value: string) => {
        setData(prev => ({
            ...prev,
            nominees: prev.nominees.map(n => n.id === id ? { ...n, [field]: value } : n)
        }));
    };

    const save = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
            await runSave();
        } finally {
            savingRef.current = false;
        }
    };

    const runSave = async () => {
        if (!data.memberNo) {
            await notify('warning', 'Input Validation Error', 'Member No Required', 'Please enter or select a member number before saving.');
            return;
        }
        if (!data.accountNo) {
            await notify('warning', 'Input Validation Error', 'Account No Required', 'Please enter an account number before saving.');
            return;
        }
        const balanceText = String(data.openingBalance ?? '').trim();
        if (!/^\d+(\.\d{1,2})?$/.test(balanceText)) {
            await notify('warning', 'Input Validation Error', 'Invalid Opening Balance', 'Opening balance must be a non-negative amount with at most 2 decimal places.');
            return;
        }
        if (!data.openingDate) {
            await notify('warning', 'Input Validation Error', 'Opening Date Required', 'Please enter the account opening date.');
            return;
        }
        if (data.openingDate > localToday()) {
            await notify('warning', 'Input Validation Error', 'Invalid Opening Date', 'Opening date cannot be in the future.');
            return;
        }

        try {
            const primaryNominee = data.nominees.length > 0 ? data.nominees[0] : null;

            const payload = {
                memberNo: data.memberNo,
                accountNo: data.accountNo,
                openingDate: data.openingDate,
                openingBalance: parseFloat(balanceText),
                ledgerGroup: data.ledgerGroup,
                specialInstructions: data.specialInstructions,
                nomineeName: primaryNominee ? primaryNominee.name : undefined,
                nomineeAge: primaryNominee ? primaryNominee.age : undefined,
                nomineeAddress: primaryNominee ? primaryNominee.address : undefined,
                nomineeRelation: primaryNominee ? primaryNominee.relation : undefined
            };

            const response = await apiService.createSbAccount(payload);

            if (response.success) {
                const fullName = [data.prefix, data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
                await notify(
                    'info',
                    'electron-react-ts',
                    'Saving Account Opened Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `ACCOUNT NO            : ${data.accountNo}\n` +
                    `MEMBER DETAILS        : ${data.memberNo} - ${fullName || 'N/A'}\n` +
                    `OPENING BALANCE       : ₹${parseFloat(data.openingBalance).toLocaleString('en-IN')}\n` +
                    `LEDGER GROUP          : ${data.ledgerGroup}\n` +
                    `OPENING DATE          : ${data.openingDate}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ Saved to sbmaster\n` +
                    `✓ Account status: Active`
                );
                reset();
                fetchNextAccountNo(); // pre-fill the next account number
            } else {
                await notify('error', 'Saving Account Error', 'Failed to Create Account', response.message || 'An unexpected error occurred. Please try again.');
            }

        } catch (error: any) {
            console.error('Saving Account Error:', error);
            await notify('error', 'System Connection Error', 'Unable to Connect to Server', `Please check your network connection.\n\nTechnical details: ${error.message}`);
        }
    };

    const reset = () => {
        setData({
            memberNo: '',
            accountNo: '',
            prefix: 'Mr.',
            firstName: '',
            middleName: '',
            lastName: '',
            openingDate: localToday(),
            openingBalance: '0.00',
            ledgerGroup: 'General',
            specialInstructions: '',
            nominees: []
        });
    };

    return {
        data,
        updateField,
        addNominee,
        removeNominee,
        updateNominee,
        save,
        reset
    };
};
