// components/LoanSanctionForm.tsx

import React from 'react';
import { Select } from 'antd';
import {
    CheckCircle,
    X,
    ShieldCheck,
    Building2,
    User,
    FileText,
    Scale,
    Users,
    RefreshCw,
} from 'lucide-react';
import { LoanSanctionHookReturn } from '../interface/LoanSanctionInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

const Fact: React.FC<{ label: string; tone?: string; span2?: boolean; children: React.ReactNode }> = ({ label, tone, span2, children }) => (
    <div style={span2 ? { gridColumn: 'span 2' } : undefined}>
        <span className="aw-label">{label}</span>
        <div className="aw-strong" style={{ color: tone, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</div>
    </div>
);

const LoanSanctionForm: React.FC<LoanSanctionHookReturn> = ({
    loanCases,
    selectedLoanCase,
    isLoadingCases,
    isSaving,
    loanDetails,
    sanctionDetails,
    rules,
    toggleRule,
    handleLoanCaseChange,
    updateSanctionField,
    handleSanctionSave,
    formatCurrency,
    handleExit,
}) => {
    // Legacy parity: the global toolbar's Save slot becomes "Sanction" here,
    // triggers the same handler, and mirrors this screen's own disabled state.
    usePageToolbarActions({
        onSave: handleSanctionSave,
        saveLabel: isSaving ? 'Processing...' : 'Sanction',
        saveEnabled: !!selectedLoanCase && !isSaving,
    });

    const surety = (n: 1 | 2) => {
        const gr = n === 1 ? loanDetails.surety1Gr : loanDetails.surety2Gr;
        const name = n === 1 ? loanDetails.surety1Name : loanDetails.surety2Name;
        const office = n === 1 ? loanDetails.surety1Office : loanDetails.surety2Office;
        const bal = n === 1 ? loanDetails.surety1LoanBalance : loanDetails.surety2LoanBalance;
        return (
            <div className="aw-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="aw-label" style={{ marginBottom: 0 }}>Surety 0{n}</span>
                    <span className="aw-strong" style={{ color: 'var(--aw-accent)', fontFamily: 'monospace' }}>{gr || '-'}</span>
                </div>
                <div className="aw-strong" style={{ marginTop: 4, minHeight: 18 }}>{name || '-'}</div>
                <div className="aw-meta" style={{ minHeight: 18 }}>{office || '-'}</div>
                <div className="aw-row" style={{ marginTop: 6, paddingBottom: 0 }}>
                    <span className="aw-row-label">Loan Bal</span>
                    <span className="aw-row-value" style={{ color: 'var(--aw-danger)' }}>{bal ? formatCurrency(bal) : '-'}</span>
                </div>
            </div>
        );
    };

    const applied10 = formatCurrency((parseFloat(loanDetails.appliedAmount) || 0) * 0.10).replace('₹', '');

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Sanction Console</h1>
                    <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={12} /> Executive Authority
                    </p>
                </div>
                <div className="aw-actions">
                    <span className="aw-pill">{loanCases.length} pending</span>
                    <button type="button" onClick={handleSanctionSave} disabled={!selectedLoanCase || isSaving} className="aw-btn aw-btn-primary">
                        {isSaving ? <RefreshCw size={13} className="aw-spin" /> : <CheckCircle size={13} />}
                        {isSaving ? 'Processing...' : 'Sanction'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost">
                        <X size={13} /> Exit
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">

                    {/* ── Case selection ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Loan Case No</h2>
                        </div>
                        <Select
                            id="ls-case"
                            showSearch
                            value={(selectedLoanCase || undefined) as string}
                            onChange={handleLoanCaseChange}
                            loading={isLoadingCases}
                            className="aw-select"
                            popupClassName="aw-select-popup"
                            placeholder="Select a loan case for review..."
                            optionFilterProp="label"
                            listHeight={400}
                            options={loanCases.map(loan => ({
                                value: loan.loanCaseNo,
                                label: `${loan.loanCaseNo} - ${loan.memberName} (${loan.loanType}) | ${formatCurrency(loan.appliedAmount)}`,
                            }))}
                        />
                    </section>

                    {selectedLoanCase && (
                        <div className="aw-split aw-split-wide aw-fade-in" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 8fr) minmax(300px, 4fr)', alignItems: 'start' }}>

                            {/* ── Left: loan details (read-only) ── */}
                            <div className="aw-stack" style={{ minWidth: 0 }}>
                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><User size={14} /></span>
                                        <h2 className="aw-card-title">Applicant Profile</h2>
                                        <span className="aw-pill" style={{ marginLeft: 'auto', textTransform: 'uppercase' }}>{loanDetails.loanType}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--aw-gap)' }}>
                                        <Fact label="Member No">{loanDetails.memberNo}</Fact>
                                        <Fact label="Application Date">
                                            {dayjs(loanDetails.applicationDate).isValid() ? dayjs(loanDetails.applicationDate).format('DD-MM-YYYY') : '-'}
                                        </Fact>
                                        <Fact label="Full Name" span2>{loanDetails.memberName}</Fact>
                                        <Fact label="Form No.">{loanDetails.formNumber}</Fact>
                                        <Fact label="Office / Dept" span2>{loanDetails.officeNo} - {loanDetails.officeName}</Fact>
                                        <Fact label="Purpose">{loanDetails.purpose}</Fact>
                                        <Fact label="Share Amount" tone="var(--aw-success)">{formatCurrency(loanDetails.shareAmount)}</Fact>
                                        <Fact label="Basic Pay">{formatCurrency(loanDetails.basicPay)}</Fact>
                                        <Fact label="Applied Amount" tone="var(--aw-success)">{formatCurrency(loanDetails.appliedAmount)}</Fact>
                                        <Fact label="Existing Balance" tone="var(--aw-danger)">{formatCurrency(loanDetails.currentBalance)}</Fact>
                                    </div>
                                </section>

                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><Users size={14} /></span>
                                        <h2 className="aw-card-title">Surety Obligations</h2>
                                    </div>
                                    <div className="aw-two">
                                        {surety(1)}
                                        {surety(2)}
                                    </div>
                                </section>
                            </div>

                            {/* ── Right: sanction controls ── */}
                            <div className="aw-stack" style={{ minWidth: 0 }}>
                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <h2 className="aw-card-title">Rules</h2>
                                        <span className="aw-label" style={{ marginLeft: 'auto', marginBottom: 0 }}>Amount</span>
                                    </div>
                                    <div className="aw-rows">
                                        <label className="aw-row" style={{ cursor: 'pointer', alignItems: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={rules.sharesBalance} onChange={() => toggleRule('sharesBalance')} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
                                                <span className="aw-row-label" style={{ color: 'var(--aw-text)' }}>Shares Balance</span>
                                            </span>
                                            <span className="aw-row-value" style={{ color: 'var(--aw-danger)' }}>{formatCurrency(loanDetails.shareAmount).replace('₹', '')}</span>
                                        </label>
                                        <label className="aw-row" style={{ cursor: 'pointer', alignItems: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={rules.tenPercentOfLoan} onChange={() => toggleRule('tenPercentOfLoan')} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
                                                <span className="aw-row-label" style={{ color: 'var(--aw-text)' }}>10 % Of Loan</span>
                                            </span>
                                            <span className="aw-row-value" style={{ color: 'var(--aw-danger)' }}>{applied10}</span>
                                        </label>
                                    </div>
                                </section>

                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><Scale size={14} /></span>
                                        <h2 className="aw-card-title">Approval Parameters</h2>
                                    </div>
                                    <div className="aw-stack">
                                        <div>
                                            <label className="aw-label" htmlFor="ls-amt">Sanction Amount</label>
                                            <div className="aw-input-wrap has-action">
                                                <input id="ls-amt" className="aw-input" style={{ color: 'var(--aw-success)', fontWeight: 700 }} value={sanctionDetails.sanctionedAmount}
                                                    onChange={(e) => updateSanctionField('sanctionedAmount', e.target.value)} />
                                                <span className="aw-meta" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>INR</span>
                                            </div>
                                        </div>

                                        <div className="aw-two">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-inst">Installments</label>
                                                <input id="ls-inst" className="aw-input" value={sanctionDetails.noOfInstallments} onChange={(e) => updateSanctionField('noOfInstallments', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-rate">Rate %</label>
                                                <input id="ls-rate" className="aw-input" value={sanctionDetails.rate} onChange={(e) => updateSanctionField('rate', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="aw-two">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-date">Sanction Date</label>
                                                <input id="ls-date" className="aw-input" value={sanctionDetails.sanctionDate} readOnly placeholder="DD-MM-YYYY" />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-pen">Penalty %</label>
                                                <input id="ls-pen" className="aw-input" style={{ color: 'var(--aw-danger)' }} value={sanctionDetails.penalRate} onChange={(e) => updateSanctionField('penalRate', e.target.value)} />
                                            </div>
                                        </div>

                                        <div style={{ paddingTop: 'var(--aw-gap)', borderTop: '1px solid var(--aw-border)' }} className="aw-stack">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-emi">Installment Amt</label>
                                                <input id="ls-emi" className="aw-input" value={sanctionDetails.installmentAmount} onChange={(e) => updateSanctionField('installmentAmount', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-int">Total Interest</label>
                                                <input id="ls-int" className="aw-input" style={{ color: 'var(--aw-success)' }} value={sanctionDetails.interestAmount} onChange={(e) => updateSanctionField('interestAmount', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={12} /> Credit Approval Dept · Auth Level: EXECUTIVE</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Secure Transaction</span>
            </div>
        </div>
    );
};

export default LoanSanctionForm;
