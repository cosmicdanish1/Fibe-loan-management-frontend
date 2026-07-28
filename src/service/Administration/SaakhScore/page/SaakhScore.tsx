// page/SaakhScore.tsx

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, TrendingUp, TrendingDown, Minus,
  ShieldCheck, ShieldAlert, ShieldX,
  IndianRupee, Calendar, Award, AlertTriangle,
  XCircle, Info, Lightbulb,
  CreditCard, Building2, RotateCcw, ChevronRight,
  Star, Zap, Target, Sparkles, X,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { useSaakhScore, type FactorScore } from '../hook/useSaakhScore';

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

// ── Tier config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  Platinum: { color: '#818cf8', glow: 'rgba(129,140,248,0.45)', bg: 'rgba(129,140,248,0.12)', label: 'Platinum', emoji: '💎' },
  Gold:     { color: '#fbbf24', glow: 'rgba(251,191,36,0.45)',  bg: 'rgba(251,191,36,0.12)',  label: 'Gold',     emoji: '🥇' },
  Silver:   { color: '#94a3b8', glow: 'rgba(148,163,184,0.45)', bg: 'rgba(148,163,184,0.12)', label: 'Silver',   emoji: '🥈' },
  Bronze:   { color: '#fb923c', glow: 'rgba(251,146,60,0.45)',  bg: 'rgba(251,146,60,0.12)',  label: 'Bronze',   emoji: '🥉' },
  Critical: { color: '#f87171', glow: 'rgba(248,113,113,0.45)', bg: 'rgba(248,113,113,0.12)', label: 'Critical', emoji: '⚠️' },
};

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

// ── Score gauge (SVG arc with glow) ──────────────────────────────────────────
const ScoreGauge: React.FC<{ score: number; tier: keyof typeof TIER_CONFIG }> = ({ score, tier }) => {
  const tc = TIER_CONFIG[tier];
  const r = 62;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 10);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 170, height: 170 }}>
        <div className="absolute inset-4 rounded-full blur-2xl animate-pulse" style={{ background: tc.glow, opacity: 0.5 }} />
        <svg width="170" height="170" viewBox="0 0 170 170" className="relative">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tc.color} />
              <stop offset="100%" stopColor={tc.color} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="13" />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = ((i + 1) / 10) * 2 * Math.PI - Math.PI / 2;
            const x1 = 85 + (r - 11) * Math.cos(a);
            const y1 = 85 + (r - 11) * Math.sin(a);
            const x2 = 85 + (r - 16) * Math.cos(a);
            const y2 = 85 + (r - 16) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />;
          })}
          <motion.circle
            cx="85" cy="85" r={r}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={circ}
            transform="rotate(-90 85 85)"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 8px ${tc.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tracking-tight" style={{ color: tc.color, lineHeight: 1, textShadow: `0 0 24px ${tc.glow}` }}>
            <CountUp value={score} duration={1600} />
          </span>
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] mt-1">out of 10</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 18 }}
        className="mt-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 border"
        style={{ background: tc.bg, color: tc.color, borderColor: tc.glow, boxShadow: `0 0 20px ${tc.glow}` }}
      >
        <span>{tc.emoji}</span> {tc.label}
      </motion.div>
    </div>
  );
};

