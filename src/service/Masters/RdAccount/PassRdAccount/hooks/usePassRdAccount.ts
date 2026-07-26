import { useState } from 'react';
import { apiService } from '../../../../../services/api';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';

export interface PassRdAccountData {
    memberNo: string;
    accountNo: string;
    depositDate: string;
    depositPeriod: string;
    depositUnit: string;
    rate: string;
    amount: string;
    maturityAmount: string;
    specialInstructions: string;
}

const eAPI = () => (window as any).electronAPI;

const showInfo = async (title: string, message: string, detail = '') => {
    if (eAPI()?.showMessageBox) {
        await eAPI().showMessageBox({ type: 'info', title, message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`${message}\n${detail}`);
    }
};

const showWarn = async (message: string, detail = '') => {
    if (eAPI()?.showMessageBox) {
        await eAPI().showMessageBox({ type: 'warning', title: 'Input Validation', message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`Warning: ${message}\n${detail}`);
    }
};

const showError = async (message: string, detail = '') => {
    if (eAPI()?.showMessageBox) {
        await eAPI().showMessageBox({ type: 'error', title: 'Error', message, detail, buttons: ['OK'], defaultId: 0 });
    } else {
        alert(`Error: ${message}\n${detail}`);
    }
};

export const usePassRdAccount = () => {
    const [formData, setFormData] = useState<PassRdAccountData>({
        memberNo: '',
        accountNo: '',
        depositDate: '',
        depositPeriod: '',
        depositUnit: 'Months',
        rate: '',
        amount: '',
        maturityAmount: '',
        specialInstructions: ''
    });

    const updateField = (field: keyof PassRdAccountData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const fetchAccount = async (accountNo: string) => {
        if (!accountNo) return;
        try {
            const response = await apiService.getRdAccount(Number(accountNo));
            if (response.success && response.data) {
                const d = (response.data as any).data || response.data;
                const unitLabel = d.depositUnit === 2 || d.depunit === 2 ? 'Years' : 'Months';
                const extractDate = (val: any): string => {
                    if (!val) return '';
                    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
                    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0] || '';
                    return '';
                };
                setFormData({
                    memberNo: (d.memberNo || d.mbno)?.toString() || '',
                    accountNo: (d.accountNumber || d.account_number)?.toString() || accountNo,
                    depositDate: extractDate(d.depositDate || d.depdate),
                    depositPeriod: (d.depositPeriod || d.depperiod)?.toString() || '',
                    depositUnit: unitLabel,
                    rate: (d.rate)?.toString() || '',
                    amount: (d.amount || d.fdamount)?.toString() || '',
                    maturityAmount: (d.maturityAmount || d.matamount)?.toString() || '',
                    specialInstructions: (d.specialInstructions || d.remarks) || ''
                });
            } else {
                await showWarn('Account Not Found', `No RD account found for account number ${accountNo}.`);
            }
        } catch (error: any) {
            await showError('Error Fetching Account', error?.message || 'Could not load account details. Please try again.');
        }
    };

    const save = async () => {
        if (!formData.memberNo) {
            await showWarn('Member Required', 'Please select a member before saving.');
            return;
        }
        if (!formData.accountNo) {
            await showWarn('Account Required', 'Please select an RD account before saving.');
            return;
        }

        try {
            const payload = {
                memberNo: parseInt(formData.memberNo, 10) || undefined,
                accountNumber: parseInt(formData.accountNo, 10),
                depositDate: formData.depositDate || null,
                depositPeriod: parseFloat(formData.depositPeriod) || 0,
                depositUnit: formData.depositUnit === 'Years' ? 2 : 1,
                rate: parseFloat(formData.rate) || 0,
                amount: parseFloat(formData.amount) || 0,
                maturityAmount: parseFloat(formData.maturityAmount) || 0,
                specialInstructions: formData.specialInstructions
            };

            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${await getApiBaseUrl()}/admin/rd-accounts/${formData.accountNo}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (response.ok) {
                await showInfo(
                    'electron-react-ts',
                    'RD Account Updated Successfully!',
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `ACCOUNT NO            : ${formData.accountNo}\n` +
                    `MEMBER NO             : ${formData.memberNo}\n` +
                    `DEPOSIT AMOUNT        : ₹${parseFloat(formData.amount || '0').toLocaleString('en-IN')}\n` +
                    `DEPOSIT PERIOD        : ${formData.depositPeriod} ${formData.depositUnit}\n` +
                    `INTEREST RATE         : ${formData.rate}%\n` +
                    (formData.maturityAmount ? `MATURITY AMOUNT       : ₹${parseFloat(formData.maturityAmount).toLocaleString('en-IN')}\n` : '') +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✓ RD record updated in fdmaster`
                );
                // Re-fetch the same account so form repopulates with saved data
                await fetchAccount(formData.accountNo);
            } else {
                await showError('Failed to Update RD Account', result.message || 'An unexpected error occurred. Please try again.');
            }
        } catch (error: any) {
            await showError('Connection Error', `Unable to reach server.\n\nDetails: ${error?.message || 'Unknown error'}`);
        }
    };

    const handleClear = () => {
        setFormData({
            memberNo: '',
            accountNo: '',
            depositDate: '',
            depositPeriod: '',
            depositUnit: 'Months',
            rate: '',
            amount: '',
            maturityAmount: '',
            specialInstructions: ''
        });
    };

    return { formData, updateField, fetchAccount, save, handleClear };
};
