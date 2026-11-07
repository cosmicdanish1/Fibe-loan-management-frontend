import React, { useState, useCallback, useMemo } from 'react';
import {
  BookOpen, Rocket, Settings, CheckCircle2, Zap, Users, Search, IndianRupee, FileText, Database,
  TrendingUp, Calculator, AlertCircle, Mail, HelpCircle, Phone, ChevronRight, LifeBuoy,
} from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../../../i18n';

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
    id: '1', title: tLabel('Getting Started'), icon: Rocket,
    items: [
      { title: tLabel('Introduction'), description: tLabel('Overview of Fibe Loan Management and its core features'), icon: CheckCircle2, body: 'A tour of the ledger, member and voucher modules and how they connect in daily operation.' },
      { title: tLabel('System Requirements'), description: tLabel('Hardware and software requirements for optimal performance'), icon: Settings, body: 'Windows 10/11, 8GB RAM minimum, 2GB free disk, and a stable network link to the branch server.' },
      { title: tLabel('Installation Guide'), description: tLabel('Step-by-step instructions for installing and configuring the system'), icon: CheckCircle2, body: 'Run the signed installer, point it at your database, then complete the first-run setup wizard.' },
      { title: tLabel('First Login'), description: tLabel('How to access the system and navigate the main dashboard'), icon: Zap, body: 'Sign in with the credentials issued by your administrator; the dashboard opens to today\'s activity.' },
    ],
  },
  {
    id: '2', title: tLabel('Member Management'), icon: Users,
    items: [
      { title: tLabel('Adding New Members'), description: tLabel('Create member profiles with personal and financial details'), icon: Users, body: 'Capture KYC, nominee and share details in one guided form; duplicates are flagged automatically.' },
      { title: tLabel('Member Search'), description: tLabel('Find members by number, name, or other criteria'), icon: Search, body: 'Search by member number, name, phone or account — results update as you type.' },
      { title: tLabel('Member Balance'), description: tLabel('View comprehensive balance information for any member'), icon: IndianRupee, body: 'See every savings, loan and deposit balance for a member on one consolidated screen.' },
      { title: tLabel('Member Statements'), description: tLabel('Generate detailed transaction statements for members'), icon: FileText, body: 'Export a dated statement of any account as PDF or Excel for the member\'s records.' },
    ],
  },
  {
    id: '3', title: tLabel('Transactions & Vouchers'), icon: FileText,
    items: [
      { title: tLabel('Creating Vouchers'), description: tLabel('Process deposits, withdrawals, and loan transactions'), icon: FileText, body: 'Every voucher is double-entry and posts instantly to the relevant ledgers.' },
      { title: tLabel('Transaction Types'), description: tLabel('Understanding different transaction categories and codes'), icon: Database, body: 'Standard codes cover deposits, withdrawals, disbursements, repayments and adjustments.' },
      { title: tLabel('Voucher Verification'), description: tLabel('Review and approve pending transactions'), icon: CheckCircle2, body: 'A second approver reviews queued vouchers before they post — full audit trail kept.' },
      { title: tLabel('Transaction History'), description: tLabel('View and search historical transaction records'), icon: TrendingUp, body: 'Filter historical postings by date, member, branch or voucher type.' },
    ],
  },
  {
    id: '4', title: tLabel('Reports & Analytics'), icon: TrendingUp,
    items: [
      { title: tLabel('EMI Charts'), description: tLabel('View loan EMI schedules and payment tracking'), icon: Calculator, body: 'Amortization schedules recompute automatically after part-payments or rate changes.' },
      { title: tLabel('Interest Statements'), description: tLabel('Generate interest receivable and received reports'), icon: IndianRupee, body: 'Compare interest receivable against interest actually received, by period or branch.' },
      { title: tLabel('Premature Information'), description: tLabel('Calculate premature withdrawal amounts for FD/RD/SB'), icon: AlertCircle, body: 'Instantly quote the payable amount for an early closure, penalty included.' },
      { title: tLabel('Custom Reports'), description: tLabel('Create filtered reports based on date ranges and criteria'), icon: FileText, body: 'Build ad-hoc reports with your own filters and save them as templates.' },
    ],
  },
  {
    id: '5', title: tLabel('Utilities & Tools'), icon: Settings,
    items: [
      { title: tLabel('Calculator'), description: tLabel('Calculate loan EMI, interest rates, and maturity amounts'), icon: Calculator, body: 'A built-in calculator for EMI, maturity value and effective interest rate.' },
      { title: tLabel('Database Backup'), description: tLabel('Create and restore database backups for data safety'), icon: Database, body: 'Schedule automatic backups and restore from any saved snapshot in a few clicks.' },
      { title: tLabel('Communication Hub'), description: tLabel('Send SMS, WhatsApp, and email notifications to members'), icon: Mail, body: 'Send due reminders and statements via SMS, WhatsApp or email in bulk or one-off.' },
      { title: tLabel('Update Saving Interest'), description: tLabel('Process and update interest for savings accounts'), icon: IndianRupee, body: 'Run the periodic interest update across all savings accounts in one batch job.' },
    ],
  },
  {
    id: '6', title: tLabel('Troubleshooting'), icon: AlertCircle,
    items: [
      { title: tLabel('Common Issues'), description: tLabel('Solutions to frequently encountered problems'), icon: HelpCircle, body: 'The most frequent setup and login issues, with quick fixes for each.' },
      { title: tLabel('Error Messages'), description: tLabel('Understanding and resolving system error messages'), icon: AlertCircle, body: 'A reference of error codes and what each one means for your data or connection.' },
      { title: tLabel('Performance Tips'), description: tLabel('Optimize system performance and speed'), icon: Zap, body: 'Keep the database indexed and archive old vouchers periodically for best speed.' },
      { title: tLabel('Contact Support'), description: tLabel('Get help from our technical support team'), icon: Phone, body: 'Reach the support desk at +91 7692829866 or thekovain@gmail.com, 24/7.' },
    ],
  },
];

