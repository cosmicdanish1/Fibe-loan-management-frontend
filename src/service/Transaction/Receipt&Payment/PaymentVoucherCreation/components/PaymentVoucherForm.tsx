// components/PaymentVoucherForm.tsx

import React, { useState, useEffect } from 'react';
import { ConfigProvider, Input, Table, Select, Modal, DatePicker } from 'antd';
import { RotateCcw, Save, X, Search, Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { PaymentVoucherHookReturn, RowData } from '../interface/PaymentVoucherInterfaces';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { TextArea } = Input;

interface HeadCode { code: string; name: string; }

const PaymentVoucherForm: React.FC<PaymentVoucherHookReturn> = ({
    formData, rows, totalAmount, payFromAccounts,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading, lastSaved,
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
            title: 'Code',
            dataIndex: 'code', key: 'code', width: '22%',
            render: (text: string, record: RowData) => (
                <Select
                    value={text || undefined}
                    onChange={value => {
                        updateRow(record.id, 'code', value);
                        const head = headCodes.find(h => h.code === value);
                        if (head) updateRow(record.id, 'name', head.name);
                    }}
                    placeholder="Select..."
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    loading={loadingHeads}
                    className="w-full pvc-code-select"
                    size="small"
                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                />
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name', key: 'name',
            render: (text: string, record: RowData) => (
                <Input value={text} onChange={e => updateRow(record.id, 'name', e.target.value)}
                    placeholder="Description..."
                    size="small" />
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount', key: 'amount', width: '18%',
            render: (text: string, record: RowData) => (
                <Input type="number" value={text} onChange={e => updateRow(record.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    size="small"
                    style={{ textAlign: 'right' }} />
            ),
        },
        {
            title: 'RD Sr.No',
            dataIndex: 'rdSrNo', key: 'rdSrNo', width: '15%',
            render: (text: string, record: RowData) => (
                <Input value={text} onChange={e => updateRow(record.id, 'rdSrNo', e.target.value)}
                    placeholder="RD ref..."
                    size="small" />
            ),
        },
        {
            title: '',
            key: 'action', width: '5%', align: 'center' as const,
            render: (_: any, record: RowData) => (
                <button onClick={() => removeRow(record.id)}
                    className="text-red-500 hover:text-red-700 transition-colors">
                    <Trash2 size={13} />
                </button>
            ),
        },
    ];

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#1e40af', borderRadius: 3, fontSize: 12 } }}>
            <div className="pvc-root h-screen flex flex-col bg-white font-sans overflow-hidden text-gray-800">

                {/* ── Title bar ── */}
                <div className="pvc-header bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-lg">
                    <span className="fz-body font-semibold text-white">Voucher Creation</span>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleClear}
                            className="flex items-center gap-1 px-3 py-1 fz-caption bg-white/10 border border-white/20 hover:bg-white/20 rounded text-slate-200 transition-colors">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1 fz-caption bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 rounded transition-colors disabled:opacity-60">
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={handleExit}
                            className="flex items-center gap-1 px-3 py-1 fz-caption bg-white/10 border border-white/20 hover:bg-red-500/20 hover:border-red-400 hover:text-red-300 rounded text-slate-200 transition-colors">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-auto p-3">

                    {/* Saved success banner */}
                    {lastSaved && (
                        <div className="mb-2 p-2 bg-green-50 border border-green-300 rounded fz-caption text-green-700 flex items-center justify-between">
                            <span>
                                Saved — Voucher <strong>{lastSaved.voucherNo}</strong> &nbsp;|&nbsp;
                                Member <strong>{lastSaved.memberNo}</strong> &nbsp;|&nbsp;
                                Amount <strong>₹{lastSaved.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <button onClick={handleClear} className="text-green-600 hover:text-green-800 flex items-center gap-0.5 fz-small">
                                <RotateCcw size={9} /> New
                            </button>
                        </div>
                    )}

                    {/* ── Row 1: Voucher No + Trans Date + Payment Type ── */}
                    <div className="border border-gray-300 bg-gray-50 rounded p-2 mb-2">
                        <div className="flex items-center gap-6 flex-wrap">
                            {/* Voucher No */}
                            <div className="flex items-center gap-2">
                                <label className="fz-label text-gray-600 whitespace-nowrap">Voucher No.</label>
                                <Input
                                    value={formData.voucherNo}
                                    onChange={e => updateField('voucherNo', e.target.value)}
                                    placeholder="Auto..."
                                    size="small"
                                    style={{ width: 120, fontFamily: 'monospace', fontWeight: 600 }}
                                />
                            </div>

                            {/* Trans Date */}
                            <div className="flex items-center gap-2">
                                <label className="fz-label text-gray-600 whitespace-nowrap">Trans Date :</label>
                                <DatePicker
                                    value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YYYY"
                                    allowClear={false}
                                    size="small"
                                    style={{ width: 140 }}
                                />
                            </div>

                            {/* Pay From (cash / bank account credited) */}
                            <div className="flex items-center gap-2">
                                <label className="fz-label text-gray-600 whitespace-nowrap">Pay From :</label>
                                <Select
                                    value={formData.payFromCode || 'A1001'}
                                    onChange={val => updateField('payFromCode', val)}
                                    showSearch
                                    optionFilterProp="label"
                                    size="small"
                                    style={{ width: 240 }}
                                    options={payFromAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))}
                                />
                            </div>

                            {/* Payment Type radio */}
                            <div className="flex items-center gap-4 ml-auto">
                                {[
                                    { value: 'payment', label: 'Payment' },
                                    { value: 'general', label: 'General Payment' },
                                ].map(opt => (
                                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer fz-label text-gray-700 select-none">
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value={opt.value}
                                            checked={formData.paymentType === opt.value}
                                            onChange={() => updateField('paymentType', opt.value)}
                                            className="accent-blue-700"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Member No + Office No ── */}
                    <div className="border border-gray-300 bg-gray-50 rounded p-2 mb-2">
                        <div className="flex items-start gap-6 flex-wrap">
                            {/* Member No */}
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <label className="fz-label text-gray-600 whitespace-nowrap">
                                        Member No. <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-1">
                                        <Input
                                            value={formData.memberNo}
                                            onChange={e => updateField('memberNo', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookup(true); } }}
                                            size="small"
                                            style={{ width: 160, fontFamily: 'monospace', fontWeight: 600 }}
                                        />
                                        <button onClick={() => setShowLookup(true)}
                                            className="h-[22px] w-[22px] flex items-center justify-center bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 rounded transition-colors text-gray-500 hover:text-blue-700">
                                            <Search size={11} />
                                        </button>
                                    </div>
                                </div>
                                <p className="fz-small text-gray-400">(For List Press PgUp Key)</p>
                                {formData.memberName && (
                                    <p className="fz-caption font-bold text-blue-700 mt-0.5">{formData.memberName}</p>
                                )}
                            </div>

                            {/* Office No */}
                            <div className="flex items-center gap-2">
                                <label className="fz-label text-gray-600 whitespace-nowrap">Office No</label>
                                <Input
                                    value={formData.officeNo}
                                    onChange={e => updateField('officeNo', e.target.value)}
                                    size="small"
                                    style={{ width: 80 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Total Amount ── */}
                    <div className="flex items-center justify-end mb-1 pr-1">
                        <span className="fz-label text-gray-600 mr-2">Total Amount</span>
                        <span className="fz-body font-black text-blue-800 min-w-[80px] text-right">
                            {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button onClick={addRow}
                            className="ml-4 flex items-center gap-1 px-2 py-0.5 fz-caption bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 rounded transition-colors text-gray-600">
                            <Plus size={11} /> Add Row
                        </button>
                    </div>

                    {/* ── Transaction Table ── */}
                    <div className="border border-gray-300 rounded mb-2">
                        <Table
                            columns={columns}
                            dataSource={rows}
                            pagination={false}
                            size="small"
                            className="pvc-table"
                            rowKey="id"
                            scroll={{ y: 180 }}
                            locale={{ emptyText: <span className="fz-caption text-gray-400 py-6 block text-center">No rows — click Add Row</span> }}
                        />
                    </div>

                    {/* ── Narration ── */}
                    <div className="flex items-start gap-2">
                        <label className="fz-label text-gray-600 whitespace-nowrap pt-1">Narration</label>
                        <TextArea
                            value={formData.narration}
                            onChange={e => updateField('narration', e.target.value)}
                            rows={3}
                            className="fz-caption resize-none border-gray-300"
                            style={{ flex: 1 }}
                        />
                    </div>

                </div>

                {/* ── Footer status bar ── */}
                <div className="pvc-footer px-3 py-1 bg-gray-100 border-t border-gray-300 flex items-center justify-between shrink-0">
                    <span className="fz-caption text-gray-500">
                        Payment Voucher
                        {formData.memberName && <> &nbsp;|&nbsp; <span className="text-blue-700 font-semibold">{formData.memberName}</span></>}
                    </span>
                    <span className="fz-caption text-gray-500">{dayjs().format('DD-MMM-YYYY')}</span>
                </div>

            </div>

            {/* Member Lookup Modal */}
            <Modal open={showLookup} onCancel={() => setShowLookup(false)} footer={null}
                width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>

            <style>{`
                .pvc-table .ant-table-thead > tr > th {
                    background: #f3f4f6 !important;
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    color: #374151 !important;
                    border-bottom: 1px solid #d1d5db !important;
                }
                .pvc-table .ant-table-tbody > tr > td {
                    padding: 3px 8px !important;
                    border-bottom: 1px solid #e5e7eb !important;
                }
                .pvc-table .ant-table-tbody > tr:hover > td {
                    background: #eff6ff !important;
                }
                .pvc-code-select .ant-select-selector {
                    height: 22px !important;
                    min-height: 22px !important;
                    font-size: 11px !important;
                    font-family: 'Courier New', monospace !important;
                    font-weight: 600 !important;
                }
                .pvc-code-select .ant-select-selection-item { line-height: 20px !important; font-size: 11px !important; }
                .pvc-code-select .ant-select-selection-placeholder { line-height: 20px !important; font-size: 11px !important; }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }

                /* ── Dark mode ── */
                html.dark .pvc-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .pvc-header { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .pvc-root .bg-gray-50 { background-color: #1c1c1e !important; }
                html.dark .pvc-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .pvc-root .border-gray-300 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .pvc-root .text-gray-800 { color: #f5f5f7 !important; }
                html.dark .pvc-root .text-gray-700 { color: #f5f5f7 !important; }
                html.dark .pvc-root .text-gray-600 { color: #8e8e93 !important; }
                html.dark .pvc-root .text-gray-500 { color: #8e8e93 !important; }
                html.dark .pvc-root .text-gray-400 { color: #71717a !important; }
                html.dark .pvc-root .text-blue-700,
                html.dark .pvc-root .text-blue-800 { color: #60a5fa !important; }
                html.dark .pvc-root .bg-green-50 { background-color: rgba(52,211,153,.12) !important; }
                html.dark .pvc-root .border-green-300 { border-color: rgba(52,211,153,.3) !important; }
                html.dark .pvc-root .text-green-700 { color: #34d399 !important; }
                html.dark .pvc-root .text-green-600 { color: #34d399 !important; }
                html.dark .pvc-root .text-red-500 { color: #ff453a !important; }
                /* footer strip */
                html.dark .pvc-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                /* buttons with white background */
                html.dark .pvc-root button.bg-white { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                /* antd inputs / selects / pickers */
                html.dark .pvc-root .ant-input,
                html.dark .pvc-root input.ant-input,
                html.dark .pvc-root textarea.ant-input,
                html.dark .pvc-root .ant-picker,
                html.dark .pvc-root .ant-select-selector {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .pvc-root .ant-select-selection-item,
                html.dark .pvc-root .ant-select-selection-search-input,
                html.dark .pvc-root .ant-picker input { color: #f5f5f7 !important; }
                html.dark .pvc-root .ant-select-selection-placeholder,
                html.dark .pvc-root .ant-input::placeholder,
                html.dark .pvc-root .ant-picker input::placeholder { color: #71717a !important; }
                html.dark .pvc-root .ant-select-arrow,
                html.dark .pvc-root .ant-picker-suffix { color: #8e8e93 !important; }
                /* table */
                html.dark .pvc-table .ant-table,
                html.dark .pvc-table .ant-table-container { background-color: #1c1c1e !important; color: #f5f5f7 !important; }
                html.dark .pvc-table .ant-table-thead > tr > th { background: #1c1c1e !important; color: #8e8e93 !important; border-bottom-color: rgba(255,255,255,.07) !important; }
                html.dark .pvc-table .ant-table-tbody > tr > td { background-color: #1c1c1e !important; color: #f5f5f7 !important; border-bottom-color: rgba(255,255,255,.07) !important; }
                html.dark .pvc-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,.05) !important; }
                html.dark .pvc-table .ant-table-placeholder .ant-table-cell,
                html.dark .pvc-table .ant-empty-description { background-color: #1c1c1e !important; color: #71717a !important; }
                html.dark .ant-select-dropdown { background-color: #1c1c1e !important; }
                html.dark .ant-select-dropdown .ant-select-item { color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown .ant-select-item-option-active { background-color: rgba(255,255,255,.08) !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default PaymentVoucherForm;
