// components/ReceiptForm.tsx

import React, { useState, useEffect } from 'react';
import { Select } from 'antd';
import { Save, RotateCcw, X, Users, Search, Plus, Trash2, FileText, Banknote } from 'lucide-react';
import dayjs from 'dayjs';
import { ReceiptHookReturn, ReceiptRow } from '../interfaces/ReceiptInterfaces';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface HeadCode { code: string; name: string; }

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const HEAD_CODES: Record<string, string> = {
    'A1002': 'RLN', 'A1047': 'ALN', 'I1002': 'OTH',
    'L1004': 'CD',  'L1002': 'MD',  'L1045': 'MD1',
    'L1001': 'SHR', 'I1008': 'OTH', 'I1001': 'OTH',
};

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
    };

    const isGeneral = formData.receiptType === 'general';

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const bankBal = formData.bankBal || 0;

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Receipt</h1>
                    <p className="aw-desc">CR(R) + DR(P) → Ledger{formData.memberName && !isGeneral ? ` · ${formData.memberName}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: Math.max(0, RECEIPT_TYPES.findIndex(t => t.value === formData.receiptType)), ['--seg-count' as any]: RECEIPT_TYPES.length }}>
                        {RECEIPT_TYPES.map(tab => (
                            <button key={tab.value} type="button" role="tab" aria-selected={formData.receiptType === tab.value} onClick={() => updateField('receiptType', tab.value)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {lastSaved && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ alignItems: 'center' }} role="status">
                            <span style={{ flex: 1 }}>
                                Saved — Voucher <strong>{lastSaved.voucherNo}</strong> &nbsp;|&nbsp;
                                Member <strong>{lastSaved.memberNo}</strong> &nbsp;|&nbsp;
                                Amount <strong>₹{fmt(lastSaved.total)}</strong>
                            </span>
                            <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary aw-btn-sm"><RotateCcw size={11} /> New</button>
                        </div>
                    )}

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Member Details</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8 }}>
                                <label className="aw-label" htmlFor="rc-month" style={{ margin: 0 }}>Month</label>
                                <Select id="rc-month" value={formData.month} onChange={v => updateField('month', v)}
                                    className="aw-select" popupClassName="aw-select-popup" style={{ width: 84 }}
                                    options={MONTHS.map(m => ({ value: m, label: m }))} />
                                <label className="aw-label" htmlFor="rc-year" style={{ margin: 0 }}>Year</label>
                                <Select id="rc-year" value={formData.year} onChange={v => updateField('year', v)}
                                    className="aw-select" popupClassName="aw-select-popup" style={{ width: 96 }}
                                    options={Array.from({ length: 10 }, (_, i) => (dayjs().year() - 2 + i).toString()).map(y => ({ value: y, label: y }))} />
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <label className="aw-label" htmlFor="rc-member">Member No <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <div className="aw-input-wrap has-action">
                                    <input id="rc-member" value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)}
                                        onKeyDown={e => { if (e.key === 'PageUp' && !isGeneral) { e.preventDefault(); setShowLookup(true); } }}
                                        placeholder={isGeneral ? '0' : 'Member no…'} disabled={isGeneral}
                                        className="aw-input" style={{ fontFamily: 'monospace' }} />
                                    <button type="button" className="aw-input-action" disabled={isGeneral} onClick={() => !isGeneral && setShowLookup(true)} aria-label="Member lookup" data-tip="Member lookup" data-tip-pos="top-end">
                                        <Search size={13} />
                                    </button>
                                </div>
                                {isLoadingMember && <p className="aw-meta" style={{ marginTop: 4 }}>Loading…</p>}
                                {formData.memberName && !isLoadingMember && !isGeneral && (
                                    <p className="aw-strong aw-fade-in" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{formData.memberName}</p>
                                )}
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="rc-office">Office <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <input id="rc-office" value={formData.officeNo} onChange={e => updateField('officeNo', e.target.value)} placeholder="Office No..." className="aw-input" />
                            </div>
                            {formData.receiptType === 'receipt' && (
                                <div className="aw-panel">
                                    <span className="aw-label">Loan Balances</span>
                                    <table className="aw-table">
                                        <thead><tr><th>Loan</th><th className="is-right">Bal</th><th className="is-right">Intt</th></tr></thead>
                                        <tbody>
                                            {[
                                                { label: 'RLN', bal: formData.rlnBal, intt: formData.rlnIntt },
                                                { label: 'ELN', bal: formData.elnBal, intt: formData.elnIntt },
                                                { label: 'FLN', bal: formData.flnBal, intt: formData.flnIntt },
                                            ].map(item => (
                                                <tr key={item.label}>
                                                    <td>{item.label}</td>
                                                    <td className={`is-right ${item.bal > 0 ? 'is-danger' : 'is-muted'}`}>{item.bal.toFixed(2)}</td>
                                                    <td className={`is-right ${item.intt > 0 ? 'is-danger' : 'is-muted'}`}>{item.intt.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Banknote size={14} /></span>
                            <h2 className="aw-card-title">Mode of Payment</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill">Actual Amt ₹{fmt(totalAmount)}</span>
                                <span className={`aw-pill ${bankBal < 0 ? 'tone-danger' : ''}`}>{formData.modeOfPay === 'bank' ? 'Bank Bal' : 'Cash Bal'} ₹{fmt(bankBal)}</span>
                            </span>
                        </div>
                        <div className="aw-seg" role="tablist" style={{ maxWidth: 240, ['--seg-index' as any]: formData.modeOfPay === 'bank' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                            {['cash', 'bank'].map(mode => (
                                <button key={mode} type="button" role="tab" aria-selected={formData.modeOfPay === mode} onClick={() => updateField('modeOfPay', mode)}>
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {formData.modeOfPay === 'bank' && (
                            <div className="aw-panel aw-fade-in">
                                <span className="aw-label">Cheque Details</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)' }}>
                                    <div>
                                        <label className="aw-label" htmlFor="rc-cdate">Date</label>
                                        <input id="rc-cdate" value={formData.chequeDate ? dayjs(formData.chequeDate).format('DD-MMM-YY') : ''} readOnly className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="rc-cno">Cheque No</label>
                                        <input id="rc-cno" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)} placeholder="Cheque No..." className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="rc-bank">Bank</label>
                                        <Select id="rc-bank" value={(formData.bankCode || undefined) as string} onChange={v => updateField('bankCode', v)}
                                            className="aw-select" popupClassName="aw-select-popup" showSearch optionFilterProp="label"
                                            options={bankHeads.map(b => ({ value: b.code, label: `${b.code} — ${b.name}` }))} />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="rc-cbank">Customer's Bank</label>
                                        <input id="rc-cbank" value={formData.customerBankName} onChange={e => updateField('customerBankName', e.target.value)} placeholder="Customer bank..." className="aw-input" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Receipt Breakdown</h2>
                            <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}><Plus size={12} /> Add Row</button>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                            <table className="aw-table" style={{ minWidth: 720 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 260 }}>Code</th>
                                        <th>Name / Description</th>
                                        <th className="is-right" style={{ width: 160 }}>Amount</th>
                                        <th style={{ width: 150 }}>RD Sr.No</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.rows.length === 0 ? (
                                        <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">Add rows using the button above</span></div></td></tr>
                                    ) : formData.rows.map((record: ReceiptRow) => (
                                        <tr key={record.id}>
                                            <td className="has-input">
                                                <Select
                                                    value={record.code || undefined}
                                                    onChange={(value?: string) => {
                                                        updateRow(record.id, 'code', (value ?? '') as string);
                                                        const head = headCodes.find(h => h.code === value);
                                                        if (head) updateRow(record.id, 'description', head.name);
                                                        if (value && HEAD_CODES[value]) updateRow(record.id, 'accType', HEAD_CODES[value]);
                                                    }}
                                                    placeholder="Select..."
                                                    showSearch
                                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    loading={loadingHeads}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                                                />
                                            </td>
                                            <td className="has-input"><input aria-label="Description" value={record.description} onChange={e => updateRow(record.id, 'description', e.target.value)} placeholder="Description..." className="aw-input" /></td>
                                            <td className="has-input"><input type="number" aria-label="Amount" value={record.amount} onChange={e => updateRow(record.id, 'amount', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="has-input"><input aria-label="RD Sr.No" value={record.rdSrNo} onChange={e => updateRow(record.id, 'rdSrNo', e.target.value)} placeholder="RD ref..." className="aw-input" style={{ fontFamily: 'monospace' }} /></td>
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

                    <section className="aw-card">
                        <label className="aw-label" htmlFor="rc-narr">Narration</label>
                        <textarea id="rc-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                            placeholder="Enter narration / remarks…" rows={2}
                            className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Receipt{formData.memberName && !isGeneral && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            <MemberLookupDialog open={showLookup} onClose={() => setShowLookup(false)} onSelect={onMemberSelected} />
        </div>
    );
};

export default ReceiptForm;