// ── Factor card ───────────────────────────────────────────────────────────────
const FactorCard: React.FC<{ f: FactorScore; index: number }> = ({ f, index }) => {
  const pct = (f.score / f.maxScore) * 100;
  const c = f.status === 'good' ? '#10b981' : f.status === 'average' ? '#f59e0b' : '#ef4444';
  const cBg = f.status === 'good' ? 'rgba(16,185,129,0.1)' : f.status === 'average' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(99,102,241,0.25)', transition: { duration: 0.2 } }}
      className="ss-factor-card bg-white/70 backdrop-blur border border-slate-200/80 rounded-2xl p-3.5 flex flex-col gap-2.5 cursor-default"
      style={{ boxShadow: '0 2px 12px -4px rgba(15,23,42,0.06)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="ss-fc-name text-[10px] font-black text-slate-700 uppercase tracking-wide">{f.name}</span>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ background: cBg, color: c }}>
          {f.score.toFixed(1)} / {f.maxScore}
        </span>
      </div>
      <div className="ss-fc-track h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${c}, ${c}cc)`, boxShadow: `0 0 8px ${c}66` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.6 + index * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="ss-fc-desc text-[9px] text-slate-500 font-medium leading-snug">{f.description}</p>
    </motion.div>
  );
};

// ── Eligibility badge ─────────────────────────────────────────────────────────
const EligibilityBadge: React.FC<{ eligible: 'YES' | 'CONDITIONAL' | 'NO' }> = ({ eligible }) => {
  const cfg = eligible === 'YES'
    ? { icon: <ShieldCheck size={20} />, text: 'Eligible for New Loan', grad: 'from-emerald-500 to-teal-600', glow: 'rgba(16,185,129,0.4)' }
    : eligible === 'CONDITIONAL'
    ? { icon: <ShieldAlert size={20} />, text: 'Conditional Eligibility', grad: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.4)' }
    : { icon: <ShieldX size={20} />, text: 'Not Eligible', grad: 'from-rose-500 to-red-600', glow: 'rgba(244,63,94,0.4)' };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
      className={`flex items-center gap-2.5 bg-gradient-to-r ${cfg.grad} text-white px-5 py-3 rounded-2xl`}
      style={{ boxShadow: `0 8px 28px -6px ${cfg.glow}` }}
    >
      {cfg.icon}
      <span className="text-sm font-black uppercase tracking-wider">{cfg.text}</span>
    </motion.div>
  );
};

// ── Stagger helpers ───────────────────────────────────────────────────────────
const sectionAnim = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as any },
});

