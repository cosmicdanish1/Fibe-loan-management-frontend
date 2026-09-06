import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ── icon helpers ─────────────────────────────────────────────────────────────
type IconKey = 'rocket' | 'settings' | 'check' | 'zap' | 'users' | 'search' |
  'rupee' | 'file' | 'db' | 'trend' | 'calc' | 'alert' | 'mail' | 'help' | 'phone';

const ICON_PATHS: Record<IconKey, React.ReactNode> = {
  rocket: <path d="M12 2c3 2 5 6 5 10-1 1-2 2-2 2l-1 6-2-3-3 1 1-3-3-2-3 1 1-6c0-4 2-8 5-10z" />,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M4.2 12h2M17.8 12h2M12 4.2v2M12 17.8v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  zap: <path d="M13 3L6 13h5l-1 8 7-10h-5z" />,
  users: <><circle cx="12" cy="9" r="3.4" /><path d="M5.5 19c1.2-3 3.6-4.4 6.5-4.4S17.3 16 18.5 19" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4.3-4.3" /></>,
  rupee: <path d="M6 4h12M6 9h12M6 4c0 4 5 5.5 9 5.5M6 9l9 10.5" />,
  file: <path d="M6 4h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  db: <><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" /><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></>,
  trend: <path d="M4 17l5-5 4 4 7-9" />,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h2M8 16h2M14 12h2M14 16h2" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.2v.2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.6-2.5 2-2.5 4" /><path d="M12 17v.2" /></>,
  phone: <path d="M6.6 10.8a8 8 0 0011 5.2L21 20l-1.5-4a8 8 0 10-12.9-5.2z" />,
};

function Icon({ k, size = 14, color = 'currentColor', spinning = false }: { k: IconKey; size?: number; color?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" width={size} height={size} style={spinning ? { animation: 'hc-rot3d 5s linear infinite' } : undefined}>
      {ICON_PATHS[k]}
    </svg>
  );
}

// ── data ─────────────────────────────────────────────────────────────────────
interface HelpItem {
  title: string;
  description: string;
  icon: IconKey;
  body: string;
}

interface HelpSection {
  id: string;
  title: string;
  grad: string;
  icon: IconKey;
  items: HelpItem[];
}

