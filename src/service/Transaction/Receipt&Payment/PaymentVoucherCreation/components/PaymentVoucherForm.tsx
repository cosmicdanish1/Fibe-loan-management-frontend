// components/PaymentVoucherForm.tsx

import React, { useState, useEffect } from 'react';
import { Select, DatePicker } from 'antd';
import { RotateCcw, Save, X, Search, Plus, Trash2, FileText, User } from 'lucide-react';
import dayjs from 'dayjs';
import { PaymentVoucherHookReturn, RowData } from '../interface/PaymentVoucherInterfaces';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

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
    };

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Voucher Creation</h1>
                    <p className="aw-desc">Payment Voucher{formData.memberName ? ` · ${formData.memberName}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary">
                        <RotateCcw size={13} /> Clear
                    </button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost">
                        <X size={13} /> Exit
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">

                    {/* Saved success banner */}
                    {lastSaved && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ marginBottom: 0, alignItems: 'center' }} role="status">
                            <span style={{ flex: 1 }}>
                                Saved — Voucher <strong>{lastSaved.voucherNo}</strong> &nbsp;|&nbsp;
                                Member <strong>{lastSaved.memberNo}</strong> &nbsp;|&nbsp;
                                Amount <strong>₹{lastSaved.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary aw-btn-sm"><RotateCcw size={11} /> New</button>
                        </div>
                    )}

                    {/* Voucher details */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Voucher</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="pvc-no">Voucher No.</label>
                                <input id="pvc-no" value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)} placeholder="Auto..." className="aw-input" style={{ fontFamily: 'monospace', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pvc-date">Trans Date</label>
                                <DatePicker id="pvc-date" value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YYYY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="aw-label" htmlFor="pvc-from">Pay From</label>
                                <Select id="pvc-from" value={formData.payFromCode || 'A1001'} onChange={val => updateField('payFromCode', val)}
                                    showSearch optionFilterProp="label" className="aw-select" popupClassName="aw-select-popup"
                                    options={payFromAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                            </div>
                        </div>
                        <div>
                            <span className="aw-label">Payment Type</span>
                            <div className="aw-seg" role="tablist" style={{ maxWidth: 320, ['--seg-index' as any]: formData.paymentType === 'general' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                {[
                                    { value: 'payment', label: 'Payment' },
                                    { value: 'general', label: 'General Payment' },
                                ].map(opt => (
                                    <button key={opt.value} type="button" role="tab" aria-selected={formData.paymentType === opt.value} onClick={() => updateField('paymentType', opt.value)}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Member */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><User size={14} /></span>
                            <h2 className="aw-card-title">Member</h2>
                        </div>
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
                            <div style={{ width: 240 }}>
                                <label className="aw-label" htmlFor="pvc-member">Member No. <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <div className="aw-input-wrap has-action">
                                    <input id="pvc-member" value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)}
                                        onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookup(true); } }}
                                        className="aw-input" style={{ fontFamily: 'monospace', fontWeight: 700 }} />
                                    <button type="button" className="aw-input-action" onClick={() => setShowLookup(true)} aria-label="Member lookup" data-tip="Member lookup" data-tip-pos="top-end">
                                        <Search size={13} />
                                    </button>
                                </div>
                                <p className="aw-meta" style={{ marginTop: 4 }}>(For List Press PgUp Key)</p>
                                {formData.memberName && <p className="aw-strong aw-fade-in" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{formData.memberName}</p>}
                            </div>
                            <div style={{ width: 140 }}>
                                <label className="aw-label" htmlFor="pvc-office">Office No</label>
                                <input id="pvc-office" value={formData.officeNo} onChange={e => updateField('officeNo', e.target.value)} className="aw-input" />
                            </div>
                        </div>
                    </section>

                    {/* Transaction rows */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Plus size={14} /></span>
                            <h2 className="aw-card-title">Transactions</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 10 }}>
                                <span className="aw-pill">Total Amount {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm"><Plus size={12} /> Add Row</button>
                            </span>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                            <table className="aw-table" style={{ minWidth: 720 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 260 }}>Code</th>
                                        <th>Name</th>
                                        <th className="is-right" style={{ width: 160 }}>Amount</th>
                                        <th style={{ width: 150 }}>RD Sr.No</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">No rows — click Add Row</span></div></td></tr>
                                    ) : rows.map((record: RowData) => (
                                        <tr key={record.id}>
                                            <td className="has-input">
                                                <Select
                                                    value={record.code || undefined}
                                                    onChange={(value?: string) => {
                                                        updateRow(record.id, 'code', value ?? '');
                                                        const head = headCodes.find(h => h.code === value);
                                                        if (head) updateRow(record.id, 'name', head.name);
                                                    }}
                                                    placeholder="Select..."
                                                    showSearch
                                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    loading={loadingHeads}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                                                />
                                            </td>
                                            <td className="has-input"><input aria-label="Name" value={record.name} onChange={e => updateRow(record.id, 'name', e.target.value)} placeholder="Description..." className="aw-input" /></td>
                                            <td className="has-input"><input type="number" aria-label="Amount" value={record.amount} onChange={e => updateRow(record.id, 'amount', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="has-input"><input aria-label="RD Sr.No" value={record.rdSrNo} onChange={e => updateRow(record.id, 'rdSrNo', e.target.value)} placeholder="RD ref..." className="aw-input" /></td>
                                            <td className="is-center">
                                                <button type="button" onClick={() => removeRow(record.id)} className="aw-icon-btn is-sm is-danger" aria-label="Remove row" data-tip="Remove row" data-tip-pos="left">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Narration */}
                    <section className="aw-card">
                        <label className="aw-label" htmlFor="pvc-narr">Narration</label>
                        <textarea id="pvc-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)} rows={3}
                            className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Payment Voucher{formData.memberName && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YYYY')}</span>
            </div>

            <MemberLookupDialog open={showLookup} onClose={() => setShowLookup(false)} onSelect={onMemberSelected} />
        </div>
    );
};

export default PaymentVoucherForm;
