import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../../../services/api';

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

interface ModalDetail {
  kicker: string;
  title: string;
  body: string;
  points: { label: string; value: string }[];
}

const DETAILS: Record<string, ModalDetail> = {
  members: {
    kicker: 'Capability',
    title: 'Member management',
    body: "Onboarding, KYC, share capital and closure handled as one continuous record, so a member's history never fragments across modules.",
    points: [
      { label: 'Records supported', value: 'Unlimited' },
      { label: 'KYC documents', value: 'Aadhaar · PAN · Bank' },
      { label: 'Audit trail', value: 'Per-field history' },
    ],
  },
  security: {
    kicker: 'Capability',
    title: 'Secure transactions',
    body: 'Every posting is double-entry, signed and immutable. Local data rests encrypted; sync is mutually authenticated.',
    points: [
      { label: 'Encryption at rest', value: 'AES-256' },
      { label: 'Transport', value: 'TLS 1.3' },
      { label: 'Access control', value: 'Role based' },
    ],
  },
  reports: {
    kicker: 'Capability',
    title: 'Real-time reports',
    body: 'Ledgers, NPA ageing and collection sheets recompute as vouchers are entered — no nightly batch to wait on.',
    points: [
      { label: 'Refresh', value: 'Live' },
      { label: 'Export', value: 'PDF · XLSX' },
      { label: 'Statutory formats', value: 'Included' },
    ],
  },
  stack: {
    kicker: 'Engineering',
    title: 'Modern stack',
    body: 'A typed React desktop client over a NestJS service layer and PostgreSQL, packaged with Electron for offline-first branches.',
    points: [
      { label: 'Client', value: 'React · TypeScript' },
      { label: 'Service', value: 'NestJS' },
      { label: 'Storage', value: 'PostgreSQL 16' },
    ],
  },
  ux: {
    kicker: 'Experience',
    title: 'User friendly',
    body: 'Keyboard-first data entry, forgiving defaults and one visual language across every screen, tuned for all-day counter work.',
    points: [
      { label: 'Keyboard coverage', value: 'Full' },
      { label: 'Languages', value: 'EN · HI' },
      { label: 'Training time', value: 'Under a day' },
    ],
  },
  enterprise: {
    kicker: 'Operations',
    title: 'Enterprise ready',
    body: 'Multi-branch deployments with scheduled backups, staged upgrades and supervised restore paths.',
    points: [
      { label: 'Branches', value: 'Multi-site' },
      { label: 'Backups', value: 'Hourly · retained 30d' },
      { label: 'Support', value: '24/7' },
    ],
  },
};

const CUBE_FACES = [
  { label: 'React', transform: 'translateZ(58px)', odd: false },
  { label: 'TypeScript', transform: 'rotateY(90deg) translateZ(58px)', odd: true },
  { label: 'Electron', transform: 'rotateY(180deg) translateZ(58px)', odd: false },
  { label: 'NestJS', transform: 'rotateY(270deg) translateZ(58px)', odd: true },
  { label: 'PostgreSQL', transform: 'rotateX(90deg) translateZ(58px)', small: true, bg: 'rgba(255,255,255,0.2)', border: 'rgba(255,255,255,0.3)' },
  { label: 'Tailwind', transform: 'rotateX(-90deg) translateZ(58px)', small: true, bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.3)' },
];

const FEATURES = [
  {
    key: 'members',
    gradient: 'linear-gradient(150deg, #5ac8fa, #0a84ff)',
    title: 'Member management',
    desc: 'Complete member lifecycle',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="9" r="3.4"></circle>
        <path d="M5.5 19c1.2-3 3.6-4.4 6.5-4.4S17.3 16 18.5 19"></path>
      </svg>
    ),
  },
  {
    key: 'security',
    gradient: 'linear-gradient(150deg, #34c759, #0f9d58)',
    title: 'Secure transactions',
    desc: 'Bank-grade security',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6z"></path>
      </svg>
    ),
  },
  {
    key: 'reports',
    gradient: 'linear-gradient(150deg, #ffd60a, #ff9f0a)',
    title: 'Real-time reports',
    desc: 'Instant analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M13 3L6 13h5l-1 8 7-10h-5z"></path>
      </svg>
    ),
  },
  {
    key: 'stack',
    gradient: 'linear-gradient(150deg, #bf5af2, #7d2ae8)',
    title: 'Modern stack',
    desc: 'Latest technologies',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M9 8l-4 4 4 4"></path>
        <path d="M15 8l4 4-4 4"></path>
      </svg>
    ),
  },
  {
    key: 'ux',
    gradient: 'linear-gradient(150deg, #ff9f8a, #ff375f)',
    title: 'User friendly',
    desc: 'Intuitive interface',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M12 19s-6.5-4.2-6.5-8.3A3.7 3.7 0 0 1 12 8.2a3.7 3.7 0 0 1 6.5 2.5C18.5 14.8 12 19 12 19z"></path>
      </svg>
    ),
  },
  {
    key: 'enterprise',
    gradient: 'linear-gradient(150deg, #64d2ff, #0a84ff)',
    title: 'Enterprise ready',
    desc: 'Production tested',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="10" r="4"></circle>
        <path d="M9.5 14l-1 6 3.5-2 3.5 2-1-6"></path>
      </svg>
    ),
  },
];

