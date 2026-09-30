// page/SaakhScore.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, TrendingUp, TrendingDown, Minus,
  ShieldCheck, ShieldAlert, ShieldX,
  IndianRupee, Calendar, Award,
  XCircle, Info, Lightbulb,
  CreditCard, Building2, RotateCcw, ChevronRight,
  Star, Zap, Sparkles, X, RefreshCw,
} from 'lucide-react';
import MemberField from '@/components/shared/kit/MemberField';
import { useSaakhScore, type FactorScore } from '../hook/useSaakhScore';

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

// ── Tier config (colours come from the theme tokens) ─────────────────────────
const TIER_CONFIG = {
  Platinum: { color: 'var(--aw-info)', label: 'Platinum', emoji: '💎', tone: 'info' },
  Gold: { color: 'var(--aw-warning)', label: 'Gold', emoji: '🥇', tone: 'warning' },
  Silver: { color: 'var(--aw-muted)', label: 'Silver', emoji: '🥈', tone: 'muted' },
  Bronze: { color: 'var(--aw-warning)', label: 'Bronze', emoji: '🥉', tone: 'warning' },
  Critical: { color: 'var(--aw-danger)', label: 'Critical', emoji: '⚠️', tone: 'danger' },
} as const;

// ── Animated count-up number ─────────────────────────────────────────────────
const CountUp: React.FC<{ value: number; decimals?: number; duration?: number; prefix?: string; format?: boolean }> = ({
  value, decimals = 1, duration = 1400, prefix = '', format = false,
}) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const text = format
    ? Math.round(display).toLocaleString('en-IN')
    : display.toFixed(decimals);
  return <>{prefix}{text}</>;
};

// ── Score gauge (SVG arc) ────────────────────────────────────────────────────
const ScoreGauge: React.FC<{ score: number; tier: keyof typeof TIER_CONFIG }> = ({ score, tier }) => {
  const tc = TIER_CONFIG[tier];
  const r = 62;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 170, height: 170 }}>
        <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={`Score ${score.toFixed(1)} out of 10`}>
          <circle cx="85" cy="85" r={r} fill="none" stroke="var(--aw-border)" strokeWidth="13" />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = ((i + 1) / 10) * 2 * Math.PI - Math.PI / 2;
            return (
              <line
                key={i}
                x1={85 + (r - 11) * Math.cos(a)} y1={85 + (r - 11) * Math.sin(a)}
                x2={85 + (r - 16) * Math.cos(a)} y2={85 + (r - 16) * Math.sin(a)}
                stroke="var(--aw-border-strong)" strokeWidth="1.5"
              />
            );
          })}
          <motion.circle
            cx="85" cy="85" r={r}
            fill="none"
            stroke={tc.color}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={circ}
            transform="rotate(-90 85 85)"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: tc.color, fontVariantNumeric: 'tabular-nums' }}>
            <CountUp value={score} duration={1500} />
          </span>
          <span className="aw-meta" style={{ textTransform: 'uppercase', letterSpacing: '.2em', marginTop: 4 }}>out of 10</span>
        </div>
      </div>
      <span className={`aw-pill tone-${tc.tone}`} style={{ padding: '4px 14px', fontSize: 'var(--type-body-size)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
        {tc.emoji} {tc.label}
      </span>
    </div>
  );
};