const SECTIONS: HelpSection[] = [
  {
    id: '1', title: 'Getting Started', grad: 'linear-gradient(150deg,#5ac8fa,#0a84ff)', icon: 'rocket',
    items: [
      { title: 'Introduction', description: 'Overview of the Loan Management System and its core features', icon: 'check', body: 'A tour of the ledger, member and voucher modules and how they connect in daily operation.' },
      { title: 'System Requirements', description: 'Hardware and software requirements for optimal performance', icon: 'settings', body: 'Windows 10/11, 8GB RAM minimum, 2GB free disk, and a stable network link to the branch server.' },
      { title: 'Installation Guide', description: 'Step-by-step instructions for installing and configuring the system', icon: 'check', body: 'Run the signed installer, point it at your database, then complete the first-run setup wizard.' },
      { title: 'First Login', description: 'How to access the system and navigate the main dashboard', icon: 'zap', body: 'Sign in with the credentials issued by your administrator; the dashboard opens to today\'s activity.' },
    ],
  },
  {
    id: '2', title: 'Member Management', grad: 'linear-gradient(150deg,#34c759,#0f9d58)', icon: 'users',
    items: [
      { title: 'Adding New Members', description: 'Create member profiles with personal and financial details', icon: 'users', body: 'Capture KYC, nominee and share details in one guided form; duplicates are flagged automatically.' },
      { title: 'Member Search', description: 'Find members by number, name, or other criteria', icon: 'search', body: 'Search by member number, name, phone or account — results update as you type.' },
      { title: 'Member Balance', description: 'View comprehensive balance information for any member', icon: 'rupee', body: 'See every savings, loan and deposit balance for a member on one consolidated screen.' },
      { title: 'Member Statements', description: 'Generate detailed transaction statements for members', icon: 'file', body: 'Export a dated statement of any account as PDF or Excel for the member\'s records.' },
    ],
  },
  {
    id: '3', title: 'Transactions & Vouchers', grad: 'linear-gradient(150deg,#bf5af2,#7d2ae8)', icon: 'file',
    items: [
      { title: 'Creating Vouchers', description: 'Process deposits, withdrawals, and loan transactions', icon: 'file', body: 'Every voucher is double-entry and posts instantly to the relevant ledgers.' },
      { title: 'Transaction Types', description: 'Understanding different transaction categories and codes', icon: 'db', body: 'Standard codes cover deposits, withdrawals, disbursements, repayments and adjustments.' },
      { title: 'Voucher Verification', description: 'Review and approve pending transactions', icon: 'check', body: 'A second approver reviews queued vouchers before they post — full audit trail kept.' },
      { title: 'Transaction History', description: 'View and search historical transaction records', icon: 'trend', body: 'Filter historical postings by date, member, branch or voucher type.' },
    ],
  },
  {
    id: '4', title: 'Reports & Analytics', grad: 'linear-gradient(150deg,#ffd60a,#ff9f0a)', icon: 'trend',
    items: [
      { title: 'EMI Charts', description: 'View loan EMI schedules and payment tracking', icon: 'calc', body: 'Amortization schedules recompute automatically after part-payments or rate changes.' },
      { title: 'Interest Statements', description: 'Generate interest receivable and received reports', icon: 'rupee', body: 'Compare interest receivable against interest actually received, by period or branch.' },
      { title: 'Premature Information', description: 'Calculate premature withdrawal amounts for FD/RD/SB', icon: 'alert', body: 'Instantly quote the payable amount for an early closure, penalty included.' },
      { title: 'Custom Reports', description: 'Create filtered reports based on date ranges and criteria', icon: 'file', body: 'Build ad-hoc reports with your own filters and save them as templates.' },
    ],
  },
  {
    id: '5', title: 'Utilities & Tools', grad: 'linear-gradient(150deg,#64d2ff,#0a84ff)', icon: 'settings',
    items: [
      { title: 'Calculator', description: 'Calculate loan EMI, interest rates, and maturity amounts', icon: 'calc', body: 'A built-in calculator for EMI, maturity value and effective interest rate.' },
      { title: 'Database Backup', description: 'Create and restore database backups for data safety', icon: 'db', body: 'Schedule automatic backups and restore from any saved snapshot in a few clicks.' },
      { title: 'Communication Hub', description: 'Send SMS, WhatsApp, and email notifications to members', icon: 'mail', body: 'Send due reminders and statements via SMS, WhatsApp or email in bulk or one-off.' },
      { title: 'Update Saving Interest', description: 'Process and update interest for savings accounts', icon: 'rupee', body: 'Run the periodic interest update across all savings accounts in one batch job.' },
    ],
  },
  {
    id: '6', title: 'Troubleshooting', grad: 'linear-gradient(150deg,#ff9f8a,#ff375f)', icon: 'alert',
    items: [
      { title: 'Common Issues', description: 'Solutions to frequently encountered problems', icon: 'help', body: 'The most frequent setup and login issues, with quick fixes for each.' },
      { title: 'Error Messages', description: 'Understanding and resolving system error messages', icon: 'alert', body: 'A reference of error codes and what each one means for your data or connection.' },
      { title: 'Performance Tips', description: 'Optimize system performance and speed', icon: 'zap', body: 'Keep the database indexed and archive old vouchers periodically for best speed.' },
      { title: 'Contact Support', description: 'Get help from our technical support team', icon: 'phone', body: 'Reach the support desk at +91 12345 67890 or support@paperwhitetech.com, 24/7.' },
    ],
  },
];

const TOTAL_TOPICS = SECTIONS.reduce((a, s) => a + s.items.length, 0);

// ── component ─────────────────────────────────────────────────────────────────
interface ModalState { sectionId: string; index: number }

