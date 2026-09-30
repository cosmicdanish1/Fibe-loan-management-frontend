// components/LoanEntryForm.tsx

import React from 'react';
import { DatePicker, Select } from 'antd';
import { IndianRupee, Save, RotateCcw, X, ShieldCheck, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { LoanEntryHookReturn } from '../interface/LoanEntryInterfaces';
import MemberField from '@/components/shared/kit/MemberField';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const LOAN_TYPES = [
    { id: 'ALN', label: 'Emergency Loan (ALN)' },
    { id: 'RLN', label: 'Regular Loan (RLN)' },
    { id: 'ELN', label: 'Loan Against Recovery (ELN)' },
];

const fmtInr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const LoanEntryForm: React.FC<LoanEntryHookReturn> = ({
    formData, updateField,
    handleMemberSelect, handleG1Select, handleG2Select,
    handleSave, handleClear, handleExit,
    isLoading, eligibilityStatus, isCheckingEligibility,
}) => {
    const pick = (fn: (no: string, d?: any) => void) => (member: any) => {
        const no = String(member.memberNo || member.mbno || '');
        const name = member.memberName || member.fullname || '';
        fn(no, { memberNo: no, memberName: name });
    };

    const notEligible = !!eligibilityStatus && !eligibilityStatus.isEligible;
    const saveBlocked = isLoading || isCheckingEligibility || notEligible;

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !(isLoading || isCheckingEligibility || (eligibilityStatus && !eligibilityStatus.isEligible)),
    });

    const nameLine = (name: string) => name ? <p className="aw-strong aw-fade-in" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{name}</p> : null;

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Entry</h1>
                    <p className="aw-desc">loan_master + suretymaster</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleSave} disabled={saveBlocked} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack" style={{ maxWidth: 900 }}>
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Member & Loan Type</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <span className="aw-label">Member No.</span>
                                <MemberField value={formData.memberNo} onChange={v => updateField('memberNo', v)}
                                    onSelect={pick(handleMemberSelect)} placeholder="Member no…" ariaLabel="Member number" />
                                {nameLine(formData.memberName)}
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-type">Loan Type</label>
                                <Select id="le-type" value={(formData.loanType || undefined) as string} onChange={v => updateField('loanType', v)}
                                    className="aw-select" popupClassName="aw-select-popup" placeholder="Select loan type"
                                    options={LOAN_TYPES.map(t => ({ value: t.id, label: t.label }))} />
                            </div>
                        </div>
                    </section>

                    {(isCheckingEligibility || eligibilityStatus) && (
                        <section className="aw-card aw-fade-in">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                                <h2 className="aw-card-title">5% Eligibility Rules</h2>
                                {isCheckingEligibility ? (
                                    <span className="aw-pill" style={{ marginLeft: 'auto' }}><RotateCcw size={11} className="aw-spin" /> Checking...</span>
                                ) : eligibilityStatus?.isEligible ? (
                                    <span className="aw-pill tone-success" style={{ marginLeft: 'auto' }}>Eligible</span>
                                ) : (
                                    <span className="aw-pill tone-danger" style={{ marginLeft: 'auto' }}>Not Eligible</span>
                                )}
                            </div>
                            {eligibilityStatus && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--aw-gap)' }}>
                                    <div className="aw-panel">
                                        <span className="aw-label">Share Requirements</span>
                                        <div className="aw-facts">
                                            <div className="aw-inline" style={{ justifyContent: 'space-between' }}><span className="aw-meta">Current Share:</span><strong>{fmtInr(eligibilityStatus.currentShare)}</strong></div>
                                            <div className="aw-inline" style={{ justifyContent: 'space-between' }}><span className="aw-meta">Required (5%):</span><strong style={{ color: 'var(--aw-accent)' }}>{fmtInr(eligibilityStatus.requiredShare)}</strong></div>
                                            {eligibilityStatus.additionalShareRequired > 0 && (
                                                <div className="aw-inline" style={{ justifyContent: 'space-between' }}><strong style={{ color: 'var(--aw-danger)' }}>Shortfall:</strong><strong style={{ color: 'var(--aw-danger)' }}>{fmtInr(eligibilityStatus.additionalShareRequired)}</strong></div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="aw-panel">
                                        <span className="aw-label">FD Requirements</span>
                                        <div className="aw-facts">
                                            <div className="aw-inline" style={{ justifyContent: 'space-between' }}><span className="aw-meta">Current FD:</span><strong>{fmtInr(eligibilityStatus.currentFd)}</strong></div>
                                            <div className="aw-inline" style={{ justifyContent: 'space-between' }}><span className="aw-meta">Required (5%):</span><strong style={{ color: 'var(--aw-accent)' }}>{fmtInr(eligibilityStatus.requiredFd)}</strong></div>
                                            {eligibilityStatus.additionalFdRequired > 0 && (
                                                <div className="aw-inline" style={{ justifyContent: 'space-between' }}><strong style={{ color: 'var(--aw-danger)' }}>Shortfall:</strong><strong style={{ color: 'var(--aw-danger)' }}>{fmtInr(eligibilityStatus.additionalFdRequired)}</strong></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><IndianRupee size={14} /></span>
                            <h2 className="aw-card-title">Loan Details</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--aw-gap)' }}>
                            <div>
                                <label className="aw-label" htmlFor="le-amount">Loan Amount</label>
                                <div className="aw-input-wrap has-icon">
                                    <IndianRupee size={13} />
                                    <input id="le-amount" type="number" value={formData.loanAmount} onChange={e => updateField('loanAmount', e.target.value)}
                                        placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-rate">Interest Rate (%)</label>
                                <input id="le-rate" type="number" value={formData.rate} onChange={e => updateField('rate', e.target.value)}
                                    placeholder="12.00" className="aw-input is-right" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-inst">No. of Installments</label>
                                <input id="le-inst" type="number" value={formData.noOfInstal} onChange={e => updateField('noOfInstal', e.target.value)}
                                    placeholder="60" className="aw-input is-right" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-instamt">Installment Amount</label>
                                <div className="aw-input-wrap has-icon">
                                    <IndianRupee size={13} />
                                    <input id="le-instamt" type="number" value={formData.instalAmt} onChange={e => updateField('instalAmt', e.target.value)}
                                        placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-date">Payment Date</label>
                                <DatePicker id="le-date" value={formData.paymentDate ? dayjs(formData.paymentDate) : null}
                                    onChange={d => updateField('paymentDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YY" className="aw-picker" popupClassName="aw-select-popup" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="le-penal">Penal Rate (%)</label>
                                <input id="le-penal" type="number" value={formData.penalRate} onChange={e => updateField('penalRate', e.target.value)}
                                    placeholder="2.00" className="aw-input is-right" />
                            </div>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="le-purpose">Purpose</label>
                            <textarea id="le-purpose" value={formData.purpose} onChange={e => updateField('purpose', e.target.value)}
                                placeholder="Enter loan purpose…" rows={2}
                                className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Guarantors (Surety)</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <span className="aw-label">Guarantor 1 (G1)</span>
                                <MemberField value={formData.g1MbNo} onChange={v => updateField('g1MbNo', v)}
                                    onSelect={pick(handleG1Select)} placeholder="Member no…" ariaLabel="Guarantor 1 member number" />
                                {nameLine(formData.g1Name)}
                            </div>
                            <div>
                                <span className="aw-label">Guarantor 2 (G2)</span>
                                <MemberField value={formData.g2MbNo} onChange={v => updateField('g2MbNo', v)}
                                    onSelect={pick(handleG2Select)} placeholder="Member no…" ariaLabel="Guarantor 2 member number" />
                                {nameLine(formData.g2Name)}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{LOAN_TYPES.find(t => t.id === formData.loanType)?.label || 'Loan Entry'}{formData.memberName && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>
        </div>
    );
};

export default LoanEntryForm;