// ── Main page ─────────────────────────────────────────────────────────────────
const SaakhScore: React.FC = () => {
  const { data, loading, error, memberNo, setMemberNo, fetchScore, clear } = useSaakhScore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastSpaceTime, setLastSpaceTime] = useState(0);
  const [memberName, setMemberName] = useState('');

  const openMemberLookup = () => {
    if ((window as any).electronAPI?.openNewWindow) {
      (window as any).electronAPI.openNewWindow('/common/member-lookup');
    }
  };

  // Listen for member selection from the lookup window
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

  const handleMemberNoChange = (value: string) => {
    setMemberNo(value.replace(/[^0-9]/g, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { handleSearch(); return; }
    if (e.key === 'F2') { e.preventDefault(); openMemberLookup(); return; }
    // Double-space within 500 ms opens member lookup
    if (e.key === ' ') {
      const now = Date.now();
      if (now - lastSpaceTime < 500) {
        e.preventDefault();
        openMemberLookup();
        setLastSpaceTime(0);
      } else {
        setLastSpaceTime(now);
      }
    }
  };

  const handleClear = () => {
    setMemberName('');
    clear();
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 12 } }}>
      <style>{`
        html.dark .ss-page { background: linear-gradient(160deg, #0f172a 0%, #1a1040 50%, #12071a 100%) !important; }

        /* Search bar */
        html.dark .ss-page .ss-searchbar { background: rgba(15,23,42,0.95) !important; border-color: #334155 !important; }
        html.dark .ss-page .ss-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .ss-page .ss-input::placeholder { color: #475569 !important; }
        html.dark .ss-page .ss-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 4px rgba(99,102,241,0.12) !important; }
        html.dark .ss-page .ss-lookup-btn { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }
        html.dark .ss-page .ss-lookup-btn:hover { background: #334155 !important; color: #f1f5f9 !important; }

        /* Factor cards */
        html.dark .ss-page .ss-factor-card { background: rgba(30,41,59,0.9) !important; border-color: #334155 !important; box-shadow: 0 2px 12px -4px rgba(0,0,0,0.4) !important; }
        html.dark .ss-page .ss-fc-name { color: #e2e8f0 !important; }
        html.dark .ss-page .ss-fc-track { background: #1e293b !important; }
        html.dark .ss-page .ss-fc-desc { color: #64748b !important; }

        /* Panels */
        html.dark .ss-page .ss-panel { background: rgba(30,41,59,0.9) !important; border-color: #334155 !important; box-shadow: 0 2px 12px -4px rgba(0,0,0,0.4) !important; }
        html.dark .ss-page .ss-panel-label { color: #475569 !important; }
        html.dark .ss-page .ss-eligibility-reason { color: #94a3b8 !important; }
        html.dark .ss-page .ss-rec-panel { background: linear-gradient(135deg, rgba(55,48,163,0.25), rgba(109,40,217,0.2)) !important; border-color: rgba(99,102,241,0.35) !important; }
        html.dark .ss-page .ss-rec-label { color: #818cf8 !important; }
        html.dark .ss-page .ss-rec-val { color: #c7d2fe !important; }

        /* Financial snapshot rows */
        html.dark .ss-page .ss-fin-row { background: rgba(15,23,42,0.7) !important; }
        html.dark .ss-page .ss-fin-row:hover { background: rgba(30,41,59,0.9) !important; }
        html.dark .ss-page .ss-fin-label { color: #64748b !important; }
        html.dark .ss-page .ss-fin-val { color: #e2e8f0 !important; }
        html.dark .ss-page .ss-fin-row-hl { background: rgba(127,29,29,0.35) !important; }
        html.dark .ss-page .ss-fin-row-hl:hover { background: rgba(127,29,29,0.5) !important; }
        html.dark .ss-page .ss-fin-val-hl { color: #fca5a5 !important; }
        html.dark .ss-page .ss-guarantor-good { background: rgba(6,78,59,0.35) !important; }
        html.dark .ss-page .ss-guarantor-bad { background: rgba(120,53,15,0.35) !important; }

        /* Active loans panel */
        html.dark .ss-page .ss-loans-panel { background: rgba(30,41,59,0.9) !important; border-color: #334155 !important; box-shadow: 0 2px 12px -4px rgba(0,0,0,0.4) !important; }
        html.dark .ss-page .ss-loans-header { border-color: #334155 !important; }
        html.dark .ss-page .ss-loan-type { color: #e2e8f0 !important; }
        html.dark .ss-page .ss-loan-detail { color: #64748b !important; }
        html.dark .ss-page .ss-loan-track { background: #1e293b !important; }
        html.dark .ss-page .ss-loan-icon { background: linear-gradient(135deg, rgba(55,48,163,0.3), rgba(109,40,217,0.25)) !important; }

        /* Improvement tips */
        html.dark .ss-page .ss-tips { background: linear-gradient(120deg, rgba(55,48,163,0.22), rgba(109,40,217,0.18), rgba(157,23,77,0.12)) !important; border-color: rgba(99,102,241,0.3) !important; }
        html.dark .ss-page .ss-tip-text { color: #94a3b8 !important; }

        /* Section labels */
        html.dark .ss-page .ss-section-label { color: #475569 !important; }

        /* Error state */
        html.dark .ss-page .ss-error { background: rgba(68,14,14,0.55) !important; border-color: #7f1d1d !important; }
        html.dark .ss-page .ss-error-text { color: #fca5a5 !important; }

        /* Empty state */
        html.dark .ss-page .ss-empty-title { color: #94a3b8 !important; }
        html.dark .ss-page .ss-empty-desc { color: #475569 !important; }

        /* Footer */
        html.dark .ss-page .ss-footer { background: rgba(15,23,42,0.95) !important; border-color: #334155 !important; }
        html.dark .ss-page .ss-footer-left { color: #334155 !important; }
        html.dark .ss-page .ss-footer-right { color: #6366f1 !important; }
      `}</style>

      <div className="ss-page h-screen flex flex-col font-sans overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #faf5ff 100%)' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative px-4 py-2.5 flex items-center justify-between shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(110deg, #0f172a 0%, #1e1b4b 45%, #312e81 75%, #1e1b4b 100%)' }}
        >
          <div className="absolute -top-10 left-1/3 w-48 h-24 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.35)' }} />
          <div className="absolute -bottom-8 right-1/4 w-40 h-20 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(168,85,247,0.25)' }} />

          <div className="flex items-center gap-2.5 relative">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="p-2 rounded-xl border border-indigo-400/40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 18px rgba(99,102,241,0.5)' }}
            >
              <Star size={14} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-[12px] font-black text-white uppercase tracking-[0.2em] leading-none">Saakh Score</h1>
              <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-[0.3em] mt-1">Member Financial Health Index · 0–10</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 relative">
            <AnimatePresence>
              {data && (
                <motion.button
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClear}
                  className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20 transition-colors"
                >
                  <RotateCcw size={10} /> Clear
                </motion.button>
              )}
            </AnimatePresence>
            <button onClick={closeWindow}
              className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500/80 rounded-lg transition-all">
              <X size={13} />
            </button>
          </div>
        </motion.div>

        {/* ── Search bar ── */}
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="ss-searchbar bg-white/80 backdrop-blur border-b border-slate-200/70 px-4 py-2.5 shrink-0"
        >
          <div className="flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1 group">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={memberNo}
                onChange={e => handleMemberNoChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter MBNo — F2 or double-space for Lookup"
                className="ss-input w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                autoFocus
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={openMemberLookup}
              title="Open Member Lookup (F2)"
              className="ss-lookup-btn h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 border border-slate-200 shadow-sm transition-colors"
            >
              <User size={12} /> Lookup
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSearch}
              disabled={loading || !memberNo.trim()}
              className="h-9 px-5 text-white rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px -4px rgba(99,102,241,0.5)' }}
            >
              <Zap size={12} /> {loading ? 'Scoring…' : 'Calculate'}
            </motion.button>
            <AnimatePresence>
              {memberName && !data && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-black text-indigo-600 truncate max-w-[120px]"
                >
                  {memberName}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">

            {/* Empty state */}
            {!data && !loading && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex flex-col items-center justify-center h-full gap-4 text-center"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', boxShadow: '0 8px 32px -8px rgba(99,102,241,0.25)' }}
                >
                  <Target size={36} className="text-indigo-400" />
                </motion.div>
                <div>
                  <p className="ss-empty-title text-[12px] font-black text-slate-600 uppercase tracking-wider">Search a member to begin</p>
                  <p className="ss-empty-desc text-[10px] text-slate-400 mt-1.5 max-w-xs">
                    Saakh Score evaluates repayment punctuality, penalties, loan load, savings, tenure &amp; guarantor record
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="ss-error flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3.5 max-w-md"
              >
                <XCircle size={16} className="text-rose-500 shrink-0" />
                <p className="ss-error-text text-[10px] font-bold text-rose-700">{error}</p>
              </motion.div>
            )}

            {/* Loading — animated radar pulse */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-5"
              >
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-indigo-400"
                      initial={{ scale: 0.4, opacity: 0.8 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.55, ease: 'easeOut' }}
                    />
                  ))}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}>
                    <Sparkles size={20} className="text-white" />
                  </div>
                </div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">Analysing member profile…</p>
              </motion.div>
            )}

            {/* ── Result ── */}
            {data && !loading && (
              <motion.div
                key={`result-${data.mbno}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -16 }}
                className="max-w-5xl mx-auto space-y-4 pb-4"
              >

                {/* Hero — dark glass panel with member + gauge (already dark, no override needed) */}
                <motion.div
                  {...sectionAnim(0.05)}
                  className="relative rounded-3xl overflow-hidden"
                  style={{ background: 'linear-gradient(120deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)', boxShadow: '0 20px 50px -16px rgba(30,27,75,0.55)' }}
                >
                  <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.22)' }} />
                  <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(168,85,247,0.16)' }} />
                  <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

                  <div className="relative grid grid-cols-[1fr_auto] gap-6 p-6 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <motion.div
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 16 }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/15"
                          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4))' }}
                        >
                          <User size={22} className="text-white" />
                        </motion.div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black text-white leading-none tracking-tight">{data.memberName || '—'}</h2>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${data.isActive ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-white/50 border border-white/15'}`}>
                              {data.isActive ? '● Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-[11px] font-black text-indigo-300 mt-1 tracking-wide">Member #{data.mbno}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 mt-5">
                        {[
                          { icon: <Calendar size={13} />, label: 'Member Since', value: data.membershipDate || '—' },
                          { icon: <Award size={13} />, label: 'Tenure', value: `${data.tenureYears} yr${data.tenureYears !== 1 ? 's' : ''}` },
                          { icon: <CreditCard size={13} />, label: 'Active Loans', value: String(data.totalActiveLoans) },
                        ].map((s, i) => (
                          <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 + i * 0.1 }}
                            className="rounded-2xl px-3 py-2.5 border border-white/10 backdrop-blur"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                          >
                            <div className="flex items-center gap-1.5 text-indigo-300">
                              {s.icon}
                              <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                            </div>
                            <p className="text-[13px] font-black text-white mt-1">{s.value}</p>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-1.5 mt-4"
                      >
                        {data.totalScore >= 7 ? <TrendingUp size={13} className="text-emerald-400" /> :
                         data.totalScore >= 5 ? <Minus size={13} className="text-amber-400" /> :
                         <TrendingDown size={13} className="text-rose-400" />}
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${data.totalScore >= 7 ? 'text-emerald-400' : data.totalScore >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {data.totalScore >= 7 ? 'Strong Profile' : data.totalScore >= 5 ? 'Moderate Risk' : 'High Risk'}
                        </span>
                      </motion.div>
                    </div>

                    <ScoreGauge score={data.totalScore} tier={data.tier} />
                  </div>
                </motion.div>

                {/* Score breakdown — 6 factor cards */}
                <div>
                  <motion.p {...sectionAnim(0.25)} className="ss-section-label text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2.5 flex items-center gap-1.5">
                    <Sparkles size={10} className="text-indigo-400" /> Score Breakdown
                  </motion.p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {data.factors.map((f, i) => <FactorCard key={f.name} f={f} index={i} />)}
                  </div>
                </div>

                {/* Eligibility + Financial snapshot */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Eligibility */}
                  <motion.div
                    {...sectionAnim(0.55)}
                    className="ss-panel bg-white/70 backdrop-blur border border-slate-200/80 rounded-2xl p-4 space-y-3"
                    style={{ boxShadow: '0 2px 12px -4px rgba(15,23,42,0.06)' }}
                  >
                    <p className="ss-panel-label text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Loan Eligibility Decision</p>
                    <EligibilityBadge eligible={data.eligibility.eligible} />
                    <p className="ss-eligibility-reason text-[10px] text-slate-600 font-medium leading-relaxed">{data.eligibility.reason}</p>
                    {data.eligibility.eligible !== 'NO' && data.eligibility.recommendedAmount > 0 && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.05 }}
                          className="ss-rec-panel rounded-2xl p-3 text-center border border-indigo-100"
                          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.07))' }}
                        >
                          <IndianRupee size={13} className="text-indigo-500 mx-auto mb-1" />
                          <p className="ss-rec-label text-[8px] font-black text-indigo-400 uppercase tracking-widest">Recommended Amt</p>
                          <p className="ss-rec-val text-[14px] font-black text-indigo-800 mt-0.5">
                            ₹<CountUp value={data.eligibility.recommendedAmount} format duration={1400} />
                          </p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.15 }}
                          className="ss-rec-panel rounded-2xl p-3 text-center border border-indigo-100"
                          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.07))' }}
                        >
                          <Calendar size={13} className="text-indigo-500 mx-auto mb-1" />
                          <p className="ss-rec-label text-[8px] font-black text-indigo-400 uppercase tracking-widest">Tenure</p>
                          <p className="ss-rec-val text-[14px] font-black text-indigo-800 mt-0.5">{data.eligibility.recommendedTenure} months</p>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>

                  {/* Financial snapshot */}
                  <motion.div
                    {...sectionAnim(0.65)}
                    className="ss-panel bg-white/70 backdrop-blur border border-slate-200/80 rounded-2xl p-4 space-y-2"
                    style={{ boxShadow: '0 2px 12px -4px rgba(15,23,42,0.06)' }}
                  >
                    <p className="ss-panel-label text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Financial Snapshot</p>
                    {[
                      { label: 'Share Capital', val: data.shareCapital, icon: <Star size={10} className="text-amber-500" />, highlight: false },
                      { label: 'CD Balance', val: data.cdBalance, icon: <IndianRupee size={10} className="text-emerald-600" />, highlight: false },
                      { label: 'MD Balance', val: data.mdBalance, icon: <IndianRupee size={10} className="text-blue-600" />, highlight: false },
                      { label: 'Total Outstanding', val: data.totalOutstanding, icon: <CreditCard size={10} className="text-rose-500" />, highlight: data.totalOutstanding > 0 },
                      { label: 'Suspense Balance', val: data.suspBal, icon: <AlertTriangle size={10} className="text-orange-500" />, highlight: data.suspBal > 0 },
                    ].map((row, i) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 + i * 0.07 }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                          row.highlight
                            ? 'ss-fin-row-hl bg-rose-50/80 hover:bg-rose-50'
                            : 'ss-fin-row bg-slate-50/80 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {row.icon}
                          <span className="ss-fin-label text-[10px] font-bold text-slate-600">{row.label}</span>
                        </div>
                        <span className={`text-[11px] font-black ${row.highlight ? 'ss-fin-val-hl text-rose-700' : 'ss-fin-val text-slate-800'}`}>
                          ₹{row.val.toLocaleString('en-IN')}
                        </span>
                      </motion.div>
                    ))}
                    {data.guarantorInfo.isGuarantorForCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                          data.guarantorInfo.guarantorLoansHealthy
                            ? 'ss-guarantor-good bg-emerald-50/80'
                            : 'ss-guarantor-bad bg-amber-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={10} className={data.guarantorInfo.guarantorLoansHealthy ? 'text-emerald-600' : 'text-amber-600'} />
                          <span className="ss-fin-label text-[10px] font-bold text-slate-600">Guarantor for</span>
                        </div>
                        <span className={`text-[11px] font-black ${data.guarantorInfo.guarantorLoansHealthy ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {data.guarantorInfo.isGuarantorForCount} member{data.guarantorInfo.isGuarantorForCount !== 1 ? 's' : ''}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {/* Active loans list */}
                {data.activeLoans.length > 0 && (
                  <motion.div
                    {...sectionAnim(0.8)}
                    className="ss-loans-panel bg-white/70 backdrop-blur border border-slate-200/80 rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 2px 12px -4px rgba(15,23,42,0.06)' }}
                  >
                    <div className="ss-loans-header px-4 py-3 border-b border-slate-100 flex items-center justify-between"
                      style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
                      <p className="ss-section-label text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-1.5">
                        <CreditCard size={10} className="text-indigo-400" /> Active Loans ({data.activeLoans.length})
                      </p>
                      <span className="text-[10px] font-black text-rose-600">₹{data.totalOutstanding.toLocaleString('en-IN')} outstanding</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {data.activeLoans.map((loan, i) => (
                        <motion.div
                          key={loan.loancaseno}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.95 + i * 0.06 }}
                          whileHover={{ backgroundColor: 'rgba(238,242,255,0.6)' }}
                          className="px-4 py-3 flex items-center gap-4"
                        >
                          <div className="ss-loan-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))' }}>
                            <CreditCard size={15} className="text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="ss-loan-type text-[11px] font-black text-slate-700 uppercase tracking-wide">{loan.loantype}</span>
                              {loan.penalrate > 0 && (
                                <span className="text-[7px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Penalty {loan.penalrate}%
                                </span>
                              )}
                            </div>
                            <p className="ss-loan-detail text-[9px] text-slate-500 mt-0.5">
                              Case #{loan.loancaseno} · {loan.noOfInstal} instals @ ₹{loan.instalAmt.toLocaleString('en-IN')}/mo · {loan.rate}% p.a.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12px] font-black text-rose-700">₹{loan.balance.toLocaleString('en-IN')}</p>
                            <p className="text-[8px] text-slate-400 font-bold">{loan.repaidPct}% repaid</p>
                          </div>
                          <div className="w-16 shrink-0">
                            <div className="ss-loan-track h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${loan.repaidPct}%` }}
                                transition={{ delay: 1.1 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Improvement tips */}
                <motion.div
                  {...sectionAnim(1.0)}
                  className="ss-tips rounded-2xl p-4 border border-indigo-100/80"
                  style={{ background: 'linear-gradient(120deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06), rgba(236,72,153,0.04))' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <motion.div
                      animate={{ rotate: [0, -12, 12, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    >
                      <Lightbulb size={15} className="text-indigo-500" />
                    </motion.div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em]">Score Improvement Tips</p>
                  </div>
                  <div className="space-y-2">
                    {data.improvementTips.map((tip, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.15 + i * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <ChevronRight size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                        <p className="ss-tip-text text-[10px] text-slate-700 font-medium leading-relaxed">{tip}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="ss-footer px-4 py-1.5 bg-white/80 backdrop-blur border-t border-slate-200/70 flex items-center justify-between shrink-0">
          <div className="ss-footer-left flex items-center gap-1.5">
            <Building2 size={9} className="text-slate-400" />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Saakh Score Engine v1.0</span>
          </div>
          <div className="ss-footer-right flex items-center gap-1 text-indigo-500">
            <Info size={9} />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">Score is indicative — committee decision is final</span>
          </div>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default SaakhScore;
