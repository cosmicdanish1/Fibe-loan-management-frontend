import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Banknote, Calendar, CalendarClock, Check, ClipboardCopy, IndianRupee, ListOrdered, Percent, RotateCcw, Scale, Sparkles, TrendingUp, Wallet, AlertTriangle,
} from 'lucide-react';
import { CalcStatus, ChipGroup, DateField, Kpi, NumField, SectionHead, WaitingForInput } from '../components/parts';
import { copyText, dateLabel, money, monthLabel, num2, toNum, todayYmd } from '../lib/format';
import { useServerCalc } from '../lib/useServerCalc';
import type { CalculatorRules, LoanEmiResult, LoanTypeCode, RoundingMode } from '../lib/types';

type TypeChoice = LoanTypeCode | 'CUSTOM';
type View = 'member' | 'rb' | 'bank';

const buildStatement = (r: LoanEmiResult): string => [
  'SOCIETY CALCULATOR - LOAN EMI (society method)',
  `Loan amount        : ${money(r.inputs.loanAmount)}`,
  `Rate / installments: ${r.inputs.annualRate} % / ${r.inputs.installments}`,
  `Applied / paid out : ${dateLabel(r.inputs.applicationDate)} / ${dateLabel(r.inputs.disbursementDate)}`,
  `Slot               : ${r.slot.label} (delay interest ${r.slot.interestDelayMonths} mo, first EMI ${r.slot.firstDueDelayMonths} mo after payout month)`,
  '',
  ...r.steps,
  '',
  `Monthly principal  : ${money(r.monthlyPrincipal)}`,
  `Monthly interest   : ${money(r.monthlyInterest)}  (rounding ${r.inputs.roundingMode})`,
  `MONTHLY EMI        : ${money(r.emi)}`,
  `Total payable      : ${money(r.totalPayable)}   (interest ${money(r.totalInterestPaid)})`,
  `First / last due   : ${monthLabel(r.firstDueMonth)} / ${monthLabel(r.lastDueMonth)}`,
  `Bank-style EMI     : ${money(r.bankStyle.emi)} (for comparison only, not charged)`,
].join('\n');