// ── Factor card ───────────────────────────────────────────────────────────────
const FactorCard: React.FC<{ f: FactorScore }> = ({ f }) => {
  const pct = (f.score / f.maxScore) * 100;
  const tone = f.status === 'good' ? 'var(--aw-success)' : f.status === 'average' ? 'var(--aw-warning)' : 'var(--aw-danger)';
  return (
    <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: tone, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="aw-stat-label" style={{ color: 'var(--aw-text)' }}>{f.name}</span>
        <span className="aw-pill" style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, var(--aw-surface))` }}>
          {f.score.toFixed(1)} / {f.maxScore}
        </span>
      </div>
      <span className="aw-bar-track" style={{ width: '100%', margin: '8px 0' }}>
        <span style={{ width: `${pct}%`, background: tone }} />
      </span>
      <p className="aw-meta" style={{ lineHeight: 1.4 }}>{f.description}</p>
    </div>
  );
};

// ── Eligibility badge ─────────────────────────────────────────────────────────
const EligibilityBadge: React.FC<{ eligible: 'YES' | 'CONDITIONAL' | 'NO' }> = ({ eligible }) => {
  const cfg = eligible === 'YES'
    ? { icon: <ShieldCheck size={20} />, text: 'Eligible for New Loan', tone: 'success' }
    : eligible === 'CONDITIONAL'
      ? { icon: <ShieldAlert size={20} />, text: 'Conditional Eligibility', tone: 'warning' }
      : { icon: <ShieldX size={20} />, text: 'Not Eligible', tone: 'danger' };
  return (
    <div className={`aw-alert aw-alert-${cfg.tone === 'danger' ? 'danger' : cfg.tone}`} style={{ marginBottom: 0, alignItems: 'center', padding: '12px 16px' }}>
      {cfg.icon}
      <span style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{cfg.text}</span>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const SaakhScore: React.FC = () => {
  const { data, loading, error, memberNo, setMemberNo, fetchScore, clear } = useSaakhScore();
  const [memberName, setMemberName] = useState('');

  // Keep listening for member selection from the separate lookup window, in case
  // another window still opens it.
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.ipcRenderer) return;
    const handleMemberSelected = (_event: any, memberData: any) => {
      const no = String(memberData?.memberNo || memberData?.mbno || '');
      if (!no) return;
      setMemberNo(no);
      setMemberName(memberData?.memberName || memberData?.name || '');
      fetchScore(no);
    };
    api.ipcRenderer.on('member-selected', handleMemberSelected);
    return () => {
      // Remove only this specific listener, not all listeners on the channel
      api.ipcRenderer.removeListener?.('member-selected', handleMemberSelected);
    };
  }, [fetchScore, setMemberNo]);

  const handleSearch = () => fetchScore(memberNo);

  const handleClear = () => {
    setMemberName('');
    clear();
  };

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Saakh Score</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={12} /> Member Financial Health Index · 0–10
          </p>
        </div>
        <div className="aw-actions">
          {data && (
            <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary aw-fade-in">
              <RotateCcw size={13} /> Clear
            </button>
          )}
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {/* ── Member search ── */}
          <section className="aw-card">
            <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 260, maxWidth: 480 }}>
                <label className="aw-label" htmlFor="ss-member">Member No.</label>
                <MemberField
                  id="ss-member"
                  value={memberNo}
                  onChange={setMemberNo}
                  onSelect={(m: any) => {
                    const no = String(m?.memberNo || m?.mbno || '');
                    if (!no) return;
                    setMemberNo(no);
                    setMemberName(m?.memberName || m?.name || '');
                    fetchScore(no);
                  }}
                  onSubmit={handleSearch}
                  placeholder="Enter MBNo — F2 or double-space for Lookup"
                  digitsOnly
                  shortcuts
                />
              </div>
              <button type="button" onClick={handleSearch} disabled={loading || !memberNo.trim()} className="aw-btn aw-btn-primary">
                {loading ? <RefreshCw size={13} className="aw-spin" /> : <Zap size={13} />}
                {loading ? 'Scoring…' : 'Calculate'}
              </button>
              {memberName && !data && <span className="aw-strong aw-fade-in" style={{ color: 'var(--aw-accent)' }}>{memberName}</span>}
            </div>
          </section>

          {/* Empty state */}
          {!data && !loading && !error && (
            <section className="aw-card">
              <div className="aw-empty" style={{ padding: 48 }}>
                <Sparkles size={32} />
                <strong className="aw-strong">Search a member to begin</strong>
                <span className="aw-meta" style={{ maxWidth: 380 }}>
                  Saakh Score evaluates repayment punctuality, penalties, loan load, savings, tenure &amp; guarantor record
                </span>
              </div>
            </section>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }} role="alert">
              <XCircle size={16} /><span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <section className="aw-card">
              <div className="aw-empty" style={{ padding: 48 }}>
                <RefreshCw size={30} className="aw-spin" style={{ color: 'var(--aw-accent)' }} />
                <strong className="aw-strong">Analysing member profile…</strong>
              </div>
            </section>
          )}

          {/* ── Result ── */}
          {data && !loading && (
            <div key={`result-${data.mbno}`} className="aw-stack aw-fade-in">

              {/* Hero */}
              <section className="aw-card aw-ambient">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="aw-card-icon" style={{ width: 44, height: 44, borderRadius: 12 }}><User size={22} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h2 className="aw-title" style={{ fontSize: 'calc(var(--type-page-title) + 2px)' }}>{data.memberName || '—'}</h2>
                          <span className={`aw-pill tone-${data.isActive ? 'success' : 'muted'}`}>{data.isActive ? '● Active' : 'Inactive'}</span>
                        </div>
                        <p className="aw-meta" style={{ marginTop: 2 }}>Member #{data.mbno}</p>
                      </div>
                    </div>

                    <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
                      <div><dt style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /> Member Since</dt><dd>{data.membershipDate || '—'}</dd></div>
                      <div><dt style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Award size={11} /> Tenure</dt><dd>{`${data.tenureYears} yr${data.tenureYears !== 1 ? 's' : ''}`}</dd></div>
                      <div><dt style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CreditCard size={11} /> Active Loans</dt><dd>{data.totalActiveLoans}</dd></div>
                    </dl>

                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: data.totalScore >= 7 ? 'var(--aw-success)' : data.totalScore >= 5 ? 'var(--aw-warning)' : 'var(--aw-danger)' }}>
                      {data.totalScore >= 7 ? <TrendingUp size={14} /> : data.totalScore >= 5 ? <Minus size={14} /> : <TrendingDown size={14} />}
                      {data.totalScore >= 7 ? 'Strong Profile' : data.totalScore >= 5 ? 'Moderate Risk' : 'High Risk'}
                    </p>
                  </div>

                  <ScoreGauge score={data.totalScore} tier={data.tier} />
                </div>
              </section>

              {/* Score breakdown */}
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Sparkles size={14} /></span>
                  <h2 className="aw-card-title">Score Breakdown</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--aw-gap)' }}>
                  {data.factors.map((f) => <FactorCard key={f.name} f={f} />)}
                </div>
              </section>

              {/* Eligibility + snapshot */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--aw-gap)' }}>
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                    <h2 className="aw-card-title">Loan Eligibility Decision</h2>
                  </div>
                  <div className="aw-stack">
                    <EligibilityBadge eligible={data.eligibility.eligible} />
                    <p className="aw-meta" style={{ lineHeight: 1.5 }}>{data.eligibility.reason}</p>
                    {data.eligibility.eligible !== 'NO' && data.eligibility.recommendedAmount > 0 && (
                      <div className="aw-two">
                        <div className="aw-stat">
                          <div className="aw-stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><IndianRupee size={11} /> Recommended Amt</div>
                          <div className="aw-stat-value" style={{ fontSize: 'calc(var(--type-body-size) + 5px)' }}>₹<CountUp value={data.eligibility.recommendedAmount} format duration={1300} /></div>
                        </div>
                        <div className="aw-stat">
                          <div className="aw-stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Calendar size={11} /> Tenure</div>
                          <div className="aw-stat-value" style={{ fontSize: 'calc(var(--type-body-size) + 5px)' }}>{data.eligibility.recommendedTenure} months</div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><IndianRupee size={14} /></span>
                    <h2 className="aw-card-title">Financial Snapshot</h2>
                  </div>
                  <div className="aw-rows">
                    {[
                      { label: 'Share Capital', val: data.shareCapital, tone: '' },
                      { label: 'CD Balance', val: data.cdBalance, tone: '' },
                      { label: 'MD Balance', val: data.mdBalance, tone: '' },
                      { label: 'Total Outstanding', val: data.totalOutstanding, tone: data.totalOutstanding > 0 ? 'var(--aw-danger)' : '' },
                      { label: 'Suspense Balance', val: data.suspBal, tone: data.suspBal > 0 ? 'var(--aw-warning)' : '' },
                    ].map((row) => (
                      <div key={row.label} className="aw-row">
                        <span className="aw-row-label">{row.label}</span>
                        <span className="aw-row-value" style={row.tone ? { color: row.tone } : undefined}>₹{row.val.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {data.guarantorInfo.isGuarantorForCount > 0 && (
                      <div className="aw-row">
                        <span className="aw-row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Guarantor for</span>
                        <span className="aw-row-value" style={{ color: data.guarantorInfo.guarantorLoansHealthy ? 'var(--aw-success)' : 'var(--aw-warning)' }}>
                          {data.guarantorInfo.isGuarantorForCount} member{data.guarantorInfo.isGuarantorForCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Active loans */}
              {data.activeLoans.length > 0 && (
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><CreditCard size={14} /></span>
                    <h2 className="aw-card-title">Active Loans ({data.activeLoans.length})</h2>
                    <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-danger)' }}>₹{data.totalOutstanding.toLocaleString('en-IN')} outstanding</span>
                  </div>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th>Loan</th>
                          <th>Details</th>
                          <th className="is-right">Balance</th>
                          <th style={{ width: 150 }}>Repaid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.activeLoans.map((loan) => (
                          <tr key={loan.loancaseno}>
                            <td>
                              <span className="is-accent" style={{ color: 'var(--aw-accent)', fontWeight: 700, textTransform: 'uppercase' }}>{loan.loantype}</span>
                              {loan.penalrate > 0 && <span className="aw-pill tone-danger" style={{ marginLeft: 6 }}>Penalty {loan.penalrate}%</span>}
                            </td>
                            <td className="is-muted" style={{ fontWeight: 500 }}>
                              Case #{loan.loancaseno} · {loan.noOfInstal} instals @ ₹{loan.instalAmt.toLocaleString('en-IN')}/mo · {loan.rate}% p.a.
                            </td>
                            <td className="is-right is-danger">₹{loan.balance.toLocaleString('en-IN')}</td>
                            <td>
                              <span className="aw-bar-track" style={{ width: '100%' }}><span style={{ width: `${loan.repaidPct}%` }} /></span>
                              <span className="aw-meta">{loan.repaidPct}% repaid</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Improvement tips */}
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Lightbulb size={14} /></span>
                  <h2 className="aw-card-title">Score Improvement Tips</h2>
                </div>
                <div className="aw-stack" style={{ gap: 8 }}>
                  {data.improvementTips.map((tip, i) => (
                    <p key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontWeight: 500, lineHeight: 1.5 }}>
                      <ChevronRight size={14} style={{ marginTop: 3, flex: 'none', color: 'var(--aw-accent)' }} />
                      <span>{tip}</span>
                    </p>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Saakh Score Engine v1.0</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Info size={12} /> Score is indicative — committee decision is final</span>
      </div>
    </div>
  );
};

export default SaakhScore;
