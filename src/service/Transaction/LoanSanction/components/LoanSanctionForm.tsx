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
import ReagreementQuotePanel from '@/components/shared/loan/ReagreementQuotePanel';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const Fact: React.FC<{ label: string; tone?: string; span2?: boolean; children: React.ReactNode }> = ({ label, tone, span2, children }) => (
    <div style={span2 ? { gridColumn: 'span 2' } : undefined}>
        <span className="aw-label">{label}</span>
        <div className="aw-strong" style={{ color: tone, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</div>
    </div>
);

/** Binds the global toolbar's Save slot to "Sanction". Only for the standalone window: inside a dialog it would
 *  take over the toolbar of the screen underneath (Loan Payment keeps its own Save). */
const SanctionToolbar: React.FC<{ onSave: () => void; isSaving: boolean; enabled: boolean }> = ({ onSave, isSaving, enabled }) => {
    usePageToolbarActions({
        onSave,
        saveLabel: isSaving ? 'Processing...' : 'Sanction',
        saveEnabled: enabled,
    });
    return null;
};

const LoanSanctionForm: React.FC<LoanSanctionHookReturn & { embedded?: boolean }> = ({
    embedded = false,
    reagreement,
    raQuote,
    raQuoteLoading,
    rateDefaults,
    previewLoading,
    loanCases,
    selectedLoanCase,
    isLoadingCases,
    isSaving,
    loanDetails,
    sanctionDetails,
    eligibility,
    handleLoanCaseChange,
    updateSanctionField,
    handleSanctionSave,
    formatCurrency,
    handleExit,
}) => {
  const { t } = useTranslation();
    // Legacy parity: the global toolbar's Save slot becomes "Sanction" here,
    // triggers the same handler, and mirrors this screen's own disabled state.
    const canSanction = !!selectedLoanCase && !isSaving && (!reagreement || !!raQuote?.valid);

    const surety = (n: 1 | 2) => {
        const gr = n === 1 ? loanDetails.surety1Gr : loanDetails.surety2Gr;
        const name = n === 1 ? loanDetails.surety1Name : loanDetails.surety2Name;
        const office = n === 1 ? loanDetails.surety1Office : loanDetails.surety2Office;
        const bal = n === 1 ? loanDetails.surety1LoanBalance : loanDetails.surety2LoanBalance;
        return (
            <div className="aw-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="aw-label" style={{ marginBottom: 0 }}>{t('Surety 0')}{n}</span>
                    <span className="aw-strong" style={{ color: 'var(--aw-accent)', fontFamily: 'monospace' }}>{gr || '-'}</span>
                </div>
                <div className="aw-strong" style={{ marginTop: 4, minHeight: 18 }}>{name || '-'}</div>
                <div className="aw-meta" style={{ minHeight: 18 }}>{office || '-'}</div>
                <div className="aw-row" style={{ marginTop: 8, paddingBottom: 0 }}>
                    <span className="aw-row-label">{t('Loan Bal')}</span>
                    <span className="aw-row-value" style={{ color: 'var(--aw-danger)' }}>{bal ? formatCurrency(bal) : '-'}</span>
                </div>
            </div>
        );
    };

    const inr = (n: number | string | undefined | null) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
    const hasShortfall = !!eligibility && eligibility.totalShortfall > 0;
    const overLimit = !!eligibility && !eligibility.isEligible;
    const eligTone = overLimit ? 'danger' : hasShortfall ? 'warning' : 'success';
    const shortCell = (v: number) => (
        <td className="is-right" style={v > 0 ? { color: 'var(--aw-warning)', fontWeight: 600 } : { color: 'var(--aw-muted)' }}>{v > 0 ? inr(v) : '—'}</td>
    );
    // The principal the application recorded can differ from the loan's position today (e.g. the loan was
    // topped up or consolidated after the application was entered). Show it instead of hiding it.
    const storedPrincipal = Number(reagreement?.position?.outstandingPrincipal ?? NaN);
    const livePrincipal = Number(raQuote?.position?.outstandingPrincipal ?? NaN);
    const principalDrifted = Number.isFinite(storedPrincipal) && Number.isFinite(livePrincipal) && Math.abs(storedPrincipal - livePrincipal) > 0.005;

    return (
        <div className={embedded ? undefined : 'app-window aw-calm'}>
            {!embedded && <SanctionToolbar onSave={handleSanctionSave} isSaving={isSaving} enabled={canSanction} />}
            {/* ── Header ── */}
            {!embedded && (<div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Loan Sanction Console')}{reagreement && <span className="aw-pill tone-warning" style={{ marginLeft: 10 }}>RE-AGREEMENT</span>}</h1>
                    <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldCheck size={12} /> {t('Executive Authority')}
                    </p>
                </div>
                <div className="aw-actions">
                    <span className="aw-pill">{t('{{1}} pending', { 1: loanCases.length })}</span>
                    <button type="button" onClick={handleSanctionSave} disabled={!selectedLoanCase || isSaving || (!!reagreement && !raQuote?.valid)} className="aw-btn aw-btn-primary">
                        {isSaving ? <RefreshCw size={13} className="aw-spin" /> : <CheckCircle size={13} />}
                        {isSaving ? t('Processing...') : t('Sanction')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost">
                        <X size={13} /> {t('Exit')}
                    </button>
                </div>
            </div>)}

            <div className={embedded ? undefined : 'aw-content'}>
                <div className="aw-stack">

                    {/* ── Case selection ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Loan case no')}</h2>
                        </div>
                        <Select
                            id="ls-case"
                            showSearch
                            value={(selectedLoanCase || undefined) as string}
                            onChange={handleLoanCaseChange}
                            loading={isLoadingCases}
                            className="aw-select"
                            popupClassName="aw-select-popup"
                            placeholder={t('Select a loan case for review...')}
                            optionFilterProp="label"
                            listHeight={400}
                            options={loanCases.map(loan => ({
                                value: loan.loanCaseNo,
                                label: `${loan.loanCaseNo} - ${loan.memberName} (${loan.loanType}) | ${formatCurrency(loan.appliedAmount)}${loan.applicationKind === 'REAGREEMENT' ? '  [RE-AGREEMENT]' : ''}`,
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
                                        <h2 className="aw-card-title">{t('Applicant profile')}</h2>
                                        <span className="aw-pill" style={{ marginLeft: 'auto' }}>{loanDetails.loanType}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--aw-gap)' }}>
                                        <Fact label={t('Member No')}>{loanDetails.memberNo}</Fact>
                                        <Fact label={t('Application Date')}>
                                            {dayjs(loanDetails.applicationDate).isValid() ? dayjs(loanDetails.applicationDate).format('DD-MM-YYYY') : '-'}
                                        </Fact>
                                        <Fact label={t('Full Name')} span2>{loanDetails.memberName}</Fact>
                                        <Fact label={t('Form No.')}>{loanDetails.formNumber}</Fact>
                                        <Fact label={t('Office / Dept')} span2>{loanDetails.officeNo} - {loanDetails.officeName}</Fact>
                                        <Fact label={t('Purpose')}>{loanDetails.purpose}</Fact>
                                        <Fact label={t('Share Amount')} tone="var(--aw-success)">{formatCurrency(loanDetails.shareAmount)}</Fact>
                                        <Fact label={t('Basic Pay')}>{formatCurrency(loanDetails.basicPay)}</Fact>
                                        <Fact label={t('Applied Amount')} tone="var(--aw-success)">{formatCurrency(loanDetails.appliedAmount)}</Fact>
                                        <Fact label={t('Existing Balance')} tone="var(--aw-danger)">{formatCurrency(loanDetails.currentBalance)}</Fact>
                                    </div>
                                </section>

                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><Users size={14} /></span>
                                        <h2 className="aw-card-title">{t('Surety obligations')}</h2>
                                    </div>
                                    <div className="aw-two">
                                        {surety(1)}
                                        {surety(2)}
                                    </div>
                                </section>

                                {/* ── Share value / RD requirement: what the member holds, what is short, what is withheld ── */}
                                {!reagreement && eligibility && (
                                    <section className="aw-card aw-fade-in">
                                        <div className="aw-card-head">
                                            <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                                            <h2 className="aw-card-title">{eligibility.rdBacked ? t('Loan Against RD') : t('Share value and RD requirement')}</h2>
                                            <span className={`aw-pill tone-${eligTone}`} style={{ marginLeft: 'auto' }}>
                                                {overLimit ? t('Over limit') : hasShortfall ? t('Shortfall') : t('Met')}
                                            </span>
                                        </div>
                                        {eligibility.rdBacked ? (
                                            <div className="aw-two">
                                                <Fact label={t('Free RD')}>{inr(eligibility.freeRd)}</Fact>
                                                <Fact label={t('Largest loan allowed')} tone="var(--aw-success)">{inr(eligibility.maxLoanAmount)}</Fact>
                                            </div>
                                        ) : (
                                            <div className="aw-stack" style={{ gap: 8 }}>
                                                <p className="aw-meta" style={{ color: eligibility.withinMaxLimit ? undefined : 'var(--aw-danger)' }}>
                                                    {t('Exposure')}: {t('existing')} {inr(eligibility.existingOutstanding)} + {t('this loan')} {inr(eligibility.loanAmount)} = <strong>{inr(eligibility.totalExposure)}</strong> {t('of')} {inr(eligibility.maxLimit)} {t('limit')}
                                                    {eligibility.sanctionedNotPaid > 0 && <> · {t('sanctioned, not yet paid')} {inr(eligibility.sanctionedNotPaid)}</>}
                                                </p>
                                                <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                                                    <table className="aw-table">
                                                        <thead>
                                                            <tr><th /><th className="is-right">{t('Member has')}</th><th className="is-right">{t('Required')}</th><th className="is-right">{t('Shortfall')}</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>{t('Share value')} <span className="aw-meta">{eligibility.sharePct}%</span></td>
                                                                <td className="is-right">{inr(eligibility.currentShare)}</td>
                                                                <td className="is-right">{inr(eligibility.requiredShare)}</td>
                                                                {shortCell(eligibility.shareShortfall)}
                                                            </tr>
                                                            <tr>
                                                                <td>{t('RD balance')} <span className="aw-meta">{eligibility.rdPct}%</span></td>
                                                                <td className="is-right">{inr(eligibility.currentRd)}</td>
                                                                <td className="is-right">{inr(eligibility.requiredRd)}</td>
                                                                {shortCell(eligibility.rdShortfall)}
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {hasShortfall && eligibility.withinMaxLimit && (
                                                    <div className="aw-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                                                        <span className="aw-meta">
                                                            {t('Adjusted from the payout')}: {eligibility.shareShortfall > 0 && <>{t('Share')} <strong>{inr(eligibility.shareShortfall)}</strong></>}
                                                            {eligibility.shareShortfall > 0 && eligibility.rdShortfall > 0 && ' + '}
                                                            {eligibility.rdShortfall > 0 && <>{t('RD')} <strong>{inr(eligibility.rdShortfall)}</strong></>}
                                                            {' = '}<strong style={{ color: 'var(--aw-warning)' }}>{inr(eligibility.totalShortfall)}</strong>
                                                        </span>
                                                        <span className="aw-strong" style={{ color: 'var(--aw-success)' }}>{t('Net payable')} {inr(eligibility.netDisbursement)}</span>
                                                    </div>
                                                )}
                                                {!hasShortfall && !overLimit && (
                                                    <p className="aw-meta" style={{ color: 'var(--aw-success)' }}>✓ {t('Share value and RD meet the requirement; nothing is adjusted from the payout.')}</p>
                                                )}
                                                {overLimit && eligibility.message && (
                                                    <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0, padding: '6px 10px' }}>{eligibility.message}</div>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {reagreement && (
                                    <section className="aw-card aw-fade-in">
                                        <div className="aw-card-head">
                                            <span className="aw-card-icon"><FileText size={14} /></span>
                                            <h2 className="aw-card-title">{t('{{1}} {{2}} — calculated by the server', { 1: t('Re-agreement'), 2: reagreement.reagreementNo })}</h2>
                                        </div>
                                        <p className="aw-meta" style={{ marginBottom: 8 }}>{t('Case #{{1}} → new case #{{2}}. Change the tenure or rate; installment and interest are recalculated automatically. No new money is paid out.', { 1: reagreement.oldLoanCaseNo, 2: reagreement.newLoanCaseNo })}</p>
                                        {principalDrifted && (
                                            <div className="aw-alert aw-alert-warning" style={{ marginBottom: 8, padding: '6px 10px' }}>
                                                {t('The loan changed after this application was entered: it recorded principal {{1}}, the loan stands at {{2}} today. The figures below use today\'s position.', { 1: inr(storedPrincipal), 2: inr(livePrincipal) })}
                                            </div>
                                        )}
                                        <ReagreementQuotePanel quote={raQuote} loading={raQuoteLoading} hideSchedule />
                                    </section>
                                )}
                            </div>

                            {/* ── Right: sanction controls ── */}
                            <div className="aw-stack" style={{ minWidth: 0 }}>
                                <section className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><Scale size={14} /></span>
                                        <h2 className="aw-card-title">{t('Approval parameters')}</h2>
                                    </div>
                                    <div className="aw-stack">
                                        <div>
                                            <label className="aw-label" htmlFor="ls-amt">{reagreement ? t('Principal carried over (locked)') : t('Sanction Amount')}</label>
                                            <div className="aw-input-wrap has-action">
                                                <input id="ls-amt" className="aw-input" style={{ color: 'var(--aw-success)', fontWeight: 600 }} value={sanctionDetails.sanctionedAmount}
                                                    readOnly={!!reagreement}
                                                    onChange={(e) => updateSanctionField('sanctionedAmount', e.target.value)} />
                                                <span className="aw-meta" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>INR</span>
                                            </div>
                                        </div>

                                        <div className="aw-two">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-inst">{t('Installments')}</label>
                                                <input id="ls-inst" className="aw-input" value={sanctionDetails.noOfInstallments} onChange={(e) => updateSanctionField('noOfInstallments', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-rate">{t('Rate %')}</label>
                                                <input id="ls-rate" className="aw-input" value={sanctionDetails.rate} onChange={(e) => updateSanctionField('rate', e.target.value)} />
                                                {!reagreement && rateDefaults && (
                                                    <span className="aw-meta" data-testid="ls-rate-hint">{t('Business Rules: {{1}}%', { 1: rateDefaults.rate })}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="aw-two">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-date">{t('Sanction Date')}</label>
                                                <input id="ls-date" className="aw-input" value={sanctionDetails.sanctionDate} readOnly placeholder="DD-MM-YYYY" />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-pen">{t('Penalty %')}</label>
                                                <input id="ls-pen" className="aw-input" style={{ color: 'var(--aw-danger)' }} value={sanctionDetails.penalRate} onChange={(e) => updateSanctionField('penalRate', e.target.value)} />
                                                {rateDefaults && (
                                                    <span className="aw-meta" data-testid="ls-pen-hint">{t('Business Rules: {{1}}%', { 1: rateDefaults.penalRate })}</span>
                                                )}
                                            </div>
                                        </div>

                                        {rateDefaults && (
                                            (!reagreement && Math.abs(parseFloat(sanctionDetails.rate) - rateDefaults.rate) > 0.0001) ||
                                            Math.abs(parseFloat(sanctionDetails.penalRate) - rateDefaults.penalRate) > 0.0001
                                        ) && (
                                            <div>
                                                <label className="aw-label" htmlFor="ls-reason">{reagreement ? t('Reason for a different penalty (this customer only)') : t('Reason for a different rate / penalty (this customer only)')}</label>
                                                <input id="ls-reason" className="aw-input" maxLength={200} value={sanctionDetails.rateOverrideReason}
                                                    placeholder={t('Required: why this customer differs from Business Rules')}
                                                    onChange={(e) => updateSanctionField('rateOverrideReason', e.target.value)} />
                                            </div>
                                        )}

                                        <div style={{ paddingTop: 'var(--aw-gap)', borderTop: '1px solid var(--aw-border)' }} className="aw-stack">
                                            <div>
                                                <label className="aw-label" htmlFor="ls-emi">{t('Installment Amt')}{previewLoading ? ' …' : ''}</label>
                                                <input id="ls-emi" className="aw-input" value={sanctionDetails.installmentAmount} readOnly />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="ls-int">{t('Total Interest')}</label>
                                                <input id="ls-int" className="aw-input" style={{ color: 'var(--aw-success)' }} value={sanctionDetails.interestAmount} readOnly />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>
                        </div>
                    )}

                    {embedded && (
                        <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" onClick={handleExit} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
                            <button type="button" onClick={handleSanctionSave} disabled={!canSanction} className="aw-btn aw-btn-primary">
                                {isSaving ? <RefreshCw size={13} className="aw-spin" /> : <CheckCircle size={13} />}
                                {isSaving ? t('Processing...') : t('Sanction')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!embedded && (
                <div className="aw-footer">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={12} /> {t('Credit Approval Dept · Auth Level: EXECUTIVE')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={12} /> {t('Secure Transaction')}</span>
                </div>
            )}
        </div>
    );
};

export default LoanSanctionForm;
