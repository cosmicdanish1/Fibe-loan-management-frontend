// components/ReceiptForm.tsx

import React, { useState, useEffect } from 'react';
import { ConfigProvider, Input, Select, Table, Modal, Spin } from 'antd';
import {
    Receipt, Save, RotateCcw, X, ShieldCheck, Building2,
    Users, Search, Plus, Trash2, FileText, Calendar,
    Banknote, IndianRupee,
} from 'lucide-react';
import dayjs from 'dayjs';
import { ReceiptHookReturn, ReceiptRow } from '../interfaces/ReceiptInterfaces';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { Option } = Select;
const { TextArea } = Input;

interface HeadCode { code: string; name: string; }

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const HEAD_CODES: Record<string, string> = {
    'A1002': 'RLN', 'A1047': 'ALN', 'I1002': 'OTH',
    'L1004': 'CD',  'L1002': 'MD',  'L1045': 'MD1',
    'L1001': 'SHR', 'I1008': 'OTH', 'I1001': 'OTH',
};

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const RECEIPT_TYPES = [
    { value: 'receipt', label: 'Receipt' },
    { value: 'general', label: 'General Receipt' },
    { value: 'demand', label: 'Demand Receipt' },
];

const ReceiptForm: React.FC<ReceiptHookReturn> = ({
    formData, totalAmount, bankHeads, lastSaved, isLoadingMember,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleCancel, handleExit,
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

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Code</span>,
            dataIndex: 'code', key: 'code', width: '22%',
            render: (text: string, record: ReceiptRow) => (
                <Select
                    value={text || undefined}
                    onChange={value => {
                        updateRow(record.id, 'code', value as string);
                        const head = headCodes.find(h => h.code === value);
                        if (head) updateRow(record.id, 'description', head.name);
                        if (HEAD_CODES[value as string]) updateRow(record.id, 'accType', HEAD_CODES[value as string]);
                    }}
                    placeholder="Select..."
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    loading={loadingHeads}
                    className="w-full rcpt-code-select"
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
                    className="h-6 fz-small font-black text-emerald-700 text-right bg-emerald-50/30 border-emerald-200 rounded" />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">RD Sr.No</span>,
            dataIndex: 'rdSrNo', key: 'rdSrNo', width: '14%',
            render: (text: string, record: ReceiptRow) => (
                <Input value={text} onChange={e => updateRow(record.id, 'rdSrNo', e.target.value)}
                    placeholder="RD ref..."
                    className="h-6 fz-small font-mono text-slate-600 bg-slate-50 border-slate-200 rounded" />
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

    const isGeneral = formData.receiptType === 'general';

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="rcpt-root h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="rcpt-header bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                                <Receipt size={13} className="text-white" />
                            </div>
                            <div>
                                <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Receipt</h1>
                                <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                    <ShieldCheck size={7} className="text-indigo-400" /> CR(R) + DR(P) → Ledger
                                </p>
                            </div>
                        </div>
                        {/* Receipt type tabs */}
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 gap-0.5">
                            {RECEIPT_TYPES.map(tab => (
                                <button key={tab.value} onClick={() => updateField('receiptType', tab.value)}
                                    className={`px-2.5 h-6 fz-mini font-black uppercase tracking-wide transition-all rounded-md ${
                                        formData.receiptType === tab.value
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleCancel} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
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
                                <button onClick={handleCancel} className="fz-mini font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                                    <RotateCcw size={9} /> New
                                </button>
                            </div>
                        )}

                        {/* ── Member + Month/Year ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Users size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Details</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="fz-tiny font-black text-slate-500 uppercase">Month</label>
                                    <Select value={formData.month} onChange={v => updateField('month', v)}
                                        className="w-20 rcpt-sm-select" style={{ height: 26 }}>
                                        {MONTHS.map(m => <Option key={m} value={m}>{m}</Option>)}
                                    </Select>
                                    <label className="fz-tiny font-black text-slate-500 uppercase">Year</label>
                                    <Select value={formData.year} onChange={v => updateField('year', v)}
                                        className="w-24 rcpt-sm-select" style={{ height: 26 }}>
                                        {Array.from({ length: 10 }, (_, i) => (dayjs().year() - 2 + i).toString()).map(y => (
                                            <Option key={y} value={y}>{y}</Option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div className="p-3">
                                <div className={`grid gap-x-4 ${formData.receiptType === 'receipt' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                    {/* Member No */}
                                    <div>
                                        <label className={labelCls}>Member No <span className="text-rose-500">*</span></label>
                                        <div className="flex gap-1">
                                            <div className="relative flex-1">
                                                <Users size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={formData.memberNo}
                                                    onChange={e => updateField('memberNo', e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'PageUp' && !isGeneral) { e.preventDefault(); setShowLookup(true); } }}
                                                    placeholder={isGeneral ? '0' : 'Member no…'}
                                                    disabled={isGeneral}
                                                    className={`${inputCls} pl-6 font-mono ${isGeneral ? 'opacity-50' : ''}`} />
                                            </div>
                                            <button onClick={() => !isGeneral && setShowLookup(true)} disabled={isGeneral}
                                                className={`h-7 w-7 rounded text-slate-500 flex items-center justify-center transition-colors shrink-0 ${isGeneral ? 'bg-slate-100 cursor-not-allowed opacity-50' : 'bg-slate-100 hover:bg-indigo-600 hover:text-white'}`}>
                                                <Search size={12} />
                                            </button>
                                        </div>
                                        {isLoadingMember && (
                                            <div className="flex items-center gap-1 mt-1"><Spin size="small" /><span className="fz-tiny text-slate-400">Loading…</span></div>
                                        )}
                                        {formData.memberName && !isLoadingMember && !isGeneral && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Users size={9} className="text-indigo-400" />
                                                <span className="fz-tiny font-black text-indigo-700">{formData.memberName}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Office */}
                                    <div>
                                        <label className={labelCls}>Office <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <Building2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input value={formData.officeNo} onChange={e => updateField('officeNo', e.target.value)}
                                                placeholder="Office No..." className={`${inputCls} pl-6`} />
                                        </div>
                                    </div>

                                    {/* Loan Balances (Receipt type only) */}
                                    {formData.receiptType === 'receipt' && (
                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                            <p className="fz-mini font-black text-slate-500 uppercase tracking-widest mb-1.5">Loan Balances</p>
                                            <div className="space-y-1">
                                                {[
                                                    { label: 'RLN Bal / Intt', bal: formData.rlnBal, intt: formData.rlnIntt },
                                                    { label: 'ELN Bal / Intt', bal: formData.elnBal, intt: formData.elnIntt },
                                                    { label: 'FLN Bal / Intt', bal: formData.flnBal, intt: formData.flnIntt },
                                                ].map(item => (
                                                    <div key={item.label} className="flex items-center justify-between">
                                                        <span className="fz-tiny font-bold text-slate-500 w-24">{item.label}</span>
                                                        <span className={`fz-tiny font-black w-16 text-right ${item.bal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                            {item.bal.toFixed(2)}
                                                        </span>
                                                        <span className={`fz-tiny font-black w-16 text-right ${item.intt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                            {item.intt.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-emerald-500 uppercase">Actual Amt</span>
                                        <span className="fz-tiny font-black text-emerald-700">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-slate-500 uppercase">{formData.modeOfPay === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className={`fz-tiny font-black ${(formData.bankBal || 0) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{(formData.bankBal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                                                <label className={labelCls}>Date</label>
                                                <Input value={formData.chequeDate ? dayjs(formData.chequeDate).format('DD-MMM-YY') : ''}
                                                    readOnly className={`${inputCls} bg-slate-50`} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Cheque No</label>
                                                <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                                    placeholder="Cheque No..." className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Bank</label>
                                                <Select value={formData.bankCode || undefined} onChange={v => updateField('bankCode', v)}
                                                    className="w-full rcpt-sm-select" style={{ height: 28 }} showSearch optionFilterProp="children">
                                                    {bankHeads.map(b => (
                                                        <Option key={b.code} value={b.code}>{b.code} — {b.name}</Option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Customer's Bank</label>
                                                <Input value={formData.customerBankName} onChange={e => updateField('customerBankName', e.target.value)}
                                                    placeholder="Customer bank..." className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Receipt Breakdown ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <FileText size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Receipt Breakdown</span>
                                </div>
                                <button onClick={addRow}
                                    className="h-6 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded fz-tiny font-black flex items-center gap-1 transition-colors">
                                    <Plus size={10} /> Add Row
                                </button>
                            </div>
                            <Table columns={columns} dataSource={formData.rows} pagination={false}
                                size="small" className="rcpt-table" rowKey="id" scroll={{ y: 180 }}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">Add rows using the button above</span> }}
                                rowClassName={record => record.code ? 'row-coded' : ''} />
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
                <div className="rcpt-footer px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Receipt</span>
                        {formData.memberName && !isGeneral && (
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
                .rcpt-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .rcpt-table .ant-table-tbody > tr > td { padding: 3px 8px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .rcpt-table .ant-table-tbody > tr.row-coded > td { background: #fefce8 !important; }
                .rcpt-code-select .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 10px !important; font-weight: 700 !important; }
                .rcpt-code-select .ant-select-selection-item { line-height: 22px !important; font-size: 10px !important; }
                .rcpt-code-select .ant-select-selection-placeholder { line-height: 22px !important; font-size: 9px !important; color: #94a3b8 !important; }
                .rcpt-sm-select .ant-select-selector { height: 26px !important; min-height: 26px !important; font-size: 10px !important; font-weight: 700 !important; padding: 0 8px !important; }
                .rcpt-sm-select .ant-select-selection-item { line-height: 24px !important; font-size: 10px !important; }
                .ant-select-selector { font-size: 11px !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }

                /* ── Dark mode ── */
                html.dark .rcpt-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .rcpt-header { background-image: none !important; background-color: #0c0c0e !important; border-bottom: 1px solid rgba(255,255,255,.08) !important; }
                html.dark .rcpt-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .rcpt-root .bg-slate-50,
                html.dark .rcpt-root .bg-slate-100 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .rcpt-root .border-slate-200,
                html.dark .rcpt-root .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .rcpt-root .border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
                html.dark .rcpt-root .bg-slate-300 { background-color: rgba(255,255,255,.08) !important; }
                html.dark .rcpt-root .text-slate-900,
                html.dark .rcpt-root .text-slate-800,
                html.dark .rcpt-root .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .rcpt-root .text-slate-600,
                html.dark .rcpt-root .text-slate-500 { color: #8e8e93 !important; }
                html.dark .rcpt-root .text-slate-400 { color: #71717a !important; }
                html.dark .rcpt-root label { color: #8e8e93 !important; }
                html.dark .rcpt-root .text-emerald-600,
                html.dark .rcpt-root .text-emerald-700,
                html.dark .rcpt-root .text-emerald-800,
                html.dark .rcpt-root .text-emerald-500 { color: #34d399 !important; }
                html.dark .rcpt-root .text-rose-500,
                html.dark .rcpt-root .text-rose-600 { color: #ff453a !important; }
                html.dark .rcpt-root .bg-emerald-50,
                html.dark .rcpt-root .bg-emerald-50\\/30 { background-color: rgba(52,211,153,.12) !important; }
                html.dark .rcpt-root .border-emerald-200,
                html.dark .rcpt-root .border-emerald-100 { border-color: rgba(52,211,153,.3) !important; }
                html.dark .rcpt-root .text-indigo-700,
                html.dark .rcpt-root .text-indigo-400 { color: #60a5fa !important; }
                /* toolbar tabs (receipt type) */
                html.dark .rcpt-header .bg-white\\/5 { background-color: rgba(255,255,255,.06) !important; }
                /* inactive white buttons */
                html.dark .rcpt-root button.bg-white { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                /* footer strip */
                html.dark .rcpt-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                /* antd inputs / selects */
                html.dark .rcpt-root .ant-input,
                html.dark .rcpt-root input.ant-input,
                html.dark .rcpt-root textarea.ant-input,
                html.dark .rcpt-root .ant-select-selector {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .rcpt-root .ant-select-selection-item,
                html.dark .rcpt-root .ant-select-selection-search-input { color: #f5f5f7 !important; }
                html.dark .rcpt-root .ant-select-selection-placeholder,
                html.dark .rcpt-root .ant-input::placeholder { color: #71717a !important; }
                html.dark .rcpt-root .ant-select-arrow { color: #8e8e93 !important; }
                html.dark .rcpt-root .ant-input[readonly] { background-color: rgba(255,255,255,.03) !important; color: #8e8e93 !important; }
                /* table */
                html.dark .rcpt-table .ant-table,
                html.dark .rcpt-table .ant-table-container { background-color: #1c1c1e !important; color: #f5f5f7 !important; }
                html.dark .rcpt-table .ant-table-thead > tr > th { background: #1c1c1e !important; color: #8e8e93 !important; border-bottom-color: rgba(255,255,255,.07) !important; }
                html.dark .rcpt-table .ant-table-tbody > tr > td { background-color: #1c1c1e !important; color: #f5f5f7 !important; border-bottom-color: rgba(255,255,255,.07) !important; }
                html.dark .rcpt-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,.05) !important; }
                html.dark .rcpt-table .ant-table-tbody > tr.row-coded > td { background: rgba(251,191,36,.10) !important; }
                html.dark .rcpt-table .ant-table-placeholder .ant-table-cell,
                html.dark .rcpt-table .ant-empty-description { background-color: #1c1c1e !important; color: #71717a !important; }
                html.dark .ant-select-dropdown { background-color: #1c1c1e !important; }
                html.dark .ant-select-dropdown .ant-select-item { color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown .ant-select-item-option-active { background-color: rgba(255,255,255,.08) !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ReceiptForm;
