// components/LoanPaymentForm.tsx

import React from 'react';
import { Select, DatePicker } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import {
    Banknote, RotateCcw, Save, X, ShieldCheck, Building2,
    Calendar, FileText, IndianRupee, Hash, CreditCard, Plus, Trash2,
} from 'lucide-react';
import { LoanPaymentHookReturn, PaymentEntry } from '../interface/LoanPaymentInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

const LoanPaymentForm: React.FC<LoanPaymentHookReturn> = ({
    formData, modalData, loanCases, isLoadingCases,
    actualAmount, bankBalance, totalReceipt, totalPayment,
    data, headList, bankList,
    updateField, updateModalField, handleLoanCaseChange,
    openSanctionWindow, closeModal, handleModalSave,
    handleSave, handleReset, handleExit,
    addVoucherEntry, updateVoucherEntry, removeVoucherEntry,
}) => {
    // BUG FIX: was a flat sanctionAmount/installments split (no interest at all) —
    // purely cosmetic, since the actual EMI that gets stored to loan_master.instal_amt
    // and used by real repayment (voucher.service.ts's generateLoanVoucher) already
    // uses a proper reducing-balance formula. But showing the wrong figure here before
    // disbursement is misleading to the operator (e.g. a real ₹10,000/60mo/12.5% loan
    // showed ₹166.67 here vs the ₹224.98 actually charged) — mirror the same formula so
    // the preview matches what will actually be posted.
    const installmentAmt = (() => {
        const principal = parseFloat(formData.sanctionLoanAmount) || 0;
        const n = parseInt(formData.noOfInstallments) || 0;
        if (!principal || !n) return '0.00';
        const annualRate = parseFloat(modalData.rate) || 12;
        const monthlyRate = annualRate / 100 / 12;
        const emi = monthlyRate > 0
            ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
            : principal / n;
        return emi.toFixed(2);
    })();

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Save',
    });

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Payment</h1>
                    <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={12} /> Loan Disbursement
                    </p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary">
                        <RotateCcw size={13} /> Reset
                    </button>
                    <button type="button" onClick={handleSave} className="aw-btn aw-btn-primary">
                        <Save size={13} /> Save
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost">
                        <X size={13} /> Exit
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">

                    {/* 1. Loan case */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Hash size={14} /></span>
                            <h2 className="aw-card-title">Loan Case</h2>
                        </div>
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{ width: 200 }}>
                                <label className="aw-label" htmlFor="lp-type">Loan Type</label>
                                <Select id="lp-type" className="aw-select" popupClassName="aw-select-popup"
                                    value={(modalData.loanType || undefined) as string} onChange={(val: string) => updateModalField('loanType', val)}
                                    placeholder="Select..."
                                    options={[
                                        { value: 'RLN', label: 'REGULAR LOAN' },
                                        { value: 'ALN', label: 'EMERGENCY LOAN' },
                                        { value: 'ELN', label: 'LOAN AGAINST RECOVERY' },
                                    ]} />
                            </div>
                            <div style={{ flex: 1, minWidth: 240 }}>
                                <label className="aw-label" htmlFor="lp-case">Loan Case No <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <Select id="lp-case" showSearch className="aw-select" popupClassName="aw-select-popup"
                                    value={(formData.loanCaseNo || undefined) as string} onChange={handleLoanCaseChange}
                                    loading={isLoadingCases} placeholder="Select or search loan case..."
                                    listHeight={300} virtual
                                    filterOption={(input, option) => {
                                        const q = (input || '').toLowerCase();
                                        const loan = loanCases.find(l => l.loanCaseNo === option?.value);
                                        if (!loan) return false;
                                        return String(loan.loanCaseNo).toLowerCase().includes(q)
                                            || String(loan.memberName || '').toLowerCase().includes(q);
                                    }}
                                    options={loanCases.map(loan => ({ value: loan.loanCaseNo, label: `${loan.loanCaseNo}  ${loan.memberName}` }))} />
                            </div>
                            {formData.noOfInstallments && (
                                <span className="aw-inline aw-fade-in" style={{ gap: 6 }}>
                                    <span className="aw-pill">Inst. {formData.noOfInstallments}</span>
                                    <span className="aw-pill tone-success">Amt ₹{installmentAmt}</span>
                                </span>
                            )}
                            <button type="button" onClick={openSanctionWindow} className={`aw-btn ${formData.sanctionLoanAmount ? 'aw-btn-secondary' : 'aw-btn-primary'}`}>
                                <ShieldCheck size={13} /> {formData.sanctionLoanAmount ? 'Sanctioned' : 'Sanction Loan Amount'}
                            </button>
                        </div>
                    </section>

                    {/* 2. Member details */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Building2 size={14} /></span>
                            <h2 className="aw-card-title">Member</h2>
                        </div>
                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                            <div><dt>Member No</dt><dd style={{ color: 'var(--aw-accent)' }}>{formData.memberNo || '—'}</dd></div>
                            <div><dt>Name</dt><dd>{formData.memberName || '—'}</dd></div>
                            <div><dt>Sanction</dt><dd style={{ color: 'var(--aw-success)' }}>₹{parseFloat(formData.sanctionLoanAmount || '0').toLocaleString('en-IN')}</dd></div>
                            <div><dt>Office No</dt><dd>{formData.officeNo || '—'}</dd></div>
                            <div><dt>Sub Division</dt><dd>{formData.subDivision || '—'}</dd></div>
                            <div><dt>Head</dt><dd><span style={{ color: 'var(--aw-accent)', fontFamily: 'monospace' }}>{formData.hCode || '—'}</span> {formData.hName || 'LOAN DISBURSEMENT'}</dd></div>
                            <div><dt>Loan Type</dt><dd>{modalData.loanType || '—'}</dd></div>
                            <div><dt>Inst. Amt</dt><dd>₹{installmentAmt}</dd></div>
                        </dl>
                    </section>

                    {/* 3. Mode of payment */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Banknote size={14} /></span>
                            <h2 className="aw-card-title">Mode of Payment</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill tone-success">
                                    Actual Amount ₹{(actualAmount > 0 ? actualAmount : parseFloat(formData.sanctionLoanAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <span className={`aw-pill tone-${(bankBalance || 0) < 0 ? 'danger' : 'muted'}`}>
                                    {formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'} ₹{(bankBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </span>
                        </div>
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                            <div>
                                <span className="aw-label">Mode</span>
                                <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: formData.paymentMode === 'bank' ? 1 : 0, ['--seg-count' as any]: 2, minWidth: 180 }}>
                                    {['cash', 'bank'].map(mode => (
                                        <button key={mode} type="button" role="tab" aria-selected={formData.paymentMode === mode} onClick={() => updateField('paymentMode', mode)}>
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ width: 170 }}>
                                <label className="aw-label" htmlFor="lp-date">{formData.paymentMode === 'bank' ? 'Cheque Date' : 'Payment Date'}</label>
                                <DatePicker id="lp-date" value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                    onChange={d => updateField('chequeDate', d)}
                                    className="aw-picker" popupClassName="aw-select-popup" format="DD-MMM-YY" />
                            </div>
                            {formData.paymentMode === 'bank' && (
                                <>
                                    <div style={{ width: 170 }} className="aw-fade-in">
                                        <label className="aw-label" htmlFor="lp-chq">Cheque No</label>
                                        <input id="lp-chq" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                            placeholder="Cheque no..." className="aw-input" style={{ fontFamily: 'monospace' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 220 }} className="aw-fade-in">
                                        <label className="aw-label" htmlFor="lp-bank">Bank</label>
                                        <Select id="lp-bank" showSearch className="aw-select" popupClassName="aw-select-popup"
                                            value={formData.bankName || undefined} onChange={val => updateField('bankName', val)}
                                            placeholder="Select bank account..." optionFilterProp="label"
                                            options={bankList.map(b => ({ value: b.code, label: b.name }))} />
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* 4. Transaction breakdown */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <div>
                                <h2 className="aw-card-title">Transaction Breakdown</h2>
                                <p className="aw-meta">{data.length} row(s)</p>
                            </div>
                            <button type="button" onClick={addVoucherEntry} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}>
                                <Plus size={12} /> Add Row
                            </button>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '40vh' }}>
                            <table className="aw-table" style={{ minWidth: 760 }}>
                                <thead>
                                    <tr>
                                        <th className="is-center" style={{ width: 50 }}>Sr</th>
                                        <th style={{ width: 200 }}>Code</th>
                                        <th>Name</th>
                                        <th style={{ width: 150 }}>R/P</th>
                                        <th className="is-right" style={{ width: 150 }}>Amount</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {data && data.length > 0 ? data.map((entry: PaymentEntry, index: number) => (
                                        <tr key={entry.key || index}>
                                            <td className="is-muted is-center">{index + 1}</td>
                                            <td className="has-input">
                                                <Select showSearch value={entry.code || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'code', val)}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    placeholder="Code..." optionLabelProp="value"
                                                    /* Legacy's combo filters by "starts with", not "contains" —
                                                       a plain substring match barely narrows anything since most
                                                       names contain any given letter somewhere. */
                                                    filterOption={(input, option) =>
                                                        String(option?.value ?? '').toLowerCase().startsWith(input.toLowerCase())}
                                                    popupMatchSelectWidth={false} styles={{ popup: { root: { minWidth: 280 } } }}
                                                    listHeight={300} virtual
                                                    options={headList.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))} />
                                            </td>
                                            <td className="has-input">
                                                {/* Same underlying value as Code (the code) — head names aren't
                                                    unique (e.g. two heads are both "Cash in Hand"), so the code
                                                    stays canonical; this just searches/displays by name instead. */}
                                                <Select showSearch value={entry.code || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'code', val)}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    placeholder="Name..." optionLabelProp="displayName"
                                                    filterOption={(input, option) =>
                                                        String((option as any)?.displayName ?? '').toLowerCase().startsWith(input.toLowerCase())}
                                                    popupMatchSelectWidth={false} styles={{ popup: { root: { minWidth: 280 } } }}
                                                    listHeight={300} virtual
                                                    options={headList.map(h => ({ value: h.code, label: `${h.name} - ${h.code}`, displayName: h.name }))} />
                                            </td>
                                            <td className="has-input">
                                                <Select value={entry.rp || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'rp', val)}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    options={[{ value: 'Receipt', label: 'Receipt' }, { value: 'Payment', label: 'Payment' }]} />
                                            </td>
                                            <td className="has-input">
                                                <input type="number" aria-label={`Amount row ${index + 1}`} value={entry.amount}
                                                    onChange={e => updateVoucherEntry(index, 'amount', e.target.value)}
                                                    className="aw-input is-right" style={{ fontFamily: 'monospace' }} placeholder="0.00" />
                                            </td>
                                            <td className="is-center">
                                                <button type="button" onClick={() => removeVoucherEntry(index)} className="aw-icon-btn is-sm is-danger"
                                                    aria-label={`Remove row ${index + 1}`} data-tip="Remove row" data-tip-pos="left">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="aw-empty" style={{ padding: 24 }}>
                                                    <span className="aw-meta">No entries — select a loan case to begin</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 5. Narration + totals */}
                    <section className="aw-card">
                        <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                                <label className="aw-label" htmlFor="lp-narr">Narration</label>
                                <input id="lp-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration / remarks…" className="aw-input" />
                            </div>
                            <span className="aw-inline" style={{ gap: 8 }}>
                                <span className="aw-pill tone-success">Total Receipt ₹{totalReceipt.toFixed(2)}</span>
                                <span className="aw-pill tone-danger">Total Payment ₹{totalPayment.toFixed(2)}</span>
                            </span>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={12} /> Loan Payment
                    {formData.loanCaseNo && <span>· Case: <strong style={{ color: 'var(--aw-accent)' }}>{formData.loanCaseNo}</strong></span>}
                    {formData.memberNo && <span>· Member: {formData.memberNo}</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> {dayjs().format('DD-MMM-YY')}</span>
            </div>

            {/* ── Sanction Authorization dialog ── */}
            <AwDialog open={modalData.isOpen} title="Sanction Authorization" icon={<ShieldCheck size={14} />} onClose={closeModal} maxWidth="34rem" compact>
                <div className="aw-stack">
                    <dl className="aw-facts aw-panel">
                        <div><dt>Applicant</dt><dd>{modalData.memberName}</dd></div>
                        <div><dt>Applied Amount</dt><dd style={{ color: 'var(--aw-accent)' }}>₹{modalData.appliedAmount}</dd></div>
                        <div><dt>Basic Salary</dt><dd>₹{modalData.basicPay}</dd></div>
                        <div><dt>Share Capital</dt><dd style={{ color: 'var(--aw-success)' }}>₹{modalData.shareAmount}</dd></div>
                    </dl>
                    <div className="aw-two">
                        <div>
                            <label className="aw-label" htmlFor="lp-m-amt">Approved Sanction (₹)</label>
                            <div className="aw-input-wrap has-icon">
                                <IndianRupee size={13} />
                                <input id="lp-m-amt" className="aw-input" style={{ color: 'var(--aw-success)', fontWeight: 700 }} value={modalData.sanctionedAmount}
                                    onChange={e => updateModalField('sanctionedAmount', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="lp-m-inst">No. of Installments</label>
                            <input id="lp-m-inst" className="aw-input" value={modalData.noOfInstallments} onChange={e => updateModalField('noOfInstallments', e.target.value)} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="lp-m-rate">Interest Rate (%)</label>
                            <input id="lp-m-rate" className="aw-input" value={modalData.rate} onChange={e => updateModalField('rate', e.target.value)} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="lp-m-pen">Penal Rate (%)</label>
                            <input id="lp-m-pen" className="aw-input" style={{ color: 'var(--aw-danger)' }} value={modalData.penalRate} onChange={e => updateModalField('penalRate', e.target.value)} />
                        </div>
                    </div>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={closeModal} className="aw-btn aw-btn-secondary">Cancel</button>
                        <button type="button" onClick={handleModalSave} className="aw-btn aw-btn-primary"><ShieldCheck size={13} /> Confirm Sanction</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default LoanPaymentForm;
