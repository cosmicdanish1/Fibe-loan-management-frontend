// components/VoucherPaymentForm.tsx

import React, { useState, useEffect } from 'react';
import { ConfigProvider, Input, Table, Select, Modal, DatePicker } from 'antd';
import {
    CreditCard, Save, RotateCcw, X, ShieldCheck, Building2,
    Hash, Users, Search, Plus, Trash2, FileText, Calendar,
    IndianRupee, Banknote,
} from 'lucide-react';
import dayjs from 'dayjs';
import { VoucherPaymentHookReturn, ReceiptRow } from '../interface/VoucherPaymentInterfaces';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { apiService } from '../../../../../services/api';

interface HeadCode { code: string; name: string; }

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const VoucherPaymentForm: React.FC<VoucherPaymentHookReturn> = ({
    formData, totalAmount, bankAccounts, accountBalance, lastSaved,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading,
}) => {
    const [showLookup, setShowLookup] = useState(false);
    const [headCodes, setHeadCodes] = useState<HeadCode[]>([]);
    const [loadingHeads, setLoadingHeads] = useState(false);

    useEffect(() => {
        const fetchHeadCodes = async () => {
            setLoadingHeads(true);
            try {
                const response = await apiService.getHeadList();
                if (response.success && response.data) setHeadCodes(response.data);
            } catch (error) {
                console.error('Failed to fetch head codes:', error);
            } finally {
                setLoadingHeads(false);
            }
        };
        fetchHeadCodes();
    }, []);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || member.mbno || '');
        const memberName = member.memberName || member.fullname || '';
        const officeNo = member.officeNo?.toString() || '';
        handleMemberSelect(memberNo, { memberNo, memberName, officeNo });
        setShowLookup(false);
    };

    const paymentTypeButtons = [
        { value: 'payment', label: 'Payment' },
        { value: 'general', label: 'General Payment' },
    ];

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Code</span>,
            dataIndex: 'code', key: 'code', width: '22%',
            render: (text: string, record: ReceiptRow) => (
                <Select
                    value={text || undefined}
                    onChange={value => {
                        updateRow(record.id, 'code', value);
                        const head = headCodes.find(h => h.code === value);
                        if (head) updateRow(record.id, 'description', head.name);
                        // acc_type is derived authoritatively on the backend from ledger history.
                    }}
                    placeholder="Select..."
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    loading={loadingHeads}
                    className="w-full vp-code-select"
                    size="small"
                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Name / Description</span>,
            dataIndex: 'description', key: 'description',
            render: (text: string, record: ReceiptRow) => (
                <Input value={text} onChange={e => updateRow(record.id, 'description', e.target.value)}
                    placeholder="Description..."
                    className="h-6 fz-small font-semibold bg-white border-slate-200 rounded" />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Amount</span>,
            dataIndex: 'amount', key: 'amount', width: '18%',
            render: (text: string, record: ReceiptRow) => (
                <Input type="number" value={text} onChange={e => updateRow(record.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="h-6 fz-small font-black text-indigo-700 text-right bg-indigo-50/30 border-indigo-200 rounded" />
            ),
        },
        {
            title: '', key: 'action', width: '5%', align: 'center' as const,
            render: (_: any, record: ReceiptRow) => (
                <button onClick={() => removeRow(record.id)}
                    className="p-0.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded transition-all">
                    <Trash2 size={11} />
                </button>
            ),
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <CreditCard size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Voucher Payment</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Ledger Entry (D)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Payment type tabs */}
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 gap-0.5 mr-2">
                            {paymentTypeButtons.map(btn => (
                                <button key={btn.value} onClick={() => updateField('paymentType', btn.value)}
                                    className={`px-2.5 h-6 fz-mini font-black uppercase tracking-wide transition-all rounded-md ${
                                        formData.paymentType === btn.value
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    }`}>
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleClear} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Saving…' : 'Save'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-5xl mx-auto p-3 pb-4 space-y-2">

                        {/* Last saved banner */}
                        {lastSaved && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Save size={12} className="text-emerald-600" />
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Voucher</span>
                                            <p className="fz-small font-black text-emerald-800">{lastSaved.voucherNo}</p>
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Member</span>
                                            <p className="fz-small font-bold text-emerald-800">{lastSaved.memberNo}</p>
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Amount</span>
                                            <p className="fz-small font-black text-emerald-800">₹{lastSaved.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleClear} className="fz-mini font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                                    <RotateCcw size={9} /> New
                                </button>
                            </div>
                        )}

                        {/* ── Voucher Info + Member ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Hash size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Voucher & Member</span>
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4">
                                <div>
                                    <label className={labelCls}>Voucher No</label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)}
                                            placeholder="Auto..."
                                            className={`${inputCls} pl-6 font-mono font-bold text-indigo-700`} />
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
                                <div>
                                    <label className={labelCls}>Member No {formData.paymentType !== 'general' && <span className="text-rose-500">*</span>}</label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input value={formData.memberNo}
                                                onChange={e => updateField('memberNo', e.target.value)}
                                                onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookup(true); } }}
                                                placeholder="Member no…"
                                                className={`${inputCls} pl-6 font-mono`} />
                                        </div>
                                        <button onClick={() => setShowLookup(true)}
                                            className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                            <Search size={12} />
                                        </button>
                                    </div>
                                    {formData.memberName && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Users size={9} className="text-indigo-400" />
                                            <span className="fz-tiny font-black text-indigo-700">{formData.memberName}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className={labelCls}>Sub Division <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Building2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={formData.subDivision} onChange={e => updateField('subDivision', e.target.value)}
                                            placeholder="Office..."
                                            className={`${inputCls} pl-6`} />
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
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-indigo-500 uppercase">Actual Amt</span>
                                        <span className="fz-tiny font-black text-indigo-700">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-slate-500 uppercase">{formData.modeOfPay === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className={`fz-tiny font-black ${accountBalance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{accountBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="flex gap-2">
                                    {['cash', 'bank'].map(mode => (
                                        <button key={mode} onClick={() => updateField('modeOfPay', mode)}
                                            className={`h-7 px-4 rounded-lg fz-tiny font-black uppercase tracking-wide transition-all border ${
                                                formData.modeOfPay === mode
                                                    ? mode === 'cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                            }`}>
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {formData.modeOfPay === 'bank' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="fz-mini font-black text-slate-500 uppercase tracking-widest mb-2">Cheque Details</p>
                                        <div className="grid grid-cols-4 gap-x-4">
                                            <div>
                                                <label className={labelCls}>Receive Into A/C</label>
                                                <Select value={formData.receiveIntoCode || 'A1001'}
                                                    onChange={val => updateField('receiveIntoCode', val)}
                                                    showSearch optionFilterProp="label" size="small" className="w-full"
                                                    options={bankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque Date</label>
                                                <DatePicker
                                                    value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                                    onChange={d => updateField('chequeDate', d ? d.format('YYYY-MM-DD') : '')}
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

                        {/* ── Transaction Breakdown ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <FileText size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Transaction Breakdown</span>
                                </div>
                                <button onClick={addRow}
                                    className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded fz-tiny font-black flex items-center gap-1 transition-colors">
                                    <Plus size={10} /> Add Row
                                </button>
                            </div>
                            <Table
                                columns={columns}
                                dataSource={formData.rows}
                                pagination={false}
                                size="small"
                                className="vp-table"
                                rowKey="id"
                                scroll={{ y: 200 }}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">Add rows using the button above</span> }}
                                rowClassName={record => record.code ? 'row-coded' : ''}
                            />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Voucher Payment</span>
                        {formData.memberName && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">{formData.memberName}</span>
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
            <Modal open={showLookup} onCancel={() => setShowLookup(false)} footer={null}
                width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>

            <style>{`
                .vp-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .vp-table .ant-table-tbody > tr > td { padding: 3px 8px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .vp-table .ant-table-tbody > tr.row-coded > td { background: #fefce8 !important; }
                .vp-code-select .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 10px !important; font-family: 'Courier New', monospace !important; font-weight: 700 !important; }
                .vp-code-select .ant-select-selection-item { line-height: 22px !important; font-size: 10px !important; }
                .vp-code-select .ant-select-selection-placeholder { line-height: 22px !important; font-size: 9px !important; color: #94a3b8 !important; }
                .ant-select-selector { font-size: 11px !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default VoucherPaymentForm;