const Contents: React.FC = () => {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ '1': true });
  const [modal, setModal] = useState<ModalState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.toLowerCase();

  const filtered = useMemo(() =>
    SECTIONS.map(s => ({
      ...s,
      items: q ? s.items.filter(it => it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)) : s.items,
    })).filter(s => s.items.length > 0),
    [q]
  );

  const onSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const toggleSection = useCallback((id: string) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openItem = useCallback((sectionId: string, index: number) => {
    setModal({ sectionId, index });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const modalSection = modal ? SECTIONS.find(s => s.id === modal.sectionId) : null;
  const modalItem = modalSection ? modalSection.items[modal!.index] : null;

  const today = new Date().toLocaleDateString();

  // Sections shown: when searching, all expand automatically
  const isOpen = (id: string) => q ? true : !!openIds[id];
  const chevronDeg = (id: string) => isOpen(id) ? 90 : 0;

  const glassCard: React.CSSProperties = {
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 14px 30px -16px rgba(16,21,28,0.26), inset 0 1px 0 rgba(255,255,255,0.85)',
  };

  return (
    <div className="hc-page" style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif", color: '#10151c', background: 'linear-gradient(180deg, #f2f5fa 0%, #e6ebf3 100%)', WebkitFontSmoothing: 'antialiased' }}>

      <style>{`
        :root { --hc-accent: #0a84ff; --hc-ink2: rgba(16,21,28,0.52); }
        /* ── Help Contents — dark mode (Settings-panel palette). Surfaces are inline-styled,
           so glass tiles are matched on their serialized inline background. ── */
        html.dark .hc-page { background: #000000 !important; color: #f5f5f7 !important; --hc-ink2: #8e8e93; }
        html.dark .hc-page .hc-blob1, html.dark .hc-page .hc-blob2 { opacity: 0.35; }
        html.dark .hc-header, html.dark .hc-footer { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .hc-rise0, html.dark .hc-rise1, html.dark .hc-modal-box,
        html.dark .hc-page [style*="rgba(255, 255, 255, 0.55)"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .hc-page [style*="rgba(255, 255, 255, 0.5)"],
        html.dark .hc-page [style*="rgba(255, 255, 255, 0.6)"],
        html.dark .hc-page [style*="rgba(255, 255, 255, 0.62)"],
        html.dark .hc-page [style*="rgba(255, 255, 255, 0.7)"] { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .hc-sec-hd { background: #1c1c1e !important; }
        html.dark .hc-sec-hd:hover { background: rgba(255,255,255,.08) !important; }
        html.dark .hc-item { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .hc-input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .hc-input::placeholder { color: #71717a; }
        html.dark .hc-page [style*="color: rgb(16, 21, 28)"] { color: #f5f5f7 !important; }
        html.dark .hc-page [style*="color: rgba(16, 21, 28, 0.7)"] { color: #8e8e93 !important; }
        html.dark .hc-page [style*="border-bottom: 1px solid rgba(16, 21, 28, 0.06)"] { border-bottom-color: rgba(255,255,255,.07) !important; }
        html.dark .hc-page [style*="rgba(16, 21, 28, 0.08)"] { background: rgba(255,255,255,.08) !important; }
        html.dark .hc-page [style*="rgba(16, 21, 28, 0.12)"] { background: rgba(255,255,255,.12) !important; }
        html.dark .hc-page svg[stroke="rgba(16,21,28,0.52)"] { stroke: #8e8e93; }
        html.dark .hc-close:hover { background: rgba(255,255,255,.1) !important; color: #f5f5f7 !important; }
        html.dark .hc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); }
        @keyframes hc-drift1 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(6vw,4vh,0) scale(1.15)} }
        @keyframes hc-drift2 { 0%,100%{transform:translate3d(0,0,0) scale(1.1)} 50%{transform:translate3d(-7vw,-5vh,0) scale(0.9)} }
        @keyframes hc-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes hc-popIn { from{opacity:0;transform:translateY(24px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes hc-riseIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hc-pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.72)} }
        @keyframes hc-rot3d { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
        .hc-blob1{animation:hc-drift1 28s ease-in-out infinite}
        .hc-blob2{animation:hc-drift2 34s ease-in-out infinite}
        .hc-pulse{animation:hc-pulseDot 2.2s ease-in-out infinite;display:inline-block;width:7px;height:7px;border-radius:50%;background:#34c759}
        .hc-rise0{animation:hc-riseIn 0.5s cubic-bezier(0.22,1,0.36,1) both}
        .hc-rise1{animation:hc-riseIn 0.5s 0.06s cubic-bezier(0.22,1,0.36,1) both}
        .hc-modal-bg{animation:hc-fadeIn 0.22s ease both}
        .hc-modal-box{animation:hc-popIn 0.42s cubic-bezier(0.22,1,0.36,1) both}
        .hc-stat:hover{transform:translateY(-4px) rotateX(6deg)}
        .hc-item:hover{transform:translateY(-3px);box-shadow:0 14px 26px -14px rgba(10,132,255,0.4)!important}
        .hc-sec-hd:hover{background:linear-gradient(90deg,rgba(255,255,255,0.68),rgba(255,255,255,0.4))!important}
        .hc-done:hover{filter:brightness(1.06)}
        .hc-close:hover{background:#fff!important;color:#10151c!important}
        .hc-input:focus{border-color:var(--hc-accent)!important;box-shadow:0 0 0 3px rgba(10,132,255,0.18)!important}
        .hc-scroll::-webkit-scrollbar{width:8px}
        .hc-scroll::-webkit-scrollbar-thumb{background:rgba(16,21,28,0.18);border-radius:99px}
        .hc-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* Background blobs */}
      <div style={{ position: 'absolute', inset: '-10%', pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="hc-blob1" style={{ position: 'absolute', width: '44vw', height: '44vw', left: '-6vw', top: '-10vw', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(10,132,255,0.5), rgba(10,132,255,0) 70%)', filter: 'blur(42px)' }}></div>
        <div className="hc-blob2" style={{ position: 'absolute', width: '38vw', height: '38vw', right: '-4vw', top: '10vh', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(48,209,188,0.4), rgba(48,209,188,0) 70%)', filter: 'blur(48px)' }}></div>
      </div>

      {/* Header */}
      <div className="hc-header" style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 22px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 0 rgba(16,21,28,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg, #5ac8fa, #0a84ff 55%, #0040dd)', boxShadow: '0 6px 16px rgba(10,132,255,0.38), inset 0 1px 0 rgba(255,255,255,0.6)', overflow: 'hidden' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
              <path d="M4 19.5V6a2 2 0 0 1 2-2h12"></path>
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20V4"></path>
            </svg>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>Help Contents</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--hc-ink2)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>Complete System Documentation &amp; Guides</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#12622f', background: 'rgba(52,199,89,0.16)', border: '1px solid rgba(52,199,89,0.32)' }}>
          <span className="hc-pulse"></span>
          Support available
        </div>
      </div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 4, flex: 1, overflowY: 'hidden', padding: 22, display: 'flex', gap: 16, minHeight: 0 }}>

        {/* Left sidebar */}
        <div className="hc-scroll" style={{ flexShrink: 0, width: 280, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

          {/* Search */}
          <div className="hc-rise0" style={glassCard}>
            <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon k="search" size={14} color="var(--hc-accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>Search help</span>
            </div>
            <div style={{ padding: '8px 14px 14px' }}>
              <input
                ref={inputRef}
                className="hc-input"
                value={query}
                onChange={onSearch}
                placeholder="Search topics…"
                style={{ width: '100%', padding: '10px 13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', fontSize: 13.5, fontFamily: 'inherit', color: '#10151c', outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, perspective: 800 }}>
            <div className="hc-stat" style={{ position: 'relative', overflow: 'hidden', padding: '13px 14px', borderRadius: 16, color: '#fff', background: 'linear-gradient(150deg, #0b2a5b, #0a84ff 90%)', boxShadow: '0 12px 26px -14px rgba(10,132,255,0.6), inset 0 1px 0 rgba(255,255,255,0.3)', transition: 'transform 0.3s ease' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.78 }}>Total topics</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{TOTAL_TOPICS}</div>
            </div>
            <div className="hc-stat" style={{ position: 'relative', overflow: 'hidden', padding: '13px 14px', borderRadius: 16, color: '#fff', background: 'linear-gradient(150deg, #0c4a3a, #30d18f 95%)', boxShadow: '0 12px 26px -14px rgba(48,209,143,0.55), inset 0 1px 0 rgba(255,255,255,0.3)', transition: 'transform 0.3s ease' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.78 }}>Categories</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{SECTIONS.length}</div>
            </div>
          </div>

          {/* Contact */}
          <div style={glassCard}>
            <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon k="phone" size={14} color="var(--hc-accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>Need help?</span>
            </div>
            <div style={{ padding: '4px 12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { icon: 'mail' as IconKey, label: 'Email', value: 'support@paperwhitetech.com', href: 'mailto:support@paperwhitetech.com' },
                { icon: 'phone' as IconKey, label: 'Phone', value: '+91 12345 67890' },
                { icon: 'check' as IconKey, label: 'Support', value: '24/7 available' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.55)' }}>
                  <Icon k={row.icon} size={14} color="var(--hc-accent)" />
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--hc-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{row.label}</div>
                    {'href' in row
                      ? <a href={row.href} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--hc-accent)', textDecoration: 'none' }}>{row.value}</a>
                      : <div style={{ fontSize: 12.5, fontWeight: 600 }}>{row.value}</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="hc-rise1" style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 22, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.44)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 16px 38px -18px rgba(16,21,28,0.26), inset 0 1px 0 rgba(255,255,255,0.85)', minHeight: 0 }}>
          {/* Panel header */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 20px', borderBottom: '1px solid rgba(16,21,28,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--hc-accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M6 4h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
              </svg>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>Documentation</div>
                <div style={{ fontSize: 11, color: 'var(--hc-ink2)', marginTop: 1 }}>Browse help topics by category</div>
              </div>
            </div>
            {q && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--hc-accent)' }}>
                {filtered.reduce((a, s) => a + s.items.length, 0)} topics
              </div>
            )}
          </div>

          {/* Accordion */}
          <div className="hc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length > 0 ? filtered.map(section => (
              <div key={section.id} style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.85)' }}>

                {/* Section header */}
                <div className="hc-sec-hd" onClick={() => toggleSection(section.id)} style={{ boxSizing: 'border-box', minHeight: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.28))', transition: 'background 0.18s' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(16,21,28,0.52)" strokeWidth="2.4" strokeLinecap="round" width="12" height="12" style={{ flexShrink: 0, transform: `rotate(${chevronDeg(section.id)}deg)`, transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)' }}>
                    <path d="M9 6l6 6-6 6"></path>
                  </svg>
                  <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 9, display: 'grid', placeItems: 'center', background: section.grad, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                    <Icon k={section.icon} size={12} color="#fff" />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em', flex: 1 }}>{section.title}</span>
                  <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(16,21,28,0.08)', color: 'var(--hc-ink2)', whiteSpace: 'nowrap' }}>{section.items.length}</span>
                </div>

                {/* Items */}
                {isOpen(section.id) && (
                  <div style={{ flexShrink: 0, padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.items.map((item) => {
                      const origSection = SECTIONS.find(s => s.id === section.id)!;
                      const origIdx = origSection.items.indexOf(item);
                      return (
                      <div key={origIdx} className="hc-item" onClick={() => openItem(section.id, origIdx)} style={{ flexShrink: 0, boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 13, background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(255,255,255,0.9)', transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease' }}>
                        <div style={{ marginTop: 1, flexShrink: 0 }}>
                          <Icon k={item.icon} size={14} color="var(--hc-accent)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,21,28,0.52)" strokeWidth="2.6" strokeLinecap="round"><path d="M9 6l6 6-6 6"></path></svg>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--hc-ink2)', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--hc-ink2)', opacity: 0.7 }}>
                <Icon k="search" size={46} color="currentColor" />
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>No results found</div>
                <div style={{ fontSize: 12, marginTop: 3 }}>Try a different search term</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="hc-footer" style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 20px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderTop: '1px solid rgba(255,255,255,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34c759', display: 'inline-block' }}></span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>Documentation: Up to date</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>Online help available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--hc-ink2)' }}>Help v2.0.0</span>
          <span style={{ width: 1, height: 10, background: 'rgba(16,21,28,0.12)', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.6)' }}>{today}</span>
        </div>
      </div>

      {/* Modal */}
      {modal && modalItem && modalSection && (
        <div className="hc-modal-bg" onClick={closeModal} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 32, background: 'rgba(16,21,28,0.26)', backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }}>
          <div className="hc-modal-box" onClick={e => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 440, borderRadius: 26, padding: '26px 26px 22px', background: 'rgba(255,255,255,0.76)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 40px 80px -30px rgba(16,21,28,0.55), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
            <div style={{ position: 'absolute', top: '-40%', left: '-20%', width: '70%', height: '120%', background: 'radial-gradient(closest-side, rgba(10,132,255,0.22), transparent)', pointerEvents: 'none' }}></div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: modalSection.grad, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                  <Icon k={modalItem.icon} size={20} color="#fff" spinning />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hc-ink2)' }}>{modalSection.title}</div>
                  <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>{modalItem.title}</div>
                </div>
              </div>
              <button className="hc-close" onClick={closeModal} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--hc-ink2)', fontFamily: 'inherit', transition: 'background 0.18s, color 0.18s' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
              </button>
            </div>

            <div style={{ position: 'relative', fontSize: 14, lineHeight: 1.55, color: 'rgba(16,21,28,0.7)', marginTop: 14 }}>{modalItem.body}</div>

            <button className="hc-done" onClick={closeModal} style={{ position: 'relative', width: '100%', marginTop: 18, padding: 13, borderRadius: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#fff', background: 'linear-gradient(150deg, #5ac8fa, #0a84ff 60%, #0060df)', boxShadow: '0 12px 26px -12px rgba(10,132,255,0.8), inset 0 1px 0 rgba(255,255,255,0.5)', transition: 'filter 0.18s' }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contents;