const TOTAL_TOPICS = SECTIONS.reduce((a, s) => a + s.items.length, 0);

// ── component ─────────────────────────────────────────────────────────────────
interface ModalState { sectionId: string; index: number }

const Contents: React.FC = () => {
  const { t } = useTranslation();
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
          <h1 className="aw-title">{t('Help Contents')}</h1>
          <p className="aw-desc">{t('Complete System Documentation & Guides')}</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><span className="aw-status-dot" /> {t('Support available')}</span>
        </div>
      </div>

      <div className="aw-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
          {/* Left column */}
          <div className="aw-stack">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">{t('Search help')}</h2>
              </div>
              <input aria-label={t('Search help topics')} className="aw-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search topics…')} />
            </section>

            <div className="aw-two">
              <div className="aw-stat">
                <div className="aw-stat-label">{t('Total topics')}</div>
                <div className="aw-stat-value">{TOTAL_TOPICS}</div>
              </div>
              <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
                <div className="aw-stat-label">{t('Categories')}</div>
                <div className="aw-stat-value">{SECTIONS.length}</div>
              </div>
            </div>

            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><LifeBuoy size={14} /></span>
                <h2 className="aw-card-title">{t('Need help?')}</h2>
              </div>
              <div className="aw-rows">
                <div className="aw-row"><span className="aw-meta"><Mail size={12} /> {t('Email')}</span><a href="mailto:thekovain@gmail.com" style={{ fontWeight: 700, color: 'var(--aw-accent)' }}>thekovain@gmail.com</a></div>
                <div className="aw-row"><span className="aw-meta"><Phone size={12} /> {t('Phone')}</span><strong>+91 7692829866</strong></div>
                <div className="aw-row"><span className="aw-meta"><CheckCircle2 size={12} /> {t('Support')}</span><strong>{t('24/7 available')}</strong></div>
              </div>
            </section>
          </div>

          {/* Main content */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><BookOpen size={14} /></span>
              <div>
                <h2 className="aw-card-title">{t('Documentation')}</h2>
                <p className="aw-meta">{t('Browse help topics by category')}</p>
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
                <p className="aw-strong">{t('No results found')}</p>
                <span className="aw-meta">{t('Try a different search term')}</span>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span><span className="aw-status-dot" /> {t('Documentation: Up to date · Online help available')}</span>
        <span>{t('Help v2.0.0 ·')} {today}</span>
      </div>

      <AwDialog open={!!(modal && modalItem && modalSection)} title={modalItem?.title ?? ''} onClose={closeModal} icon={modalItem ? <modalItem.icon size={14} /> : undefined} maxWidth="28rem" compact>
        {modalItem && modalSection && (
          <div className="aw-stack">
            <span className="aw-label">{modalSection.title}</span>
            <p>{modalItem.body}</p>
            <button type="button" onClick={closeModal} className="aw-btn aw-btn-primary">{t('Got it')}</button>
          </div>
        )}
      </AwDialog>
    </div>
  );
};

export default Contents;
