import React, { useState, useCallback, useMemo } from 'react';
import {
  BookOpen, Rocket, Settings, CheckCircle2, Zap, Users, Search, IndianRupee, FileText, Database,
  TrendingUp, Calculator, AlertCircle, Mail, HelpCircle, Phone, ChevronRight, LifeBuoy,
} from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';

// ── data ─────────────────────────────────────────────────────────────────────
type IconComp = React.ComponentType<{ size?: number }>;

interface HelpItem {
  title: string;
  description: string;
  icon: IconComp;
  body: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: IconComp;
  items: HelpItem[];
}

const SECTIONS: HelpSection[] = [
  {
    id: '1', title: 'Getting Started', icon: Rocket,
    items: [
      { title: 'Introduction', description: 'Overview of Fibe Loan Management and its core features', icon: CheckCircle2, body: 'A tour of the ledger, member and voucher modules and how they connect in daily operation.' },
      { title: 'System Requirements', description: 'Hardware and software requirements for optimal performance', icon: Settings, body: 'Windows 10/11, 8GB RAM minimum, 2GB free disk, and a stable network link to the branch server.' },
      { title: 'Installation Guide', description: 'Step-by-step instructions for installing and configuring the system', icon: CheckCircle2, body: 'Run the signed installer, point it at your database, then complete the first-run setup wizard.' },
      { title: 'First Login', description: 'How to access the system and navigate the main dashboard', icon: Zap, body: 'Sign in with the credentials issued by your administrator; the dashboard opens to today\'s activity.' },
    ],
  },
  {
    id: '2', title: 'Member Management', icon: Users,
    items: [
      { title: 'Adding New Members', description: 'Create member profiles with personal and financial details', icon: Users, body: 'Capture KYC, nominee and share details in one guided form; duplicates are flagged automatically.' },
      { title: 'Member Search', description: 'Find members by number, name, or other criteria', icon: Search, body: 'Search by member number, name, phone or account — results update as you type.' },
      { title: 'Member Balance', description: 'View comprehensive balance information for any member', icon: IndianRupee, body: 'See every savings, loan and deposit balance for a member on one consolidated screen.' },
      { title: 'Member Statements', description: 'Generate detailed transaction statements for members', icon: FileText, body: 'Export a dated statement of any account as PDF or Excel for the member\'s records.' },
    ],
  },
  {
    id: '3', title: 'Transactions & Vouchers', icon: FileText,
    items: [
      { title: 'Creating Vouchers', description: 'Process deposits, withdrawals, and loan transactions', icon: FileText, body: 'Every voucher is double-entry and posts instantly to the relevant ledgers.' },
      { title: 'Transaction Types', description: 'Understanding different transaction categories and codes', icon: Database, body: 'Standard codes cover deposits, withdrawals, disbursements, repayments and adjustments.' },
      { title: 'Voucher Verification', description: 'Review and approve pending transactions', icon: CheckCircle2, body: 'A second approver reviews queued vouchers before they post — full audit trail kept.' },
      { title: 'Transaction History', description: 'View and search historical transaction records', icon: TrendingUp, body: 'Filter historical postings by date, member, branch or voucher type.' },
    ],
  },
  {
    id: '4', title: 'Reports & Analytics', icon: TrendingUp,
    items: [
      { title: 'EMI Charts', description: 'View loan EMI schedules and payment tracking', icon: Calculator, body: 'Amortization schedules recompute automatically after part-payments or rate changes.' },
      { title: 'Interest Statements', description: 'Generate interest receivable and received reports', icon: IndianRupee, body: 'Compare interest receivable against interest actually received, by period or branch.' },
      { title: 'Premature Information', description: 'Calculate premature withdrawal amounts for FD/RD/SB', icon: AlertCircle, body: 'Instantly quote the payable amount for an early closure, penalty included.' },
      { title: 'Custom Reports', description: 'Create filtered reports based on date ranges and criteria', icon: FileText, body: 'Build ad-hoc reports with your own filters and save them as templates.' },
    ],
  },
  {
    id: '5', title: 'Utilities & Tools', icon: Settings,
    items: [
      { title: 'Calculator', description: 'Calculate loan EMI, interest rates, and maturity amounts', icon: Calculator, body: 'A built-in calculator for EMI, maturity value and effective interest rate.' },
      { title: 'Database Backup', description: 'Create and restore database backups for data safety', icon: Database, body: 'Schedule automatic backups and restore from any saved snapshot in a few clicks.' },
      { title: 'Communication Hub', description: 'Send SMS, WhatsApp, and email notifications to members', icon: Mail, body: 'Send due reminders and statements via SMS, WhatsApp or email in bulk or one-off.' },
      { title: 'Update Saving Interest', description: 'Process and update interest for savings accounts', icon: IndianRupee, body: 'Run the periodic interest update across all savings accounts in one batch job.' },
    ],
  },
  {
    id: '6', title: 'Troubleshooting', icon: AlertCircle,
    items: [
      { title: 'Common Issues', description: 'Solutions to frequently encountered problems', icon: HelpCircle, body: 'The most frequent setup and login issues, with quick fixes for each.' },
      { title: 'Error Messages', description: 'Understanding and resolving system error messages', icon: AlertCircle, body: 'A reference of error codes and what each one means for your data or connection.' },
      { title: 'Performance Tips', description: 'Optimize system performance and speed', icon: Zap, body: 'Keep the database indexed and archive old vouchers periodically for best speed.' },
      { title: 'Contact Support', description: 'Get help from our technical support team', icon: Phone, body: 'Reach the support desk at +91 7692829866 or thekovain@gmail.com, 24/7.' },
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

  const q = query.toLowerCase();

  const filtered = useMemo(() =>
    SECTIONS.map(s => ({
      ...s,
      items: q ? s.items.filter(it => it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)) : s.items,
    })).filter(s => s.items.length > 0),
    [q]
  );

  const toggleSection = useCallback((id: string) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const modalSection = modal ? SECTIONS.find(s => s.id === modal.sectionId) : null;
  const modalItem = modalSection && modal ? modalSection.items[modal.index] : null;

  const today = new Date().toLocaleDateString();

  // When searching, all sections expand automatically
  const isOpen = (id: string) => q ? true : !!openIds[id];

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Help Contents</h1>
          <p className="aw-desc">Complete System Documentation &amp; Guides</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><span className="aw-status-dot" /> Support available</span>
        </div>
      </div>

      <div className="aw-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
          {/* Left column */}
          <div className="aw-stack">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">Search help</h2>
              </div>
              <input aria-label="Search help topics" className="aw-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics…" />
            </section>

            <div className="aw-two">
              <div className="aw-stat">
                <div className="aw-stat-label">Total topics</div>
                <div className="aw-stat-value">{TOTAL_TOPICS}</div>
              </div>
              <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
                <div className="aw-stat-label">Categories</div>
                <div className="aw-stat-value">{SECTIONS.length}</div>
              </div>
            </div>

            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><LifeBuoy size={14} /></span>
                <h2 className="aw-card-title">Need help?</h2>
              </div>
              <div className="aw-rows">
                <div className="aw-row"><span className="aw-meta"><Mail size={12} /> Email</span><a href="mailto:thekovain@gmail.com" style={{ fontWeight: 700, color: 'var(--aw-accent)' }}>thekovain@gmail.com</a></div>
                <div className="aw-row"><span className="aw-meta"><Phone size={12} /> Phone</span><strong>+91 7692829866</strong></div>
                <div className="aw-row"><span className="aw-meta"><CheckCircle2 size={12} /> Support</span><strong>24/7 available</strong></div>
              </div>
            </section>
          </div>

          {/* Main content */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><BookOpen size={14} /></span>
              <div>
                <h2 className="aw-card-title">Documentation</h2>
                <p className="aw-meta">Browse help topics by category</p>
              </div>
              {q && <span className="aw-pill tone-info" style={{ marginLeft: 'auto' }}>{filtered.reduce((a, s) => a + s.items.length, 0)} topics</span>}
            </div>

            {filtered.length > 0 ? filtered.map(section => {
              const SecIcon = section.icon;
              const open = isOpen(section.id);
              return (
                <div key={section.id} className="aw-panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <button type="button" onClick={() => toggleSection(section.id)} aria-expanded={open}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                    <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .26s cubic-bezier(.32,.72,0,1)' }} />
                    <span className="aw-card-icon"><SecIcon size={13} /></span>
                    <strong style={{ flex: 1 }}>{section.title}</strong>
                    <span className="aw-pill">{section.items.length}</span>
                  </button>
                  {open && (
                    <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {section.items.map(item => {
                        const origSection = SECTIONS.find(s => s.id === section.id)!;
                        const origIdx = origSection.items.indexOf(origSection.items.find(i => i.title === item.title)!);
                        const ItemIcon = item.icon;
                        return (
                          <button key={item.title} type="button" onClick={() => setModal({ sectionId: section.id, index: origIdx })}
                            className="aw-panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                            <span style={{ color: 'var(--aw-accent)', marginTop: 2 }}><ItemIcon size={14} /></span>
                            <span style={{ flex: 1 }}>
                              <strong>{item.title}</strong>
                              <span className="aw-meta" style={{ display: 'block', marginTop: 2 }}>{item.description}</span>
                            </span>
                            <ChevronRight size={12} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="aw-empty" style={{ padding: 40 }}>
                <Search size={36} />
                <p className="aw-strong">No results found</p>
                <span className="aw-meta">Try a different search term</span>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span><span className="aw-status-dot" /> Documentation: Up to date · Online help available</span>
        <span>Help v2.0.0 · {today}</span>
      </div>

      <AwDialog open={!!(modal && modalItem && modalSection)} title={modalItem?.title ?? ''} onClose={closeModal} icon={modalItem ? <modalItem.icon size={14} /> : undefined} maxWidth="28rem" compact>
        {modalItem && modalSection && (
          <div className="aw-stack">
            <span className="aw-label">{modalSection.title}</span>
            <p>{modalItem.body}</p>
            <button type="button" onClick={closeModal} className="aw-btn aw-btn-primary">Got it</button>
          </div>
        )}
      </AwDialog>
    </div>
  );
};

export default Contents;
