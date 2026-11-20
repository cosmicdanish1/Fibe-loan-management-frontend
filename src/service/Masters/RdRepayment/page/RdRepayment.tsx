import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Search as SearchIcon, Wallet, CalendarCheck, ShieldCheck, Landmark, ReceiptText } from 'lucide-react';
import MemberField from '../../../../components/shared/kit/MemberField';
import AwDialog from '../../../../components/shared/kit/AwDialog';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdRepayment, RdPendingInstallmentRow } from '../hooks/useRdRepayment';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_AMOUNT = 9_999_999.99;
const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortDate = (s: string | null | undefined) => {
    if (!s) return '';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const monthKey = (r: { installmentMonth: number; installmentYear: number }) => r.installmentYear * 12 + r.installmentMonth;
const remainingOf = (r: RdPendingInstallmentRow) => Math.max(0, Math.round((r.expectedAmount - r.paidAmount) * 100) / 100);

type RowState = { label: string; tone: string };

const RdRepayment: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const recordedBy = user?.username || ''; // always the logged-in user; no hardcoded fallback

    const {
        mbno, memberName, yearLabel, months, summary, loading, saving, message,
        loadFinancialYear, loadMember, recordPayment, saveMonthlyAmount,
    } = useRdRepayment();

    const [lookupInput, setLookupInput] = useState('');
    const [selected, setSelected] = useState<RdPendingInstallmentRow | null>(null);
    const [amount, setAmount] = useState('');
    const [payDate, setPayDate] = useState(toInputDate(new Date()));
    const [narration, setNarration] = useState('');
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupAmount, setSetupAmount] = useState('');

    useEffect(() => { loadFinancialYear(); }, [loadFinancialYear]);

    const now = new Date();
    const nowKey = now.getFullYear() * 12 + (now.getMonth() + 1);
    const amountNotSet = !!summary && summary.monthlyAmount == null;

    const stateOf = (r: RdPendingInstallmentRow): RowState => {
        if (r.status === 'PAID') return { label: t('Paid'), tone: 'tone-success' };
        if (r.status === 'PARTIAL') return { label: t('Part paid'), tone: 'tone-warning' };
        if (amountNotSet && r.expectedAmount === 0) return { label: t('No amount set'), tone: 'tone-muted' };
        const k = monthKey(r);
        if (k < nowKey) return { label: t('Overdue'), tone: 'tone-danger' };
        if (k === nowKey) return { label: t('Due now'), tone: 'tone-danger' };
        return { label: t('Upcoming'), tone: 'tone-muted' };
    };

    // The oldest month that is due (this month or earlier) and not fully paid; falls back to the current month.
    const target = useMemo(() => {
        const due = months.find(r => monthKey(r) <= nowKey && remainingOf(r) > 0);
        return due || months.find(r => monthKey(r) === nowKey) || null;
    }, [months, nowKey]);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setLookupInput(memberNo);
        loadMember(memberNo, name);
        setSelected(null);
    };

    const openPayment = (row: RdPendingInstallmentRow) => {
        const rem = remainingOf(row);
        setSelected(row);
        setAmount(rem > 0 ? String(rem) : '');
        setPayDate(toInputDate(new Date()));
        setNarration('');
    };

    const amountNum = Number(amount);
    const amountOk = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= MAX_AMOUNT;
    const balanceAfter = (summary?.balance ?? 0) + (amountOk ? amountNum : 0);

    const submitPayment = async () => {
        if (!selected || !amountOk) return;
        const ok = await recordPayment(selected.installmentMonth, selected.installmentYear, amountNum, recordedBy, narration || undefined, payDate || undefined);
        // Keep the dialog and the typed amount/narration open when recording failed so the operator can retry
        if (ok) setSelected(null);
    };

    const submitSetup = async () => {
        const n = Number(setupAmount);
        if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return;
        if (await saveMonthlyAmount(n)) setSetupOpen(false);
    };

    const statStyle = (tone: string): React.CSSProperties => ({ ['--aw-tone' as any]: tone, textAlign: 'left' });

    return (
        <div className="app-window aw-calm">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('RD/CD Repayment')}</h1>
                    <p className="aw-desc">{t("Record a member's monthly RD/CD payment at the counter")}</p>
                </div>
                {yearLabel && (
                    <span className="aw-pill" style={{ gap: 8 }}><Calendar size={12} /> {yearLabel}</span>
                )}
            </div>

            <div className="aw-bar-strip">
                <div className="aw-inline" style={{ maxWidth: 520 }}>
                    <div style={{ width: 190, flex: 'none' }}>
                        <MemberField value={lookupInput} onChange={setLookupInput} onSelect={onMemberSelected}
                            onSubmit={v => loadMember(v, '')} />
                    </div>
                    <input type="text" placeholder={t('Member name')} aria-label={t('Member name')} value={memberName} readOnly className="aw-input" />
                    <button type="button" onClick={() => loadMember(lookupInput, '')} disabled={loading || !lookupInput} className="aw-btn aw-btn-secondary">
                        <SearchIcon size={13} /> {t('Search')}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status"
                    style={{ margin: 'var(--aw-pad) calc(var(--aw-pad) * 1.4) 0', marginBottom: 0 }}>
                    {message.text}
                </div>
            )}

            <div className="aw-content">
                {!mbno ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}>
                        <Calendar size={34} />
                        <span>{t('Search for a member to see their RD/CD months.')}</span>
                    </div>
                ) : loading ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}>
                        <span className="aw-meta">{t('Loading…')}</span>
                    </div>
                ) : (
                    <div className="aw-stack aw-fade-in">
                        {summary && (
                            <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                                <div className="aw-stat" style={statStyle('var(--aw-accent)')}>
                                    <div className="aw-stat-head"><Wallet size={14} /><span className="aw-stat-label">{t('RD/CD balance')}</span></div>
                                    <div className="aw-stat-value">₹{fmt(summary.balance)}</div>
                                    <div className="aw-meta">{t('One deposit, head L1004')}</div>
                                </div>
                                <div className="aw-stat" style={statStyle(amountNotSet ? 'var(--aw-warning)' : 'var(--aw-info)')}>
                                    <div className="aw-stat-head"><CalendarCheck size={14} /><span className="aw-stat-label">{t('Monthly amount')}</span></div>
                                    <div className="aw-stat-value">{amountNotSet ? t('Not set') : `₹${fmt(summary.monthlyAmount || 0)}`}</div>
                                    <div className="aw-meta">{amountNotSet ? t('Needed to know what is due') : t('From RD/CD Member Setup')}</div>
                                </div>
                                <div className="aw-stat" style={statStyle('var(--aw-success)')}>
                                    <div className="aw-stat-head"><Landmark size={14} /><span className="aw-stat-label">{t('Paid this year')}</span></div>
                                    <div className="aw-stat-value">₹{fmt(summary.paidThisYear)}</div>
                                    <div className="aw-meta">{t('{{1}} full month(s) paid', { 1: summary.paidMonths })}</div>
                                </div>
                                <div className="aw-stat" style={statStyle('var(--aw-text)')}>
                                    <div className="aw-stat-head"><ShieldCheck size={14} /><span className="aw-stat-label">{t('Free to withdraw')}</span></div>
                                    <div className="aw-stat-value">₹{fmt(summary.freeToWithdraw)}</div>
                                    <div className="aw-meta">{summary.lockedByLoan > 0 ? t('₹{{1}} locked by a Loan Against RD', { 1: fmt(summary.lockedByLoan) }) : t('Nothing locked by a loan')}</div>
                                </div>
                            </div>
                        )}

                        {amountNotSet && (
                            <div className="aw-alert aw-alert-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 0 }}>
                                <div>
                                    <strong>{t('This member has no monthly RD/CD amount yet')}</strong>
                                    <div className="aw-meta">{t('The balance above came from the old system. Set the monthly amount and the months below will show what is due. You can still record a payment for any month with a free amount.')}</div>
                                </div>
                                <button type="button" className="aw-btn aw-btn-primary" style={{ flex: 'none' }}
                                    onClick={() => { setSetupAmount(''); setSetupOpen(true); }}>
                                    {t('Set monthly amount')}
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div className="aw-table-wrap">
                                <table className="aw-table">
                                    <thead>
                                        <tr>
                                            <th>{t('Month')}</th>
                                            <th>{t('Due date')}</th>
                                            <th className="is-right">{t('Expected')}</th>
                                            <th className="is-right">{t('Paid')}</th>
                                            <th className="is-right">{t('Balance')}</th>
                                            <th className="is-right">{t('Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {months.map(row => {
                                            const st = stateOf(row);
                                            const rem = remainingOf(row);
                                            const isNow = monthKey(row) === nowKey;
                                            const clickable = row.status !== 'PAID';
                                            return (
                                                <tr key={`${row.installmentMonth}-${row.installmentYear}`}
                                                    className={clickable ? 'is-clickable' : undefined}
                                                    onClick={clickable ? () => openPayment(row) : undefined}
                                                    style={isNow ? { background: 'var(--aw-accent-soft)' } : undefined}>
                                                    <td>
                                                        {MONTH_NAMES[row.installmentMonth]} {row.installmentYear}
                                                        {isNow && <span className="aw-meta" style={{ marginLeft: 8, fontWeight: 600 }}>{t('current')}</span>}
                                                    </td>
                                                    <td className="is-muted">{shortDate(row.dueDate)}</td>
                                                    <td className={`is-right${amountNotSet && row.expectedAmount === 0 ? ' is-muted' : ''}`}>
                                                        {amountNotSet && row.expectedAmount === 0 ? t('Not set') : fmt(row.expectedAmount)}
                                                    </td>
                                                    <td className="is-right">{fmt(row.paidAmount)}</td>
                                                    <td className={`is-right${row.status === 'PARTIAL' ? ' is-danger' : ''}`}>{rem > 0 ? fmt(rem) : '-'}</td>
                                                    <td className="is-right"><span className={`aw-pill ${st.tone}`}>{st.label}</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="aw-stack">
                                <div className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><Wallet size={14} /></span>
                                        <h2 className="aw-card-title">{t('Collect now')}</h2>
                                    </div>
                                    {target ? (
                                        <div className="aw-stack">
                                            <div>
                                                <div className="aw-strong">{t('{{1}} {{2}} instalment', { 1: MONTH_NAMES[target.installmentMonth], 2: target.installmentYear })}</div>
                                                <div className="aw-stat-value" style={{ color: 'var(--aw-text)', marginTop: 4 }}>
                                                    {amountNotSet && target.expectedAmount === 0 ? t('Free amount') : `₹${fmt(remainingOf(target))}`}
                                                </div>
                                            </div>
                                            {monthKey(target) < nowKey && (
                                                <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                                                    {t('This month is overdue. Oldest dues are collected first.')}
                                                </div>
                                            )}
                                            <button type="button" className="aw-btn aw-btn-primary" style={{ width: '100%' }} onClick={() => openPayment(target)}>
                                                {t('Collect payment')}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="aw-meta">{t('Nothing is due right now.')}</p>
                                    )}
                                </div>

                                <div className="aw-card">
                                    <div className="aw-card-head">
                                        <span className="aw-card-icon"><ReceiptText size={14} /></span>
                                        <h2 className="aw-card-title">{t('Recent RD/CD credits')}</h2>
                                    </div>
                                    {summary && summary.receipts.length > 0 ? (
                                        <div className="aw-stack" style={{ gap: 0 }}>
                                            {summary.receipts.map((r, i) => (
                                                <div key={`${r.voucherNo}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--aw-border)' }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="aw-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.narration || t('RD/CD credit')}</div>
                                                        <div className="aw-meta">{[r.voucherNo, shortDate(r.date)].filter(Boolean).join(' · ')}</div>
                                                    </div>
                                                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="aw-meta">{t('No RD/CD credits on the ledger yet.')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AwDialog open={!!selected} onClose={() => setSelected(null)} compact maxWidth="30rem"
                title={selected ? t('Collect RD/CD payment — {{1}} {{2}}', { 1: MONTH_NAMES[selected.installmentMonth], 2: selected.installmentYear }) : ''}>
                {selected && (
                    <div className="aw-stack">
                        <p className="aw-meta">{memberName} · {mbno}</p>
                        <div className="aw-stats aw-stats-3">
                            <div className="aw-stat" style={statStyle('var(--aw-text)')}>
                                <div className="aw-stat-label">{t('Expected')}</div>
                                <div className="aw-stat-value" style={{ fontSize: '1.1em' }}>{amountNotSet && selected.expectedAmount === 0 ? '-' : fmt(selected.expectedAmount)}</div>
                            </div>
                            <div className="aw-stat" style={statStyle('var(--aw-text)')}>
                                <div className="aw-stat-label">{t('Already paid')}</div>
                                <div className="aw-stat-value" style={{ fontSize: '1.1em' }}>{fmt(selected.paidAmount)}</div>
                            </div>
                            <div className="aw-stat" style={statStyle('var(--aw-warning)')}>
                                <div className="aw-stat-label">{t('Still due')}</div>
                                <div className="aw-stat-value" style={{ fontSize: '1.1em' }}>{fmt(remainingOf(selected))}</div>
                            </div>
                        </div>
                        {selected.paidAmount > 0 && selected.paidAmount < selected.expectedAmount && (
                            <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                                {t('Enter only the new money received now. It is added to the ₹{{1}} already paid for this month.', { 1: fmt(selected.paidAmount) })}
                            </div>
                        )}
                        <div className="aw-two">
                            <div>
                                <label className="aw-label" htmlFor="rr-amount">{t('Amount received (₹)')}</label>
                                <input id="rr-amount" type="number" min={0} step="0.01" inputMode="decimal" value={amount}
                                    onChange={e => setAmount(e.target.value)} className="aw-input" autoFocus />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="rr-date">{t('Payment date')}</label>
                                <input id="rr-date" type="date" value={payDate} max={toInputDate(new Date())}
                                    onChange={e => setPayDate(e.target.value)} className="aw-input" />
                            </div>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="rr-narration">{t('Narration')}</label>
                            <input id="rr-narration" type="text" maxLength={120} value={narration} onChange={e => setNarration(e.target.value)}
                                placeholder={t('Collected at counter')} className="aw-input" />
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                            <table className="aw-table">
                                <thead><tr><th colSpan={2}>{t('What will be posted (CD voucher)')}</th></tr></thead>
                                <tbody>
                                    <tr><td>{t('DR Cash in hand')}</td><td className="is-right">{amountOk ? fmt(amountNum) : '-'}</td></tr>
                                    <tr><td>{t('CR RD/CD (L1004), member account')}</td><td className="is-right">{amountOk ? fmt(amountNum) : '-'}</td></tr>
                                    <tr><td className="is-success">{t('RD/CD balance after posting')}</td>
                                        <td className="is-right is-success">{summary ? `${fmt(summary.balance)} → ${fmt(balanceAfter)}` : '-'}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <button type="button" onClick={submitPayment} disabled={saving || !amountOk} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                            {saving ? t('Recording…') : amountOk ? t('Record and post ₹{{1}}', { 1: fmt(amountNum) }) : t('Record and post')}
                        </button>
                    </div>
                )}
            </AwDialog>

            <AwDialog open={setupOpen} onClose={() => setSetupOpen(false)} compact maxWidth="24rem" title={t('Set monthly RD/CD amount')}>
                <div className="aw-stack">
                    <p className="aw-meta">{memberName} · {mbno} · {yearLabel}</p>
                    <div>
                        <label className="aw-label" htmlFor="rr-setup">{t('Monthly amount (₹)')}</label>
                        <input id="rr-setup" type="number" min={0} step="1" inputMode="decimal" value={setupAmount}
                            onChange={e => setSetupAmount(e.target.value)} className="aw-input" autoFocus />
                    </div>
                    <button type="button" onClick={submitSetup} disabled={saving || !(Number(setupAmount) > 0)} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                        {saving ? t('Saving…') : t('Save monthly amount')}
                    </button>
                </div>
            </AwDialog>
        </div>
    );
};

export default RdRepayment;
