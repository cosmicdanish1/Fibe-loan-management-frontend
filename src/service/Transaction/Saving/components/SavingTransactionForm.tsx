// components/SavingTransactionForm.tsx

import React from 'react';
import { ConfigProvider, Input, Select, Table, DatePicker, Spin, AutoComplete } from 'antd';
import {
    PiggyBank, RotateCcw, Save, X, ShieldCheck, Building2,
    Calendar, Banknote, Hash, FileText, IndianRupee,
} from 'lucide-react';
import { SavingTransactionHookReturn, TransactionHistoryRow } from '../interface/SavingTransactionInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const SavingTransactionForm: React.FC<SavingTransactionHookReturn> = ({
    formData,
    bankAccounts,
    sbAccounts,
    transactionHistory,
    isLoading,
    isLoadingAccount,
    lastSaved,
    updateField,
    handleAccountNoChange,
    handleSave,
    handleReset,
    handleExit,
}) => {
    const onExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        } else {
            handleExit();
        }
    };

    const historyColumns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Trans Date</span>,
            dataIndex: 'transDate', key: 'transDate', width: '20%',
            render: (t: string) => <span className="fz-small font-mono text-slate-700">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Voucher No</span>,
            dataIndex: 'voucherNo', key: 'voucherNo', width: '20%',
            render: (t: string) => <span className="fz-small font-mono font-bold text-slate-700">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Acc Type</span>,
            dataIndex: 'accType', key: 'accType', width: '15%',
            render: (t: string) => <span className="fz-small font-mono text-slate-600">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Trans Type</span>,
            dataIndex: 'transType', key: 'transType', width: '15%',
            render: (t: string) => (
                <span className={`fz-small font-black ${t === 'CR' ? 'text-emerald-600' : 'text-rose-600'}`}>{t}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Amount</span>,
            dataIndex: 'amount', key: 'amount', width: '30%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-black text-slate-700">₹{v.toFixed(2)}</span>,
        },
    ];

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <PiggyBank size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Saving Voucher</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Deposit / Withdrawal
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Saving…' : 'Save'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={onExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-4xl mx-auto p-3 pb-4 space-y-2">

                        {/* Last saved banner */}
                        {lastSaved && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Save size={12} className="text-emerald-600" />
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">{lastSaved.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
                                            <p className="fz-small font-black text-emerald-800">{lastSaved.voucherNo}</p>
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">A/C No</span>
                                            <p className="fz-small font-bold text-emerald-800">{lastSaved.accountNo}</p>
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Amount</span>
                                            <p className="fz-small font-black text-emerald-800">₹{lastSaved.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleReset} className="fz-mini font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                                    <RotateCcw size={9} /> New
                                </button>
                            </div>
                        )}

                        {/* ── A/C No + Trans Date ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Hash size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Account</span>
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4">
                                <div className="col-span-3">
                                    <label className={labelCls}>A/C No <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        {/* BUG FIX 21: was a plain text box — you had to already know the exact
                                            account number by heart, no way to browse or search. Now an
                                            AutoComplete: type to filter by account no or member no, pick from
                                            the list, or still just type the full number directly like before. */}
                                        <AutoComplete
                                            value={formData.accountNo}
                                            options={sbAccounts.map(a => ({
                                                value: a.accountNo,
                                                label: `${a.accountNo} — Member ${a.memberNo} — ₹${a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                                            }))}
                                            filterOption={(input, option) =>
                                                (option?.value as string ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            onChange={value => {
                                                updateField('accountNo', value);
                                                if (value.length >= 3) handleAccountNoChange(value);
                                            }}
                                            onSelect={value => handleAccountNoChange(String(value))}
                                            placeholder="Enter or pick an account number..."
                                            className="w-full"
                                            popupMatchSelectWidth={360}
                                        >
                                            <Input className={`${inputCls} pl-6 font-mono font-bold text-indigo-700`} />
                                        </AutoComplete>
                                        {isLoadingAccount && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <Spin size="small" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Trans Date</label>
                                    <DatePicker
                                        value={formData.transDate ? dayjs(formData.transDate) : null}
                                        onChange={d => updateField('transDate', d)}
                                        className="w-full h-7 fz-caption sv-dp"
                                        format="DD-MMM-YY"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Balance Info ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <IndianRupee size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Account Balances</span>
                            </div>
                            <div className="p-3 grid grid-cols-6 gap-x-4 gap-y-1">
                                {[
                                    { label: 'Current Balance', val: formData.currentBalance, cls: 'text-slate-700' },
                                    { label: 'Minimum Balance', val: formData.minimumBalance, cls: 'text-slate-700' },
                                    { label: 'Unpass Cr.', val: formData.unpassCr, cls: 'text-emerald-600' },
                                    { label: 'Unpass Dr.', val: formData.unpassDr, cls: 'text-rose-600' },
                                    { label: 'Available Bal', val: formData.availableBalance, cls: 'text-indigo-700' },
                                    { label: 'Withdrawable', val: formData.withdrawableBalance, cls: 'text-violet-700' },
                                ].map(item => (
                                    <div key={item.label} className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                                        <p className="fz-mini font-black text-slate-500 uppercase tracking-wide leading-tight mb-1">{item.label}</p>
                                        <p className={`fz-caption font-black ${item.cls}`}>₹{item.val.toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Transaction Type + Amount ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Transaction</span>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-x-4">
                                <div>
                                    <label className={labelCls}>Transaction Type</label>
                                    <Select value={formData.transactionType} onChange={v => updateField('transactionType', v)}
                                        className="w-full sv-sel" style={{ height: 28 }}>
                                        <Option value="deposit">Deposit (Receipt)</Option>
                                        <Option value="withdrawal">Withdrawal (Payment)</Option>
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelCls}>Amount (₹) <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            type="number"
                                            value={formData.amount}
                                            onChange={e => updateField('amount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold ${formData.transactionType === 'deposit' ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200' : 'text-rose-700 bg-rose-50/50 border-rose-200'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Mode of Payment ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Banknote size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Mode of Payment</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-slate-500 uppercase">Actual Amt</span>
                                        <span className="fz-tiny font-black text-slate-700">₹{formData.actualAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-slate-500 uppercase">{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className={`fz-tiny font-black ${formData.bankBal < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{formData.bankBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="flex gap-2">
                                    {['cash', 'bank'].map(mode => (
                                        <button key={mode} onClick={() => updateField('paymentMode', mode)}
                                            className={`h-7 px-4 rounded-lg fz-tiny font-black uppercase tracking-wide transition-all border ${
                                                formData.paymentMode === mode
                                                    ? mode === 'cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                            }`}>
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {formData.paymentMode === 'bank' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="fz-mini font-black text-slate-500 uppercase tracking-widest mb-2">Cheque Details</p>
                                        <div className="grid grid-cols-4 gap-x-4">
                                            <div>
                                                <label className={labelCls}>Bank A/C</label>
                                                <Select value={formData.bankCode || undefined} onChange={v => updateField('bankCode', v)}
                                                    className="w-full sv-sel" style={{ height: 28 }} placeholder="Select bank..."
                                                    showSearch optionFilterProp="children">
                                                    {bankAccounts.map(b => <Option key={b.code} value={b.code}>{b.code} — {b.name}</Option>)}
                                                </Select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque Date</label>
                                                <DatePicker
                                                    value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                                    onChange={d => updateField('chequeDate', d)}
                                                    className="w-full h-7 fz-caption sv-dp" format="DD-MMM-YY" />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque No</label>
                                                <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                                    placeholder="Cheque No..." className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Drawee Bank</label>
                                                <Input value={formData.bankName} onChange={e => updateField('bankName', e.target.value)}
                                                    placeholder="Bank name..." className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Transaction History ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Transaction History</span>
                            </div>
                            <Table
                                columns={historyColumns}
                                dataSource={transactionHistory}
                                pagination={false}
                                size="small"
                                className="sv-table"
                                rowKey={(r, i) => `${r.voucherNo}-${i}`}
                                scroll={{ y: 150 }}
                                loading={isLoadingAccount}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">Enter A/C No to view history</span> }}
                            />
                        </div>

                        {/* ── Mode of Operation + Operators (conditional) ── */}
                        {(formData.modeOfOperation || formData.operators) && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                    <Building2 size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Account Operations</span>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-x-4">
                                    <div>
                                        <label className={labelCls}>Mode of Operation</label>
                                        <div className="h-7 flex items-center px-2 bg-slate-50 border border-slate-200 rounded fz-caption font-semibold text-slate-700">
                                            {formData.modeOfOperation || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Operators</label>
                                        <div className="h-7 flex items-center px-2 bg-slate-50 border border-slate-200 rounded fz-caption font-semibold text-slate-700">
                                            {formData.operators || '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Narration ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Narration <span className="text-rose-500">*</span></span>
                            </div>
                            <div className="p-3">
                                <TextArea value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration…" rows={2}
                                    className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Saving Voucher</span>
                        {formData.accountNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">A/C: {formData.accountNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .sv-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .sv-table .ant-table-tbody > tr > td { padding: 3px 8px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .sv-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 11px !important; font-weight: 600 !important; }
                .sv-sel .ant-select-selection-item { line-height: 26px !important; font-size: 11px !important; }
                .sv-dp .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default SavingTransactionForm;
