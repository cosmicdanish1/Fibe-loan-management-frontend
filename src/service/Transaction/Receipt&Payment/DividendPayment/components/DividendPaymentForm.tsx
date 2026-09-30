// components/DividendPaymentForm.tsx

import React from 'react';
import { Select, DatePicker } from 'antd';
import { Banknote, RotateCcw, X, Users, Search, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { DividendPaymentHookReturn } from '../interface/DividendPaymentInterfaces';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

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
    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Processing…' : 'Disburse',
        saveEnabled: !isLoading,
    });

    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Dividend Payment</h1>
                    <p className="aw-desc">DR L1024 → Ledger{formData.memberNo ? ` · Member ${formData.memberNo}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Reset</button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Banknote size={13} />}
                        {isLoading ? 'Processing…' : 'Disburse'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Member Details</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <label className="aw-label" htmlFor="dv-member">Member No <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <div className="aw-input-wrap has-action">
                                    <input id="dv-member" value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)}
                                        onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookupModal(true); } }}
                                        placeholder="Click or PgUp to search…" className="aw-input" style={{ fontFamily: 'monospace' }} />
                                    <button type="button" className="aw-input-action" onClick={() => setShowLookupModal(true)} aria-label="Member lookup" data-tip="Member lookup" data-tip-pos="top-end">
                                        <Search size={13} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="dv-sub">Sub Division <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <input id="dv-sub" value={formData.subDivision} onChange={e => updateField('subDivision', e.target.value)} placeholder="Sub Division..." className="aw-input" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="dv-date">Trans Date</label>
                                <DatePicker id="dv-date" value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Banknote size={14} /></span>
                            <h2 className="aw-card-title">Mode of Payment</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill">Actual Amt ₹{actualAmount.toFixed(2)}</span>
                                <span className={`aw-pill ${bankBalance < 0 ? 'tone-danger' : ''}`}>{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'} ₹{fmt(bankBalance)}</span>
                            </span>
                        </div>
                        <div className="aw-seg" role="tablist" style={{ maxWidth: 240, ['--seg-index' as any]: formData.paymentMode === 'bank' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                            {['cash', 'bank'].map(mode => (
                                <button key={mode} type="button" role="tab" aria-selected={formData.paymentMode === mode} onClick={() => updateField('paymentMode', mode)}>
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {formData.paymentMode === 'bank' && (
                            <div className="aw-panel aw-fade-in">
                                <span className="aw-label">Cheque Details</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)' }}>
                                    <div>
                                        <label className="aw-label" htmlFor="dv-from">Pay From A/C</label>
                                        <Select id="dv-from" value={(formData.bankCode || undefined) as string} onChange={val => updateField('bankCode', val)}
                                            showSearch optionFilterProp="label" className="aw-select" popupClassName="aw-select-popup"
                                            placeholder="Bank account..."
                                            options={bankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="dv-cdate">Cheque Date</label>
                                        <DatePicker id="dv-cdate" value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                            onChange={d => updateField('chequeDate', d)}
                                            format="DD-MMM-YY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="dv-cno">Cheque No</label>
                                        <input id="dv-cno" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)} placeholder="Cheque No..." className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="dv-bank">Drawee Bank</label>
                                        <input id="dv-bank" value={formData.bankName} onChange={e => updateField('bankName', e.target.value)} placeholder="Bank name..." className="aw-input" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">WR Dividend Breakdown</h2>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '36vh' }}>
                            <table className="aw-table">
                                <thead>
                                    <tr>
                                        <th>WR No</th>
                                        <th className="is-right">Balance</th>
                                        <th className="is-right">Rate</th>
                                        <th className="is-right">Dividend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && data.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-spin" /></div></td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">Enter member no to load pending dividends</span></div></td></tr>
                                    ) : data.map(row => (
                                        <tr key={row.key}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.wrNo}</td>
                                            <td className="is-right">{row.balance.toFixed(2)}</td>
                                            <td className="is-right is-accent">{row.rate.toFixed(2)}%</td>
                                            <td className="is-right is-success">₹{row.dividend.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="aw-card">
                        <label className="aw-label" htmlFor="dv-narr">Narration</label>
                        <textarea id="dv-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                            placeholder="Enter narration / remarks…" rows={2}
                            className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Dividend Payment{formData.memberNo && <> · <strong style={{ color: 'var(--aw-accent)' }}>Member: {formData.memberNo}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            <MemberLookupDialog open={showLookupModal} onClose={() => setShowLookupModal(false)}
                onSelect={(member: any) => updateField('memberNo', member.memberNo.toString())} />
        </div>
    );
};

export default DividendPaymentForm;
