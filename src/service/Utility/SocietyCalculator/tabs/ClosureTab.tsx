import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Banknote, Calendar, Check, ClipboardCopy, FileText, IndianRupee, ListOrdered, PiggyBank, Percent, RotateCcw, Scale, TrendingDown, Wallet, ListChecks, AlertTriangle,
} from 'lucide-react';
import { CalcStatus, ChipGroup, DateField, Kpi, NumField, SectionHead, WaitingForInput } from '../components/parts';
import { copyText, dateLabel, money, monthLabel, toNum, todayYmd } from '../lib/format';
import { useServerCalc } from '../lib/useServerCalc';
import type { CalculatorRules, ClosureResult, LoanTypeCode, RoundingMode } from '../lib/types';

type TypeChoice = LoanTypeCode | 'CUSTOM';
interface Override { p: string; i: string }

const statement = (r: ClosureResult): string => [
  'SOCIETY CALCULATOR - LOAN EARLY CLOSURE (Method B, average principal)',
  `Loan ${money(r.inputs.loanAmount)} at ${r.inputs.annualRate} % for ${r.inputs.installments} installments; EMI ${money(r.emi.installment)} (${money(r.emi.monthlyPrincipal)} + ${money(r.emi.monthlyInterest)})`,
  `Closure date: ${dateLabel(r.inputs.closureDate)}`,
  '',
  ...r.steps.map((s, i) => `${i + 1}. ${s}`),
  '',
  ...(r.register.length ? ['Month | Unpaid principal | Interest | Penalty | Total', ...r.register.map((x) => `${monthLabel(x.month)} | ${money(x.unpaidPrincipal)} | ${money(x.interestDue)} | ${money(x.penalty)} | ${money(x.monthTotal)}`), ''] : []),
  `Outstanding principal : ${money(r.outstandingPrincipal)}`,
  `NR interest           : ${money(r.nrInterest)}`,
  `AP interest           : ${money(r.apInterest)}`,
  `Closure interest      : ${money(r.closureInterest)}`,
  `Penalty               : ${money(r.penalInterest)}`,
  ...(r.adjustment ? [`Adjustment            : ${money(r.adjustment)}`] : []),
  ...(r.principalAdjustment + r.interestAdjustment ? [`Less deductions       : ${money(r.principalAdjustment + r.interestAdjustment)}`] : []),
  `FINAL CLOSURE AMOUNT  : ${money(r.finalClosureAmount)}`,
  `Remaining EMIs would cost ${money(r.remainingEmiTotal)}; interest saved ${money(r.interestSaved)}`,
  ...(r.rdShare.appliedFromRdShare > 0 ? [`From RD ${money(r.rdShare.fromRd)} + Share ${money(r.rdShare.fromShare)}; payable by member ${money(r.rdShare.payableByMember)}`] : []),
].join('\n');

