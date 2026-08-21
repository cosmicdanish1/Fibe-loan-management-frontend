import React from 'react';
import { ConfigProvider, DatePicker, Input, Modal, Select, Table } from 'antd';
import {
    ArrowRightLeft, Calendar, Landmark, RotateCcw, Save,
    Search, ShieldCheck, X, FileText, IndianRupee, Hash, Building2,
} from 'lucide-react';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { FDWithdrawalHookReturn } from '../interface/FDWithdrawalInterestPaymentInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";
const roInputCls = "h-7 fz-caption font-semibold bg-slate-50 border-slate-200 rounded text-slate-600";

const FDWithdrawalInterestPaymentForm: React.FC<FDWithdrawalHookReturn> = ({
    formData,
    actualAmount,
    bankBalance,
    bankAccounts,
    data,
    updateField,
    handleSave,
    handleReset,
    handleExit,
    showLookupModal,
    setShowLookupModal,
    fetchMemberFDs,
    loading,
}) => {
    const handleMemberSelect = (member: any) => {
        updateField('memberNo', member.memberNo.toString());
        fetchMemberFDs?.(member.memberNo.toString());
        setShowLookupModal?.(false);
    };

    const detailRows: [string, string, string][] = [
        ['Cert. No.', formData.fdCertNo, 'fdCertNo'],
        ['Deposit Date', formData.depositDate, 'depositDate'],
        ['Rate', formData.rate, 'rate'],
        ['Deposit Unit', formData.depositUnit, 'depositUnit'],
        ['Dep. Period', formData.depPer, 'depPer'],
        ['Maturity Date', formData.maturityDate, 'maturityDate'],
        ['FD Interest', formData.fdInterest, 'fdInterest'],
        ['Last Int Paid', formData.lastIntPaidDate, 'lastIntPaidDate'],
        ['FD Amount', formData.fdAmount, 'fdAmount'],
        ['Interest Paid', formData.interestPaid, 'interestPaid'],
        ['Int Pay Mode', formData.intPaymentMode, 'intPaymentMode'],
        ['Maturity Amt', formData.maturityAmount, 'maturityAmount'],
    ];

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">AcNo</span>,
            dataIndex: 'acNo', key: 'acNo', width: '16%',
            render: (t: string) => <span className="fz-small font-mono font-bold text-slate-700">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">CertNo</span>,
            dataIndex: 'certNo', key: 'certNo', width: '16%',
            render: (t: string) => <span className="fz-small font-mono font-bold text-indigo-700">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Amount</span>,
            dataIndex: 'amount', key: 'amount', width: '18%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-bold text-slate-700">₹{Number(v || 0).toFixed(2)}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Rate</span>,
            dataIndex: 'rate', key: 'rate', width: '12%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-bold text-indigo-600">{v}%</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Last Pay Date</span>,
            dataIndex: 'lastPayDate', key: 'lastPayDate', width: '22%',
            render: (t: string) => <span className="fz-small font-mono text-slate-600">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Interest</span>,
            dataIndex: 'interest', key: 'interest', width: '16%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-black text-emerald-600">₹{Number(v || 0).toFixed(2)}</span>,
        },
    ];

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: loading ? 'Saving…' : 'Save',
        saveEnabled: !loading,
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <ArrowRightLeft size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">FD Withdrawal / Int. Payment</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Fixed Deposit Settlement
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* FD Option pill tabs */}
                        <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20 mr-2">
                            {(['interest', 'payment'] as const).map(opt => (
                                <button key={opt} onClick={() => updateField('fdOption', opt)}
                                    className={`h-6 px-3 rounded-md fz-mini font-black uppercase tracking-wide transition-all ${
                                        formData.fdOption === opt ? 'bg-white text-slate-800 shadow' : 'text-white/70 hover:text-white'
                                    }`}>
                                    {opt === 'interest' ? 'FD Interest' : 'FD Payment'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                if (!formData.memberNo) return;
                                if ((window as any).electronAPI?.openNewWindow) {
                                    (window as any).electronAPI.openNewWindow(`/masters/signature-scanning?member=${formData.memberNo}`);
                                }
                            }}
                            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            Sign
                        </button>
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={loading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {loading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {loading ? 'Saving…' : 'Save'}
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

                        {/* ── Top row: Voucher Scope + FD Details ── */}
                        <div className="grid grid-cols-2 gap-2">

                            {/* Voucher Scope */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Hash size={11} className="text-slate-400" />
                                        <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Voucher Scope</span>
                                    </div>
                                    <DatePicker value={formData.transDate ? dayjs(formData.transDate) : null}
                                        onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY" allowClear={false} size="small"
                                        suffixIcon={<Calendar size={9} className="text-indigo-400" />} style={{ width: 120 }} />
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="grid grid-cols-2 gap-x-3">
                                        <div>
                                            <label className={labelCls}>Voucher No.</label>
                                            <Input value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)}
                                                placeholder="Auto..." className={`${inputCls} font-mono`} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Office No</label>
                                            <Input value={formData.officeNo} onChange={e => updateField('officeNo', e.target.value)}
                                                placeholder="Office..." className={inputCls} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Member No. <span className="text-rose-500">*</span></label>
                                        <div className="flex gap-1">
                                            <Input value={formData.memberNo}
                                                onChange={e => updateField('memberNo', e.target.value)}
                                                onPressEnter={() => fetchMemberFDs?.(formData.memberNo)}
                                                placeholder="Enter member no..." className={`${inputCls} font-mono flex-1`} />
                                            <button onClick={() => setShowLookupModal?.(true)}
                                                className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 rounded flex items-center justify-center transition-colors shrink-0">
                                                <Search size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Cert. No. <span className="text-rose-500">*</span></label>
                                        <Select value={formData.certNo || undefined}
                                            onChange={val => updateField('certNo', val)}
                                            className="w-full fdw2-sel" style={{ height: 28 }}
                                            placeholder="Select certificate..." allowClear>
                                            {data.map(row => <Option key={row.certNo} value={row.certNo}>{row.certNo}</Option>)}
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* FD Details */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                    <FileText size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">FD Details</span>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {detailRows.map(([label, value, field]) => (
                                        <div key={field}>
                                            <label className={labelCls}>{label}</label>
                                            <Input value={value} readOnly className={roInputCls} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Mode of Payment ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <IndianRupee size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Mode of Payment</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-indigo-500 uppercase">Actual Amt</span>
                                        <span className="fz-tiny font-black text-indigo-700">₹{actualAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-emerald-500 uppercase">{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className="fz-tiny font-black text-emerald-700">₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                                        <div className="grid grid-cols-3 gap-x-4">
                                            <div>
                                                <label className={labelCls}>Date</label>
                                                <DatePicker
                                                    value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                                    onChange={date => updateField('chequeDate', date)}
                                                    format="DD-MMM-YYYY"
                                                    className="w-full h-7 fz-caption fdw2-dp" />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque No</label>
                                                <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                                    placeholder="Cheque no..." className={`${inputCls} font-mono`} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Pay From A/C</label>
                                                <Select value={formData.bankCode || undefined}
                                                    onChange={val => updateField('bankCode', val)}
                                                    className="w-full fdw2-sel" style={{ height: 28 }}
                                                    placeholder="Select bank..." showSearch optionFilterProp="children" allowClear>
                                                    {bankAccounts.map(b => <Option key={b.code} value={b.code}>{b.code} — {b.name}</Option>)}
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Deposit Control Ledger ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Landmark size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Deposit Control Ledger</span>
                                </div>
                                <span className="fz-mini font-black text-slate-400 uppercase">{data.length} record(s)</span>
                            </div>
                            <Table
                                columns={columns}
                                dataSource={data}
                                rowKey="key"
                                size="small"
                                pagination={false}
                                className="fdw2-table"
                                scroll={{ y: 180 }}
                                loading={loading}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">No FD records loaded</span> }}
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
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">FD Withdrawal / Int. Payment</span>
                        {formData.memberNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Member: {formData.memberNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`fz-mini font-black uppercase tracking-wide px-2 py-0.5 rounded ${
                            formData.fdOption === 'interest' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            {formData.fdOption === 'interest' ? 'Interest Payout' : 'FD Payment'}
                        </span>
                        <div className="flex items-center gap-1 text-indigo-500">
                            <Calendar size={9} />
                            <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Member Lookup Modal */}
            <Modal open={showLookupModal} onCancel={() => setShowLookupModal?.(false)} footer={null}
                width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onClose={() => setShowLookupModal?.(false)} onSelect={handleMemberSelect} />
            </Modal>

            <style>{`
                .fdw2-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .fdw2-table .ant-table-tbody > tr > td { padding: 4px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .fdw2-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
                .fdw2-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 11px !important; font-weight: 600 !important; }
                .fdw2-sel .ant-select-selection-item { line-height: 26px !important; }
                .fdw2-dp .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default FDWithdrawalInterestPaymentForm;