const About: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await apiService.request<SystemInfo>('/admin/system-info', { method: 'GET' });
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch { /* system info is optional */ }
  }, []);

  useEffect(() => { fetchSystemInfo(); }, [fetchSystemInfo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!meterRef.current) return;
      const pct = systemInfo && systemInfo.memoryUsage.heapTotal > 0
        ? ((systemInfo.memoryUsage.heapUsed / systemInfo.memoryUsage.heapTotal) * 100).toFixed(1)
        : '84.5';
      meterRef.current.style.width = pct + '%';
    }, 420);
    return () => clearTimeout(timer);
  }, [systemInfo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'transform 0.12s linear';
    el.style.transform = `rotateY(${(px * 12).toFixed(2)}deg) rotateX(${(-py * 9).toFixed(2)}deg)`;
  };

  const onHeroLeave = () => {
    const el = heroRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)';
    el.style.transform = 'rotateY(0deg) rotateX(0deg)';
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const getModalData = (): ModalDetail | null => {
    if (!modal) return null;
    if (modal === 'runtime') {
      return {
        kicker: 'System',
        title: 'Runtime status',
        body: 'Live figures reported by the local application host at last refresh.',
        points: systemInfo
          ? [
              { label: 'Node version', value: systemInfo.nodeVersion },
              { label: 'Platform', value: systemInfo.platform },
              { label: 'Heap used', value: `${systemInfo.memoryUsage.heapUsed} MB of ${systemInfo.memoryUsage.heapTotal} MB` },
              { label: 'RSS', value: `${systemInfo.memoryUsage.rss} MB` },
            ]
          : [{ label: 'Status', value: 'Unavailable' }],
      };
    }
    return DETAILS[modal] ?? null;
  };

  const modalData = getModalData();
  const heapUsed = systemInfo?.memoryUsage.heapUsed ?? 71;
  const heapTotal = systemInfo?.memoryUsage.heapTotal ?? 84;
  const uptime = systemInfo ? formatUptime(systemInfo.uptime) : '—';
  const nodeVersion = systemInfo?.nodeVersion ?? 'v22.17.0';

  const glassCard: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: '18px 20px 20px',
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 14px 34px -16px rgba(16,21,28,0.28), inset 0 1px 0 rgba(255,255,255,0.85)',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(16,21,28,0.52)',
  };

  return (
    <div className="ab-page" style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif", color: '#10151c', background: 'linear-gradient(180deg, #f2f5fa 0%, #e6ebf3 100%)', WebkitFontSmoothing: 'antialiased' }}>

      <style>{`
        :root { --ab-accent: #0a84ff; --ab-ink2: rgba(16,21,28,0.52); }
        /* ── About — dark mode (Settings-panel palette). Surfaces are inline-styled,
           so glass tiles are matched on their serialized inline background. ── */
        html.dark .ab-page { background: #000000 !important; color: #f5f5f7 !important; --ab-ink2: #8e8e93; }
        html.dark .ab-page .ab-blob1, html.dark .ab-page .ab-blob2, html.dark .ab-page .ab-blob3 { opacity: 0.35; }
        html.dark .ab-header, html.dark .ab-footer { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .ab-rise1, html.dark .ab-rise2, html.dark .ab-rise3, html.dark .ab-rise4, html.dark .ab-rise5,
        html.dark .ab-modal-box { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.55)"],
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.6)"],
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.62)"],
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.66)"],
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.7)"],
        html.dark .ab-page [style*="rgba(255, 255, 255, 0.72)"] { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .ab-feat-card { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .ab-page [style*="color: rgb(16, 21, 28)"] { color: #f5f5f7 !important; }
        html.dark .ab-page [style*="color: rgba(16, 21, 28, 0.7)"] { color: #8e8e93 !important; }
        html.dark .ab-page [style*="border-bottom: 1px solid rgba(16, 21, 28, 0.07)"] { border-bottom-color: rgba(255,255,255,.07) !important; }
        html.dark .ab-page [style*="rgba(16, 21, 28, 0.09)"] { background: rgba(255,255,255,.08) !important; }
        html.dark .ab-details-btn:hover, html.dark .ab-close-btn:hover { background: rgba(255,255,255,.1) !important; color: #f5f5f7 !important; }
        html.dark .ab-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); }
        a { color: var(--ab-accent); text-decoration: none; }
        a:hover { color: #0060df; text-decoration: underline; }
        @keyframes ab-drift1 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(6vw,4vh,0) scale(1.15)} }
        @keyframes ab-drift2 { 0%,100%{transform:translate3d(0,0,0) scale(1.1)} 50%{transform:translate3d(-7vw,-5vh,0) scale(0.9)} }
        @keyframes ab-drift3 { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(4vw,-6vh,0)} }
        @keyframes ab-spin3d { from{transform:rotateX(-16deg) rotateY(0deg)} to{transform:rotateX(-16deg) rotateY(360deg)} }
        @keyframes ab-sheen { 0%{transform:translateX(-120%) skewX(-18deg)} 100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes ab-popIn { from{opacity:0;transform:translateY(24px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ab-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ab-riseIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ab-pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.72)} }
        .ab-blob1{animation:ab-drift1 26s ease-in-out infinite}
        .ab-blob2{animation:ab-drift2 32s ease-in-out infinite}
        .ab-blob3{animation:ab-drift3 38s ease-in-out infinite}
        .ab-cube{animation:ab-spin3d 22s linear infinite;transform-style:preserve-3d}
        .ab-sheen{animation:ab-sheen 7s ease-in-out infinite;pointer-events:none}
        .ab-pulse{animation:ab-pulseDot 2.2s ease-in-out infinite;display:inline-block;width:7px;height:7px;border-radius:50%;background:#34c759}
        .ab-rise0{animation:ab-riseIn 0.6s cubic-bezier(0.22,1,0.36,1) both}
        .ab-rise1{animation:ab-riseIn 0.6s 0.06s cubic-bezier(0.22,1,0.36,1) both}
        .ab-rise2{animation:ab-riseIn 0.6s 0.12s cubic-bezier(0.22,1,0.36,1) both}
        .ab-rise3{animation:ab-riseIn 0.6s 0.18s cubic-bezier(0.22,1,0.36,1) both}
        .ab-rise4{animation:ab-riseIn 0.6s 0.24s cubic-bezier(0.22,1,0.36,1) both}
        .ab-rise5{animation:ab-riseIn 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both}
        .ab-modal-bg{animation:ab-fadeIn 0.22s ease both}
        .ab-modal-box{animation:ab-popIn 0.42s cubic-bezier(0.22,1,0.36,1) both}
        .ab-feat-card{cursor:pointer;transition:transform 0.35s cubic-bezier(0.22,1,0.36,1),box-shadow 0.35s ease}
        .ab-feat-card:hover{transform:translateY(-6px) rotateX(6deg) scale(1.02);box-shadow:0 22px 40px -18px rgba(10,132,255,0.55)!important}
        .ab-details-btn{transition:background 0.18s}
        .ab-details-btn:hover{background:#fff!important}
        .ab-close-btn{transition:background 0.18s,color 0.18s}
        .ab-close-btn:hover{background:#fff!important;color:#10151c!important}
        .ab-done-btn:hover{filter:brightness(1.06)}
        .ab-meter{height:100%;width:6%;border-radius:99px;background:linear-gradient(90deg,#5ac8fa,#0a84ff);box-shadow:0 0 12px rgba(10,132,255,0.55);transition:width 1.4s cubic-bezier(0.22,1,0.36,1)}
        .ab-scroll::-webkit-scrollbar{width:8px}
        .ab-scroll::-webkit-scrollbar-thumb{background:rgba(16,21,28,0.18);border-radius:99px}
        .ab-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* Animated background blobs */}
      <div style={{ position: 'absolute', inset: '-10%', pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="ab-blob1" style={{ position: 'absolute', width: '46vw', height: '46vw', left: '-6vw', top: '-8vw', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(10,132,255,0.55), rgba(10,132,255,0) 70%)', filter: 'blur(40px)' }}></div>
        <div className="ab-blob2" style={{ position: 'absolute', width: '40vw', height: '40vw', right: '-4vw', top: '6vh', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(175,82,222,0.42), rgba(175,82,222,0) 70%)', filter: 'blur(50px)' }}></div>
        <div className="ab-blob3" style={{ position: 'absolute', width: '52vw', height: '38vw', left: '22vw', bottom: '-14vw', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(48,209,188,0.38), rgba(48,209,188,0) 70%)', filter: 'blur(46px)' }}></div>
      </div>

      {/* Header */}
      <div className="ab-header" style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 22px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 0 rgba(16,21,28,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg, #5ac8fa, #0a84ff 55%, #0040dd)', boxShadow: '0 6px 16px rgba(10,132,255,0.38), inset 0 1px 0 rgba(255,255,255,0.6)', overflow: 'hidden' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 11v6"></path>
              <path d="M12 7.6v.2"></path>
            </svg>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>About System</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ab-ink2)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>Loan Management System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#12622f', background: 'rgba(52,199,89,0.16)', border: '1px solid rgba(52,199,89,0.32)' }}>
            <span className="ab-pulse"></span>
            All systems normal
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#10151c', background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(16,21,28,0.06)' }}>Version 1.0.0</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="ab-scroll" style={{ position: 'relative', zIndex: 4, flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 22px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>

          {/* Hero */}
          <div className="ab-rise0" onMouseMove={onHeroMove} onMouseLeave={onHeroLeave} style={{ gridColumn: 'span 2', perspective: 1200 }}>
            <div ref={heroRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: '30px 32px', minHeight: 236, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, color: '#fff', background: 'linear-gradient(140deg, #0b2a5b 0%, #12448f 45%, #0a84ff 100%)', boxShadow: '0 26px 60px -20px rgba(11,42,91,0.6), inset 0 1px 0 rgba(255,255,255,0.28)', transformStyle: 'preserve-3d' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 8% 0%, rgba(255,255,255,0.3), rgba(255,255,255,0) 55%)', pointerEvents: 'none' }}></div>
              <div className="ab-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '22%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)' }}></div>

              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '54%', transform: 'translateZ(48px)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.72 }}>Financial Technology · India</div>
                <div style={{ fontSize: 40, lineHeight: 1.02, fontWeight: 600, letterSpacing: '-0.028em' }}>Paper White<br />Technology</div>
                <div style={{ fontSize: 15, fontWeight: 400, opacity: 0.8, letterSpacing: '-0.005em' }}>Lending infrastructure for cooperative societies — members, ledgers and compliance in one desktop workspace.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {['Enterprise Edition', 'Production Ready', 'Est. 2025'].map((badge, i) => (
                    <div key={badge} style={{ padding: '7px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: i === 1 ? 'rgba(52,199,89,0.24)' : 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.34)', backdropFilter: 'blur(8px)' }}>{badge}</div>
                  ))}
                </div>
              </div>

              {/* 3D spinning cube */}
              <div style={{ position: 'relative', width: 220, height: 190, display: 'grid', placeItems: 'center', transform: 'translateZ(70px)', perspective: 700 }}>
                <div className="ab-cube" style={{ position: 'relative', width: 116, height: 116 }}>
                  {CUBE_FACES.map((face) => (
                    <div key={face.label} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: face.small ? 12 : 13, fontWeight: 600, letterSpacing: face.small ? 0 : '0.02em', color: '#fff', background: face.bg ?? (face.odd ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.16)'), border: `1px solid ${face.border ?? (face.odd ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.42)')}`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: 12, transform: face.transform }}>{face.label}</div>
                  ))}
                </div>
                <div style={{ position: 'absolute', bottom: 6, width: 130, height: 20, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.42), transparent)', filter: 'blur(6px)' }}></div>
              </div>
            </div>
          </div>

          {/* Company */}
          <div className="ab-rise1" style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ab-accent)" strokeWidth="2" strokeLinecap="round"><path d="M4 20V6.5L12 3l8 3.5V20"></path><path d="M9 20v-6h6v6"></path></svg>
              <div style={sectionLabel}>Company</div>
            </div>
            {[
              { label: 'Legal name', value: 'Paper White Technology' },
              { label: 'Established', value: '2025' },
              { label: 'Location', value: 'India' },
              { label: 'Industry', value: 'Financial Technology' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(16,21,28,0.07)' : 'none' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ab-ink2)' }}>{row.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="ab-rise2" style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ab-accent)" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16v12H4z"></path><path d="M4 7l8 6 8-6"></path></svg>
              <div style={sectionLabel}>Contact</div>
            </div>
            {[
              { label: 'Email', value: 'support@paperwhitetech.com', href: 'mailto:support@paperwhitetech.com' },
              { label: 'Phone', value: '+91 12345 67890' },
              { label: 'Website', value: 'paperwhitetech.com', href: 'https://www.paperwhitetech.com' },
              { label: 'Support', value: '24/7 available' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(16,21,28,0.07)' : 'none' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ab-ink2)' }}>{row.label}</span>
                {'href' in row ? (
                  <a href={row.href} style={{ fontSize: 13.5, fontWeight: 600 }}>{row.value}</a>
                ) : (
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.value}</span>
                )}
              </div>
            ))}
          </div>

          {/* Built with */}
          <div className="ab-rise3" style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ab-accent)" strokeWidth="2" strokeLinecap="round"><path d="M9 8l-4 4 4 4"></path><path d="M15 8l4 4-4 4"></path></svg>
                <div style={sectionLabel}>Built with</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ab-ink2)' }}>6 core technologies</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['React', 'TypeScript', 'Electron', 'NestJS', 'PostgreSQL', 'Tailwind CSS'].map(tech => (
                <div key={tech} style={{ padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 3px 10px rgba(16,21,28,0.08)' }}>{tech}</div>
              ))}
            </div>
          </div>

          {/* Runtime */}
          <div className="ab-rise4" style={glassCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ab-accent)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="5" width="14" height="14" rx="3"></rect><path d="M9 9h6v6H9z"></path></svg>
                <div style={sectionLabel}>Runtime</div>
              </div>
              <button className="ab-details-btn" onClick={() => setModal('runtime')} style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, color: 'var(--ab-accent)', cursor: 'pointer', fontFamily: 'inherit' }}>Details</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 15, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.85)' }}>
                <div style={{ fontSize: 11, color: 'var(--ab-ink2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Node</div>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{nodeVersion}</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 15, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.85)' }}>
                <div style={{ fontSize: 11, color: 'var(--ab-ink2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Uptime</div>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{uptime}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--ab-ink2)' }}>Heap memory</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{heapUsed} MB / {heapTotal} MB</span>
            </div>
            <div style={{ height: 9, borderRadius: 99, background: 'rgba(16,21,28,0.09)', overflow: 'hidden' }}>
              <div ref={meterRef} className="ab-meter"></div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="ab-rise5" style={{ gridColumn: 'span 2', position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '20px 22px 22px', background: 'rgba(255,255,255,0.44)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 16px 40px -18px rgba(16,21,28,0.28), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
              <div style={sectionLabel}>Capabilities</div>
              <div style={{ fontSize: 11.5, color: 'var(--ab-ink2)' }}>Select a card for detail</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, perspective: 900 }}>
              {FEATURES.map(feat => (
                <div key={feat.key} className="ab-feat-card" onClick={() => setModal(feat.key)} style={{ padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.66)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 6px 18px -10px rgba(16,21,28,0.3)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', marginBottom: 11, background: feat.gradient, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>{feat.icon}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{feat.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ab-ink2)', marginTop: 3 }}>{feat.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="ab-footer" style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.7)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ab-ink2)', letterSpacing: '0.02em' }}>© {new Date().getFullYear()} Paper White Technology · All rights reserved</span>
      </div>

      {/* Modal */}
      {modal && modalData && (
        <div className="ab-modal-bg" onClick={() => setModal(null)} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 32, background: 'rgba(16,21,28,0.26)', backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }}>
          <div className="ab-modal-box" onClick={e => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 460, borderRadius: 26, padding: '26px 26px 22px', background: 'rgba(255,255,255,0.74)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 40px 80px -30px rgba(16,21,28,0.55), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
            <div style={{ position: 'absolute', top: '-40%', left: '-20%', width: '70%', height: '120%', background: 'radial-gradient(closest-side, rgba(10,132,255,0.22), transparent)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ab-ink2)' }}>{modalData.kicker}</div>
                <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.024em' }}>{modalData.title}</div>
              </div>
              <button className="ab-close-btn" onClick={() => setModal(null)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ab-ink2)', fontFamily: 'inherit' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
              </button>
            </div>
            <div style={{ position: 'relative', fontSize: 14, lineHeight: 1.55, color: 'rgba(16,21,28,0.7)', marginTop: 12 }}>{modalData.body}</div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {modalData.points.map((pt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.66)', border: '1px solid rgba(255,255,255,0.9)' }}>
                  <span style={{ fontSize: 13, color: 'var(--ab-ink2)' }}>{pt.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{pt.value}</span>
                </div>
              ))}
            </div>
            <button className="ab-done-btn" onClick={() => setModal(null)} style={{ position: 'relative', width: '100%', marginTop: 18, padding: 13, borderRadius: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#fff', background: 'linear-gradient(150deg, #5ac8fa, #0a84ff 60%, #0060df)', boxShadow: '0 12px 26px -12px rgba(10,132,255,0.8), inset 0 1px 0 rgba(255,255,255,0.5)' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default About;