const ClosureTab: React.FC<{ rules: CalculatorRules | null }> = ({ rules }) => {
  const { t } = useTranslation();
  const [type, setType] = useState<TypeChoice>('RLN');
  const [amount, setAmount] = useState('300000');
  const [rate, setRate] = useState('12');
  const [mp, setMp] = useState('');
  const [n, setN] = useState('40');
  const [slot, setSlot] = useState<'1' | '2'>('2');
  const [outstanding, setOutstanding] = useState('277500');
  const [closureDate, setClosureDate] = useState(todayYmd());
  const [hasNr, setHasNr] = useState(false);
  const [nrFrom, setNrFrom] = useState(todayYmd());
  const [ov, setOv] = useState<Record<string, Override>>({});
  const [pAdj, setPAdj] = useState('');
  const [iAdj, setIAdj] = useState('');
  const [rd, setRd] = useState('');
  const [share, setShare] = useState('');
  const [rounding, setRounding] = useState<'LIVE' | RoundingMode>('LIVE');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (type !== 'CUSTOM' && rules) setRate(String(rules.loanTypes[type].rate));
  }, [type, rules]);

  const a = toNum(amount), r = toNum(rate), o = toNum(outstanding);
  const body = useMemo(() => {
    const mpN = toNum(mp), nN = toNum(n);
    if (!(a > 0) || !Number.isFinite(r) || !Number.isFinite(o)) return null;
    if (!(mpN > 0) && !(nN >= 1)) return null;
    const b: Record<string, unknown> = {
      loanAmount: a, annualRate: r, outstandingPrincipal: o, slot: Number(slot), closureDate, loanType: type === 'CUSTOM' ? 'RLN' : type,
    };
    if (mpN > 0) b.monthlyPrincipal = mpN; else b.installments = nN;
    if (rounding !== 'LIVE') b.roundingMode = rounding;
    if (hasNr) {
      b.nrFromDate = nrFrom;
      b.nrOverrides = Object.entries(ov).map(([month, v]) => ({ month, ...(v.p.trim() !== '' ? { paidPrincipal: Number(v.p) } : {}), ...(v.i.trim() !== '' ? { paidInterest: Number(v.i) } : {}) }));
    }
    const pa = toNum(pAdj), ia = toNum(iAdj), rdN = toNum(rd), shN = toNum(share);
    if (pa > 0) b.principalAdjustment = pa;
    if (ia > 0) b.interestAdjustment = ia;
    if (rdN > 0) b.rdBalance = rdN;
    if (shN > 0) b.shareBalance = shN;
    return b;
  }, [a, r, o, mp, n, slot, closureDate, type, rounding, hasNr, nrFrom, ov, pAdj, iAdj, rd, share]);

  const { data, error, fieldErrors, loading } = useServerCalc<ClosureResult>('closure', body);

  const setOverride = (month: string, key: 'p' | 'i', v: string) =>
    setOv((p) => ({ ...p, [month]: { p: p[month]?.p ?? '', i: p[month]?.i ?? '', [key]: v.replace(/[^0-9.]/g, '') } }));

  const reset = () => {
    setType('RLN'); setAmount('300000'); setRate('12'); setMp(''); setN('40'); setSlot('2'); setOutstanding('277500'); setClosureDate(todayYmd());
    setHasNr(false); setOv({}); setPAdj(''); setIAdj(''); setRd(''); setShare(''); setRounding('LIVE');
  };
  const copy = async () => { if (data && (await copyText(statement(data)))) { setCopied(true); setTimeout(() => setCopied(false), 1800); } };
  const tierLabel = (x: number) => (x === 2 ? t('Tier 2') : x === 1 ? t('Tier 1') : t('Tier 0'));

  return (
    <div className="aw-split">
      <div className="aw-side">
        <section className="aw-card">
          <div className="aw-card-head"><span className="aw-card-icon"><Banknote size={14} /></span><h2 className="aw-card-title">{t('Loan')}</h2></div>
          <div className="aw-stack">
            <ChipGroup<TypeChoice> label={t('Loan type')} value={type} onChange={setType}
              options={[{ value: 'CUSTOM', label: t('Custom') }, { value: 'RLN', label: t('Regular') }, { value: 'ALN', label: t('Emergency') }, { value: 'ELN', label: t('Against RD') }]} />
            <NumField id="cl-amt" label={t('Total loan amount (₹)')} value={amount} onChange={setAmount} prefix={<IndianRupee size={13} />} />
            <NumField id="cl-rate" label={t('Interest rate (% per year)')} value={rate} onChange={setRate} prefix={<Percent size={13} />} />
            <NumField id="cl-mp" label={t('Monthly principal (₹)')} value={mp} onChange={setMp} prefix={<IndianRupee size={13} />} hint={t('Gives the number of installments. Leave empty to type the installments.')} />
            <NumField id="cl-n" label={t('Installments (months)')} value={n} onChange={setN} kind="int" prefix={<ListOrdered size={13} />} disabled={toNum(mp) > 0} />
            <ChipGroup<'1' | '2'> label={t('Slot the loan was given in')} value={slot} onChange={setSlot}
              options={[{ value: '1', label: t('Slot 1'), tip: rules ? `${rules.slot.startDay}th to ${rules.slot.endDay}th` : undefined }, { value: '2', label: t('Slot 2'), tip: t('every other day') }]} />
          </div>
        </section>

        <section className="aw-card">
          <div className="aw-card-head"><span className="aw-card-icon"><Calendar size={14} /></span><h2 className="aw-card-title">{t('Closure')}</h2></div>
          <div className="aw-stack">
            <NumField id="cl-out" label={t('Latest outstanding principal (₹)')} value={outstanding} onChange={setOutstanding} prefix={<IndianRupee size={13} />} hint={t('From the loan ledger.')} />
            <DateField id="cl-date" label={t('Closure date')} value={closureDate} onChange={setClosureDate} />
            <div className="aw-switch-row">
              <label className="aw-label" htmlFor="cl-nr" style={{ margin: 0 }}>{t('Some installments are unpaid (NR)')}</label>
              <input id="cl-nr" type="checkbox" className="aw-switch" checked={hasNr} onChange={(e) => setHasNr(e.target.checked)} />
            </div>
            {hasNr && <DateField id="cl-nrfrom" label={t('Unpaid since (first unpaid month)')} value={nrFrom} onChange={setNrFrom} hint={t('Every month up to the closure month is listed; edit what was paid.')} />}
          </div>
        </section>

        <section className="aw-card">
          <div className="aw-card-head"><span className="aw-card-icon"><PiggyBank size={14} /></span><h2 className="aw-card-title">{t('Adjustments (optional)')}</h2></div>
          <div className="aw-stack">
            <NumField id="cl-padj" label={t('Principal deduction (₹)')} value={pAdj} onChange={setPAdj} />
            <NumField id="cl-iadj" label={t('Interest deduction (₹)')} value={iAdj} onChange={setIAdj} />
            <NumField id="cl-rd" label={t('Member RD balance (₹)')} value={rd} onChange={setRd} hint={t('To see how much can be adjusted from RD and Share.')} />
            <NumField id="cl-sh" label={t('Member Share value (₹)')} value={share} onChange={setShare} />
            <ChipGroup<'LIVE' | RoundingMode> label={t('Rounding')} value={rounding} onChange={setRounding}
              options={[{ value: 'LIVE', label: `${t('Live')} (${rules?.roundingMode ?? 'NEAREST'})` }, { value: 'NEAREST', label: t('Nearest') }, { value: 'UP', label: t('Up') }, { value: 'DOWN', label: t('Down') }, { value: 'NONE', label: t('Paise') }]} />
          </div>
        </section>
      </div>

      <section className="aw-card aw-main">
        <div className="aw-main-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="aw-strong">{t('Early closure estimate (Method B)')}</span>
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
              !error && <WaitingForInput icon={<Wallet size={20} />} text={t('Enter the loan, the latest outstanding principal and the closure date.')} />
            ) : (
              <div className="aw-stack aw-fade-in" style={{ opacity: loading ? 0.65 : 1, transition: 'opacity .15s' }}>
                <div className="aw-stats aw-stats-4">
                  <Kpi icon={<Wallet size={14} />} label={t('Final closure amount')} value={money(data.finalClosureAmount)} tone="tone-success" sub={t('to be paid by the member')} />
                  <Kpi icon={<Banknote size={14} />} label={t('Outstanding principal')} value={money(data.outstandingPrincipal)} tone="tone-info" sub={`${data.paidInstallments} ${t('paid')}, ${data.futureInstallments} ${t('future')}`} />
                  <Kpi icon={<Percent size={14} />} label={t('Closure interest + penalty')} value={money(data.closureInterest + data.penalInterest)} tone="tone-warning" sub={`NR ${money(data.nrInterest)} + AP ${money(data.apInterest)}`} />
                  <Kpi icon={<TrendingDown size={14} />} label={t('Interest saved')} value={money(data.interestSaved)} tone="tone-danger" sub={`${t('remaining EMIs')} ${money(data.remainingEmiTotal)}`} />
                </div>

                {data.notes.map((x, i) => <div key={i} className="aw-alert aw-alert-warning" role="status"><AlertTriangle size={14} /><span>{x}</span></div>)}

                {hasNr && (
                  <div className="aw-stack">
                    <SectionHead icon={<FileText size={14} style={{ color: 'var(--aw-accent)' }} />} title={t('Month-by-month NR register')}
                      right={<span className="aw-pill">{data.nrCount} {t('unpaid')}</span>} />
                    {data.graceInstallment && (
                      <p className="aw-muted">{t('{{1}} is still inside its grace period: it counts as a future installment, with no flat interest or penalty.', { 1: monthLabel(data.graceInstallment) })}</p>
                    )}
                    <div className="aw-table-wrap">
                      <table className="aw-table">
                        <thead>
                          <tr>
                            <th>{t('Month')}</th><th className="is-right">{t('Due principal')}</th><th className="is-right">{t('Paid principal')}</th><th className="is-right">{t('Unpaid principal')}</th>
                            <th className="is-right">{t('Paid interest')}</th><th className="is-right">{t('Interest due')}</th><th>{t('Penalty tier')}</th><th className="is-right">{t('Penalty')}</th><th className="is-right">{t('Month total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.register.map((x) => (
                            <tr key={x.month}>
                              <td className="is-accent">{monthLabel(x.month)}<span className="aw-meta">{dateLabel(x.dueDate)}</span></td>
                              <td className="is-right is-muted">{money(x.duePrincipal)}</td>
                              <td className="is-right">
                                <input className="aw-input" style={{ width: 96, textAlign: 'right' }} inputMode="decimal" aria-label={`${t('Paid principal')} ${x.month}`}
                                  value={ov[x.month]?.p ?? ''} placeholder="0" onChange={(e) => setOverride(x.month, 'p', e.target.value)} />
                              </td>
                              <td className="is-right">{money(x.unpaidPrincipal)}</td>
                              <td className="is-right">
                                <input className="aw-input" style={{ width: 96, textAlign: 'right' }} inputMode="decimal" aria-label={`${t('Paid interest')} ${x.month}`}
                                  value={ov[x.month]?.i ?? ''} placeholder="0" onChange={(e) => setOverride(x.month, 'i', e.target.value)} />
                              </td>
                              <td className="is-right is-accent">{money(x.interestDue)}</td>
                              <td className={x.tier === 2 ? 'is-danger' : x.tier === 1 ? 'is-accent' : 'is-muted'}>{tierLabel(x.tier)}{x.monthsOverdue > 0 ? ` · ${x.monthsOverdue} ${t('mo')}` : ''}</td>
                              <td className="is-right">{money(x.penalty)}</td>
                              <td className="is-right is-accent">{money(x.monthTotal)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td className="is-accent">{t('Total')}</td>
                            <td className="is-right">{money(data.registerTotals.duePrincipal)}</td>
                            <td className="is-right">{money(data.registerTotals.paidPrincipal)}</td>
                            <td className="is-right">{money(data.registerTotals.unpaidPrincipal)}</td>
                            <td />
                            <td className="is-right">{money(data.registerTotals.interestDue)}</td>
                            <td />
                            <td className="is-right">{money(data.registerTotals.penalty)}</td>
                            <td className="is-right is-accent">{money(data.registerTotals.monthTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="aw-two">
                  <div className="aw-compare-card">
                    <div className="aw-compare-head"><span className="aw-strong">{t('Interest breakdown')}</span></div>
                    <div className="aw-compare-body"><div className="aw-rows">
                      <div className="aw-row"><span className="aw-row-label">{t('EMI (principal + interest)')}</span><span className="aw-row-value">{money(data.emi.installment)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Monthly interest')}</span><span className="aw-row-value">{money(data.emi.monthlyInterest)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Average remaining principal')}</span><span className="aw-row-value">{money(data.averageRemainingPrincipal)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Average RB interest')}</span><span className="aw-row-value">{money(data.averageRbInterest)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('NR interest')}</span><span className="aw-row-value">{money(data.nrInterest)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('AP interest')}</span><span className="aw-row-value">{money(data.apInterest)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Penalty')}</span><span className="aw-row-value">{money(data.penalInterest)}</span></div>
                    </div></div>
                  </div>
                  <div className="aw-compare-card">
                    <div className="aw-compare-head"><span className="aw-strong">{t('Final settlement')}</span><Scale size={14} /></div>
                    <div className="aw-compare-body"><div className="aw-rows">
                      <div className="aw-row"><span className="aw-row-label">{t('Outstanding principal')}</span><span className="aw-row-value">{money(data.outstandingPrincipal)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Closure interest')}</span><span className="aw-row-value">{money(data.closureInterest)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">{t('Penalty')}</span><span className="aw-row-value">{money(data.penalInterest)}</span></div>
                      {data.principalAdjustment + data.interestAdjustment > 0 && <div className="aw-row"><span className="aw-row-label">{t('Less deductions')}</span><span className="aw-row-value">− {money(data.principalAdjustment + data.interestAdjustment)}</span></div>}
                      {data.rdShare.appliedFromRdShare > 0 && <div className="aw-row"><span className="aw-row-label">{t('From RD')} / {t('Share')}</span><span className="aw-row-value">− {money(data.rdShare.fromRd)} / {money(data.rdShare.fromShare)}</span></div>}
                    </div></div>
                    <div className="aw-compare-total"><span>{data.rdShare.appliedFromRdShare > 0 ? t('Payable by member') : t('Final closure amount')}</span><span>{money(data.rdShare.appliedFromRdShare > 0 ? data.rdShare.payableByMember : data.finalClosureAmount)}</span></div>
                  </div>
                </div>

                <div className="aw-panel aw-panel-accent">
                  <SectionHead icon={<ListChecks size={14} style={{ color: 'var(--aw-accent)' }} />} title={t('How this is worked out')} />
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.steps.map((s, i) => <li key={i} className="aw-muted" style={{ lineHeight: 1.5 }}>{s}</li>)}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClosureTab;