const LoanEmiTab: React.FC<{ rules: CalculatorRules | null }> = ({ rules }) => {
  const { t } = useTranslation();
  const [type, setType] = useState<TypeChoice>('CUSTOM');
  const [amount, setAmount] = useState('300000');
  const [rate, setRate] = useState('12');
  const [months, setMonths] = useState('40');
  const [appDate, setAppDate] = useState(todayYmd());
  const [disbDate, setDisbDate] = useState('');
  const [rounding, setRounding] = useState<'LIVE' | RoundingMode>('LIVE');
  const [carried, setCarried] = useState('');
  const [view, setView] = useState<View>('member');
  const [copied, setCopied] = useState(false);

  // choosing a loan type loads its live Business Rules rate
  useEffect(() => {
    if (type !== 'CUSTOM' && rules) setRate(String(rules.loanTypes[type].rate));
  }, [type, rules]);

  const typeRules = type !== 'CUSTOM' ? rules?.loanTypes[type] : undefined;
  const graceDay = (typeRules ?? rules?.loanTypes.RLN)?.graceDays || 0;

  const a = toNum(amount), r = toNum(rate), n = toNum(months);
  const body = useMemo(() => {
    if (!(a > 0) || !Number.isFinite(r) || !(n >= 1) || !Number.isInteger(n)) return null;
    const b: Record<string, unknown> = {
      loanAmount: a, annualRate: r, installments: n, applicationDate: appDate, disbursementDate: disbDate || appDate,
    };
    if (rounding !== 'LIVE') b.roundingMode = rounding;
    const c = toNum(carried);
    if (c > 0) b.carriedInterest = c;
    if (graceDay > 0) b.graceDay = graceDay;
    return b;
  }, [a, r, n, appDate, disbDate, rounding, carried, graceDay]);

  const { data, error, fieldErrors, loading } = useServerCalc<LoanEmiResult>('loan-emi', body);

  const limitWarning = useMemo(() => {
    if (!typeRules) return null;
    const w: string[] = [];
    if (a > typeRules.maxAmount) w.push(t('Amount is above the {{1}} limit of {{2}}.', { 1: typeRules.name, 2: money(typeRules.maxAmount) }));
    if (n > typeRules.maxInstallments) w.push(t('Installments are above the {{1}} limit of {{2}}.', { 1: typeRules.name, 2: typeRules.maxInstallments }));
    return w.length ? w.join(' ') : null;
  }, [typeRules, a, n, t]);

  const reset = () => {
    setType('CUSTOM'); setAmount('300000'); setRate('12'); setMonths('40'); setAppDate(todayYmd()); setDisbDate('');
    setRounding('LIVE'); setCarried(''); setView('member');
  };
  const copy = async () => {
    if (!data) return;
    if (await copyText(buildStatement(data))) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  const liveRounding = rules?.roundingMode ?? 'NEAREST';

  return (
    <div className="aw-split">
      {/* ── inputs ── */}
      <div className="aw-side">
        <section className="aw-card">
          <div className="aw-card-head">
            <span className="aw-card-icon"><Banknote size={14} /></span>
            <h2 className="aw-card-title">{t('Loan')}</h2>
          </div>
          <div className="aw-stack">
            <ChipGroup<TypeChoice>
              label={t('Loan type')} value={type} onChange={setType}
              options={[
                { value: 'CUSTOM', label: t('Custom') },
                { value: 'RLN', label: t('Regular'), tip: rules ? `${rules.loanTypes.RLN.rate} %` : undefined },
                { value: 'ALN', label: t('Emergency'), tip: rules ? `${rules.loanTypes.ALN.rate} %` : undefined },
                { value: 'ELN', label: t('Against RD'), tip: rules ? `${rules.loanTypes.ELN.rate} %` : undefined },
              ]}
            />
            <NumField id="sc-amt" label={t('Loan amount (₹)')} value={amount} onChange={setAmount} prefix={<IndianRupee size={13} />}
              hint={typeRules ? t('Limit {{1}}', { 1: money(typeRules.maxAmount) }) : undefined} />
            <NumField id="sc-rate" label={t('Interest rate (% per year)')} value={rate} onChange={(v) => { setRate(v); }} prefix={<Percent size={13} />}
              hint={typeRules ? t('From Business Rules. Edit to try another rate.') : undefined} />
            <NumField id="sc-n" label={t('Installments (months)')} value={months} onChange={setMonths} kind="int" prefix={<ListOrdered size={13} />}
              hint={typeRules ? t('Limit {{1}}', { 1: typeRules.maxInstallments }) : undefined} />
            {limitWarning && (
              <div className="aw-alert aw-alert-warning aw-fade-in" role="status"><AlertTriangle size={14} /><span>{limitWarning}</span></div>
            )}
          </div>
        </section>

        <section className="aw-card">
          <div className="aw-card-head">
            <span className="aw-card-icon"><Calendar size={14} /></span>
            <h2 className="aw-card-title">{t('Dates')}</h2>
          </div>
          <div className="aw-stack">
            <DateField id="sc-app" label={t('Application date')} value={appDate} onChange={setAppDate}
              hint={t('The day of the month decides Slot 1 or Slot 2.')} />
            <DateField id="sc-disb" label={t('Payout (disbursement) date')} value={disbDate || appDate} onChange={setDisbDate}
              hint={t('Decides the month of installment 1.')} />
          </div>
        </section>

        <section className="aw-card">
          <div className="aw-card-head">
            <span className="aw-card-icon"><Sparkles size={14} /></span>
            <h2 className="aw-card-title">{t('Options')}</h2>
          </div>
          <div className="aw-stack">
            <ChipGroup<'LIVE' | RoundingMode>
              label={t('Rounding of monthly interest')} value={rounding} onChange={setRounding}
              options={[
                { value: 'LIVE', label: `${t('Live')} (${liveRounding})`, tip: t('The rule set in Business Rules') },
                { value: 'NEAREST', label: t('Nearest') }, { value: 'UP', label: t('Up') },
                { value: 'DOWN', label: t('Down') }, { value: 'NONE', label: t('Paise') },
              ]}
            />
            <NumField id="sc-carried" label={t('Carried interest (re-agreement) ₹')} value={carried} onChange={setCarried}
              placeholder="0" hint={t('Leave empty for a new loan.')} />
          </div>
        </section>
      </div>

      {/* ── result ── */}
      <section className="aw-card aw-main">
        <div className="aw-main-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="aw-strong">{t('Society-method EMI')}</span>
          <div className="aw-actions">
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={copy} disabled={!data}>
              {copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? t('Copied') : t('Copy statement')}
            </button>
            <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={reset}><RotateCcw size={13} /> {t('Reset')}</button>
          </div>
        </div>

        <div className="aw-main-body">
          <div className="aw-stack">
            <CalcStatus loading={loading} error={error} fieldErrors={fieldErrors} />

            {!data ? (
              !error && <WaitingForInput icon={<Wallet size={20} />} text={t('Enter the loan amount, rate, installments and dates to see the EMI.')} />
            ) : (
              <div className="aw-stack aw-fade-in" style={{ opacity: loading ? 0.65 : 1, transition: 'opacity .15s' }}>
                <div className="aw-stats aw-stats-4">
                  <Kpi icon={<TrendingUp size={14} />} label={t('Monthly EMI')} value={money(data.emi)} tone="tone-info" sub={`${money(data.monthlyPrincipal)} + ${money(data.monthlyInterest)}`} />
                  <Kpi icon={<Percent size={14} />} label={t('Monthly interest')} value={money(data.monthlyInterest)} tone="tone-warning" sub={`${t('before rounding')} ${num2(data.monthlyInterestUnrounded)}`} />
                  <Kpi icon={<Wallet size={14} />} label={t('Total payable')} value={money(data.totalPayable)} tone="tone-success" sub={`${data.inputs.installments} × ${money(data.emi)}`} />
                  <Kpi icon={<Scale size={14} />} label={t('Total interest')} value={money(data.totalInterestPaid)} tone="tone-danger" sub={`${t('delay interest')} ${money(data.delayInterest)}`} />
                </div>

                <div className="aw-panel aw-panel-accent">
                  <SectionHead icon={<CalendarClock size={14} style={{ color: 'var(--aw-accent)' }} />} title={t('How this EMI is built')}
                    right={<span className="aw-pill">{data.slot.label}</span>} />
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.steps.map((s, i) => <li key={i} className="aw-muted" style={{ lineHeight: 1.5 }}>{s}</li>)}
                  </ol>
                  <dl className="aw-facts aw-facts-4" style={{ marginTop: 12 }}>
                    <div><dt>{t('First installment')}</dt><dd>{monthLabel(data.firstDueMonth)}</dd></div>
                    <div><dt>{t('Last installment')}</dt><dd>{monthLabel(data.lastDueMonth)}</dd></div>
                    <div><dt>{t('Delay interest')}</dt><dd>{money(data.delayInterest)}</dd></div>
                    <div><dt>{t('True RB interest')}</dt><dd>{money(data.totalRbInterest)}</dd></div>
                  </dl>
                </div>

                <div className="aw-chips" role="tablist" aria-label={t('Schedule view')}>
                  {([['member', t('Member installment schedule')], ['rb', t('True reducing-balance schedule')], ['bank', t('Compare with bank-style EMI')]] as Array<[View, string]>).map(([v, label]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} aria-checked={view === v} className="aw-chip" onClick={() => setView(v)}>{label}</button>
                  ))}
                </div>

                {view === 'member' && (
                  <div className="aw-table-wrap aw-fade-in">
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th>#</th><th>{t('Due')}</th><th className="is-right">{t('Opening')}</th><th className="is-right">{t('Principal')}</th>
                          <th className="is-right">{t('Interest')}</th><th className="is-right">{t('Installment')}</th><th className="is-right">{t('Balance')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.schedule.map((row) => (
                          <tr key={row.no}>
                            <td className="is-accent">{row.no}</td>
                            <td>{row.dueDate ? dateLabel(row.dueDate) : monthLabel(row.dueMonth)}</td>
                            <td className="is-right is-muted">{money(row.openingBalance)}</td>
                            <td className="is-right">{money(row.principal)}</td>
                            <td className="is-right is-accent">{money(row.interest)}</td>
                            <td className="is-right">{money(row.installment)}</td>
                            <td className="is-right is-muted">{money(row.closingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {view === 'rb' && (
                  <div className="aw-fade-in aw-stack">
                    <p className="aw-muted">{t('This is the loan\'s true economics (equal principal, interest on the falling balance). The member never pays this table: it sizes the EMI above and is used when a loan is closed early.')}</p>
                    <div className="aw-table-wrap">
                      <table className="aw-table">
                        <thead>
                          <tr><th>#</th><th className="is-right">{t('Opening')}</th><th className="is-right">{t('RB interest')}</th><th className="is-right">{t('Principal')}</th><th className="is-right">{t('Closing')}</th></tr>
                        </thead>
                        <tbody>
                          {data.rbSchedule.map((row) => (
                            <tr key={row.no}>
                              <td className="is-accent">{row.no}</td>
                              <td className="is-right is-muted">{money(row.openingBalance)}</td>
                              <td className="is-right is-accent">{money(row.rbInterest)}</td>
                              <td className="is-right">{money(row.principal)}</td>
                              <td className="is-right is-muted">{money(row.closingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {view === 'bank' && (
                  <div className="aw-two aw-fade-in">
                    <div className="aw-compare-card">
                      <div className="aw-compare-head"><span className="aw-strong">{t('Society method (charged)')}</span><span className="aw-pill">{t('real')}</span></div>
                      <div className="aw-compare-body">
                        <div className="aw-rows">
                          <div className="aw-row"><span className="aw-row-label">{t('EMI')}</span><span className="aw-row-value" style={{ color: 'var(--aw-accent)' }}>{money(data.emi)}</span></div>
                          <div className="aw-row"><span className="aw-row-label">{t('Total payable')}</span><span className="aw-row-value">{money(data.totalPayable)}</span></div>
                          <div className="aw-row"><span className="aw-row-label">{t('Total interest')}</span><span className="aw-row-value">{money(data.totalInterestPaid)}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="aw-compare-card">
                      <div className="aw-compare-head"><span className="aw-strong">{t('Bank-style EMI (not charged)')}</span><span className="aw-pill">{t('old Calculator')}</span></div>
                      <div className="aw-compare-body">
                        <div className="aw-rows">
                          <div className="aw-row"><span className="aw-row-label">{t('EMI')}</span><span className="aw-row-value">{money(data.bankStyle.emi)}</span></div>
                          <div className="aw-row"><span className="aw-row-label">{t('Total payable')}</span><span className="aw-row-value">{money(data.bankStyle.totalPayable)}</span></div>
                          <div className="aw-row"><span className="aw-row-label">{t('Total interest')}</span><span className="aw-row-value">{money(data.bankStyle.totalInterest)}</span></div>
                        </div>
                      </div>
                      <div className="aw-compare-total"><span>{data.bankStyle.emiDifference >= 0 ? t('Society EMI is higher by') : t('Society EMI is lower by')}</span><span>{money(Math.abs(data.bankStyle.emiDifference))}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoanEmiTab;
