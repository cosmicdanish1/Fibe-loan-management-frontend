// components/DividendPaymentForm.tsx

import React from 'react';
import { ConfigProvider, Input, Table, Modal, Select, DatePicker } from 'antd';
import {
    Banknote, RotateCcw, Save, X, ShieldCheck, Building2,
    Users, Search, Calendar, FileText, IndianRupee,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DividendPaymentHookReturn } from '../interface/DividendPaymentInterfaces';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const DividendPaymentForm: React.FC<DividendPaymentHookReturn> = ({
    formData,
    actualAmount,
    bankBalance,
    bankAccounts,
    data,
    isLoading,
    showLookupModal,
    setShowLookupModal,
    updateField,
    handleSave,
    handleReset,
    handleExit,
}) => {
    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">WR No</span>,
            dataIndex: 'wrNo', key: 'wrNo',
            render: (text: string) => <span className="fz-small font-mono font-bold text-slate-700">{text}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Balance</span>,
            dataIndex: 'balance', key: 'balance', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-mono text-slate-600">{v.toFixed(2)}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Rate</span>,
            dataIndex: 'rate', key: 'rate', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-mono text-indigo-600">{v.toFixed(2)}%</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Dividend</span>,
            dataIndex: 'dividend', key: 'dividend', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-black text-emerald-600">₹{v.toFixed(2)}</span>,
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Banknote size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Dividend Payment</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> DR L1024 → Ledger
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Banknote size={11} />}
                            {isLoading ? 'Processing…' : 'Disburse'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-4xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Member + Sub Division + Trans Date ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Details</span>
                            </div>
                            <div className="p-3 grid grid-cols-3 gap-x-4">
                                <div>
                                    <label className={labelCls}>Member No <span className="text-rose-500">*</span></label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <Users size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input value={formData.memberNo}
                                                onChange={e => updateField('memberNo', e.target.value)}
                                                onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookupModal(true); } }}
                                                placeholder="Click or PgUp to search…"
                                                className={`${inputCls} pl-6 font-mono`} />
                                        </div>
                                        <button onClick={() => setShowLookupModal(true)}
                                            className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                            <Search size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Sub Division <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Building2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={formData.subDivision} onChange={e => updateField('subDivision', e.target.value)}
                                            placeholder="Sub Division..."
                                            className={`${inputCls} pl-6`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Trans Date</label>
                                    <DatePicker
                                        value={formData.transDate ? dayjs(formData.transDate) : null}
                                        onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        allowClear={false}
                                        className="w-full h-7 fz-caption"
                                        suffixIcon={<Calendar size={10} className="text-indigo-400" />}
                                    />
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
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                        <IndianRupee size={9} className="text-indigo-500" />
                                        <span className="fz-mini font-black text-indigo-500 uppercase">Actual Amt</span>
                                        <span className="fz-tiny font-black text-indigo-700">₹{actualAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-slate-500 uppercase">{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className={`fz-tiny font-black ${bankBalance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                                                <label className={labelCls}>Pay From A/C</label>
                                                <Select value={formData.bankCode || undefined}
                                                    onChange={val => updateField('bankCode', val)}
                                                    showSearch optionFilterProp="label" size="small" className="w-full"
                                                    placeholder="Bank account..."
                                                    options={bankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque Date</label>
                                                <DatePicker
                                                    value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                                    onChange={d => updateField('chequeDate', d)}
                                                    format="DD-MMM-YY" allowClear={false} className="w-full h-7 fz-caption" />
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

                        {/* ── Dividend Grid ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">WR Dividend Breakdown</span>
                            </div>
                            <Table
                                columns={columns}
                                dataSource={data}
                                pagination={false}
                                size="small"
                                className="div-table"
                                rowKey="key"
                                scroll={{ y: 220 }}
                                loading={isLoading}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-6 block text-center font-bold uppercase">Enter member no to load pending dividends</span> }}
                            />
                        </div>

                        {/* ── Narration ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Narration</span>
                            </div>
                            <div className="p-3">
                                <TextArea value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration / remarks…" rows={2}
                                    className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Dividend Payment</span>
                        {formData.memberNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Member: {formData.memberNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            {/* Member Lookup Modal */}
            <Modal open={showLookupModal} onCancel={() => setShowLookupModal(false)} footer={null}
                width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onClose={() => setShowLookupModal(false)}
                    onSelect={member => {
                        updateField('memberNo', member.memberNo.toString());
                        setShowLookupModal(false);
                    }} />
            </Modal>

            <style>{`
                .div-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 12px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .div-table .ant-table-tbody > tr > td { padding: 4px 12px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .div-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default DividendPaymentForm;
