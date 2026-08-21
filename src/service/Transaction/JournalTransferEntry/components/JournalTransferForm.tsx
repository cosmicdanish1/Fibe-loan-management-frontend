import React, { useState } from 'react';
import { ConfigProvider, Input, Modal, Table, Select } from 'antd';
import {
    ArrowLeftRight, FileText, Plus, RotateCcw, Save,
    Search, ShieldCheck, Trash2, X, Hash, Building2, Calendar,
} from 'lucide-react';
import { JournalTransferHookReturn, JournalEntry } from '../interface/JournalTransferInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const JournalTransferForm: React.FC<JournalTransferHookReturn> = ({
    formData,
    totalDebit,
    totalCredit,
    data,
    isLoading,
    voucherList,
    headList,
    memberList,
    updateField,
    updateRow,
    addRow,
    removeRow,
    handleVoucherSelect,
    handleSave,
    handleReset,
    handleExit,
}) => {
    const [showLookupModal, setShowLookupModal] = useState(false);
    const [lookupRowKey, setLookupRowKey] = useState<string | null>(null);

    const imbalance = totalDebit - totalCredit;
    const isBalanced = Math.abs(imbalance) < 0.01;

    const getMemberDisplayName = (member: any) => (
        member?.memberName ||
        member?.fullname ||
        member?.name ||
        [member?.firstName, member?.middleName, member?.lastName].filter(Boolean).join(' ') ||
        [member?.f_name, member?.m_name, member?.l_name].filter(Boolean).join(' ') ||
        ''
    ).trim();

    const handleMemberSelect = (member: any) => {
        if (!lookupRowKey) return;
        updateRow(lookupRowKey, 'mbno', member.memberNo.toString());
        updateRow(lookupRowKey, 'name', getMemberDisplayName(member));
        setShowLookupModal(false);
        setLookupRowKey(null);
    };

    const fetchMemberName = async (key: string, mbno: string) => {
        if (!mbno) return;
        try {
            const res = await apiService.getMemberDetails(mbno);
            if (res.success && res.data) {
                updateRow(key, 'name', getMemberDisplayName(res.data) || 'Not Found');
            } else {
                updateRow(key, 'name', 'Not Found');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const isMemberMode = formData.transferType === 'memberToMember';

    const columns = [
        ...(isMemberMode ? [
            {
                title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">MBNO</span>,
                dataIndex: 'mbno',
                key: 'mbno',
                width: '10%',
                render: (text: string) => (
                    <span className="fz-small font-black text-indigo-600 font-mono">{text || '—'}</span>
                ),
            },
            {
                title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Name</span>,
                dataIndex: 'name',
                key: 'name',
                width: '15%',
                render: (text: string) => (
                    <span className="fz-small font-semibold text-slate-600 truncate block max-w-full" title={text}>{text || '—'}</span>
                ),
            },
        ] : []),
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Code</span>,
            dataIndex: 'code',
            key: 'code',
            width: isMemberMode ? '10%' : '12%',
            render: (text: string, record: JournalEntry) => (
                <Select
                    showSearch
                    value={text || undefined}
                    onChange={(val: string) => updateRow(record.key, 'code', val)}
                    placeholder="Code"
                    className="w-full jte2-sel"
                    style={{ height: 24 }}
                    optionFilterProp="label"
                    optionLabelProp="value"
                    options={headList.map(h => ({ value: h.code, label: `${h.code} ${h.name}` }))}
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Name</span>,
            dataIndex: 'accountName',
            key: 'accountName',
            width: isMemberMode ? '15%' : '25%',
            render: (text: string, record: JournalEntry) => (
                <Select
                    showSearch
                    value={record.code || undefined}
                    onChange={(val: string) => updateRow(record.key, 'code', val)}
                    placeholder="Account name..."
                    className="w-full jte2-sel"
                    style={{ height: 24 }}
                    optionFilterProp="label"
                    optionLabelProp="name"
                    options={headList.map(h => ({ value: h.code, name: h.name, label: `${h.name} [${h.code}]` } as any))}
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-rose-600 uppercase tracking-wide">Debit</span>,
            dataIndex: 'debit',
            key: 'debit',
            width: '12%',
            align: 'right' as const,
            render: (val: string, record: JournalEntry) => (
                <Input
                    value={val}
                    onChange={e => updateRow(record.key, 'debit', e.target.value)}
                    placeholder="0.00"
                    className="jte2-cell-input jte2-debit text-right"
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-emerald-600 uppercase tracking-wide">Credit</span>,
            dataIndex: 'credit',
            key: 'credit',
            width: '12%',
            align: 'right' as const,
            render: (val: string, record: JournalEntry) => (
                <Input
                    value={val}
                    onChange={e => updateRow(record.key, 'credit', e.target.value)}
                    placeholder="0.00"
                    className="jte2-cell-input jte2-credit text-right"
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">RD / SD Sr No</span>,
            dataIndex: 'rdSdSrNo',
            key: 'rdSdSrNo',
            width: '13%',
            render: (text: string, record: JournalEntry) => (
                <Input
                    value={text}
                    onChange={e => updateRow(record.key, 'rdSdSrNo', e.target.value)}
                    placeholder="Ref..."
                    className="jte2-cell-input font-mono"
                />
            ),
        },
        {
            title: '',
            key: 'actions',
            width: '4%',
            align: 'center' as const,
            render: (_: any, record: JournalEntry) => (
                <button type="button" onClick={() => removeRow(record.key)}
                    className="h-6 w-6 flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500 rounded transition-colors">
                    <Trash2 size={11} />
                </button>
            ),
        },
    ];

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Post',
        saveEnabled: !(isLoading || !isBalanced || totalDebit <= 0),
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <ArrowLeftRight size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Journal / Transfer Entry</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Double Entry Ledger
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} disabled={isLoading}
                            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide disabled:opacity-50">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isLoading || !isBalanced || totalDebit <= 0}
                            className={`h-7 px-3 rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 shadow-lg uppercase tracking-wide border ${
                                isBalanced && totalDebit > 0
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                                    : 'bg-slate-600/50 text-slate-300 border-slate-500/50 cursor-not-allowed'
                            } disabled:opacity-60`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Posting…' : 'Post'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit}
                            className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-6xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Voucher Info + Transfer Type ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Hash size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Journal Entry</span>
                                </div>
                                <div className="flex items-center gap-1 text-indigo-400">
                                    <Calendar size={9} />
                                    <span className="fz-mini font-black text-indigo-500 uppercase">{dayjs().format('DD-MMM-YY')}</span>
                                </div>
                            </div>
                            <div className="p-3">
                                {/* Row 1: Voucher No + Totals + Balance */}
                                <div className="flex items-end gap-4 mb-3">
                                    <div className="w-56 shrink-0">
                                        <label className={labelCls}>Voucher No.</label>
                                        <Select
                                            showSearch
                                            allowClear
                                            value={formData.voucherNo || undefined}
                                            onChange={v => handleVoucherSelect(v || '')}
                                            placeholder="Select existing voucher..."
                                            className="w-full h-7 fz-caption"
                                            optionFilterProp="label"
                                            options={voucherList.map(v => ({
                                                value: v.voucherNo,
                                                label: `${v.voucherNo} — ${v.memberName || 'N/A'} | ₹${v.amount?.toLocaleString('en-IN') || '0'}`,
                                            }))}
                                        />
                                    </div>

                                    {/* Totals + Balance */}
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="flex-1 h-7 flex items-center justify-between px-3 bg-rose-50 border border-rose-200 rounded-lg">
                                            <span className="fz-mini font-black text-rose-400 uppercase tracking-wide">Total Debit</span>
                                            <span className="fz-label font-black text-rose-600 font-mono">₹{totalDebit.toFixed(2)}</span>
                                        </div>
                                        <div className="flex-1 h-7 flex items-center justify-between px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <span className="fz-mini font-black text-emerald-400 uppercase tracking-wide">Total Credit</span>
                                            <span className="fz-label font-black text-emerald-600 font-mono">₹{totalCredit.toFixed(2)}</span>
                                        </div>
                                        <div className={`h-7 px-3 flex items-center justify-center rounded-lg border fz-tiny font-black uppercase tracking-wide min-w-28 ${
                                            isBalanced
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : 'bg-rose-50 border-rose-200 text-rose-600'
                                        }`}>
                                            {isBalanced ? '✓ Balanced' : `Diff ₹${Math.abs(imbalance).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Transfer Type toggle */}
                                <div>
                                    <label className={labelCls}>Transfer Type</label>
                                    <div className="flex gap-2">
                                        {([
                                            { val: 'headToHead', label: 'Head-To-Head Transfer' },
                                            { val: 'memberToMember', label: 'Member-To-Member Transfer' },
                                        ] as const).map(opt => (
                                            <button key={opt.val} onClick={() => updateField('transferType', opt.val)}
                                                className={`h-7 px-4 rounded-lg fz-tiny font-black uppercase tracking-wide transition-all border ${
                                                    formData.transferType === opt.val
                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                        : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                                }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Ledger Matrix Table ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <FileText size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Ledger Matrix</span>
                                    <span className="fz-mini font-black text-slate-400 uppercase ml-2">{data.length} row(s)</span>
                                </div>
                                <button type="button" onClick={addRow}
                                    className="h-6 px-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded fz-mini font-black uppercase tracking-wide flex items-center gap-1 transition-colors border border-emerald-200">
                                    <Plus size={10} /> Add Row
                                </button>
                            </div>
                            <Table
                                columns={columns}
                                dataSource={data}
                                pagination={false}
                                rowKey="key"
                                size="small"
                                className="jte2-table"
                                scroll={{ y: 'calc(100vh - 390px)' }}
                                locale={{ emptyText: (
                                    <div className="py-6 text-center">
                                        <p className="fz-tiny font-black text-slate-400 uppercase tracking-wide">No rows yet</p>
                                        <button onClick={addRow} className="mt-2 fz-tiny font-black text-indigo-500 hover:text-indigo-700 uppercase flex items-center gap-1 mx-auto">
                                            <Plus size={10} /> Add First Row
                                        </button>
                                    </div>
                                )}}
                            />
                        </div>

                        {/* ── Narration + Cheque ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Narration & Cheque</span>
                            </div>
                            <div className="p-3 grid grid-cols-[1fr_220px] gap-4 items-start">
                                <div>
                                    <label className={labelCls}>Narration</label>
                                    <TextArea value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                        placeholder="Enter narration…" rows={2}
                                        className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                                </div>
                                <div>
                                    <label className={labelCls}>Cheque No.</label>
                                    <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                        placeholder="Cheque no..." className={`${inputCls} font-mono`} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Journal / Transfer Entry</span>
                        {formData.voucherNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Voucher: {formData.voucherNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`fz-mini font-black uppercase tracking-wide px-2 py-0.5 rounded ${
                            isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                            {isBalanced ? 'Balanced' : 'Pending Balance'}
                        </span>
                        <span className="fz-mini font-black text-slate-400 uppercase">{formData.transferType === 'headToHead' ? 'Head-To-Head' : 'Member-To-Member'}</span>
                    </div>
                </div>

            </div>

            {/* Member Lookup Modal */}
            <Modal open={showLookupModal} onCancel={() => { setShowLookupModal(false); setLookupRowKey(null); }}
                footer={null} width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onClose={() => { setShowLookupModal(false); setLookupRowKey(null); }} onSelect={handleMemberSelect} />
            </Modal>

            <style>{`
                .jte2-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 8px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .jte2-table .ant-table-tbody > tr > td { padding: 3px 6px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .jte2-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
                .jte2-cell-input { height: 26px !important; min-height: 26px !important; border-radius: 5px !important; border-color: #e2e8f0 !important; background: #f8fafc !important; font-size: 10px !important; font-weight: 700 !important; padding: 2px 6px !important; }
                .jte2-cell-input:focus, .jte2-cell-input:hover { border-color: #818cf8 !important; background: #fff !important; }
                .jte2-debit { color: #e11d48 !important; background: #fff1f2 !important; border-color: #fecdd3 !important; font-weight: 900 !important; }
                .jte2-credit { color: #047857 !important; background: #ecfdf5 !important; border-color: #bbf7d0 !important; font-weight: 900 !important; }
                .jte2-sel .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 10px !important; font-weight: 700 !important; border-radius: 5px !important; background: #f8fafc !important; border-color: #e2e8f0 !important; }
                .jte2-sel .ant-select-selection-item { line-height: 22px !important; font-size: 10px !important; }
                .jte2-sel .ant-select-selection-search-input { font-size: 10px !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default JournalTransferForm;
