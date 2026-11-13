import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const FloatingChatBot = lazy(() => import('../../components/chat/FloatingChatBot'));
import {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database,
  FileDown, Zap, Calendar, Plus, Command, LayoutGrid,
  EyeOff,
  BookMarked, Building2, FilePen, Scale, Tag, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare,
  Award, Medal, FlagOff, SlidersHorizontal, Check, type LucideIcon,
} from 'lucide-react';
import './dashboard.css';
import { CountUp } from './DashCharts';
import {
  ALL_QUICK_ACTION_DEFS, DEFAULT_ENABLED_QA_IDS,
  QA_STORAGE_KEY, QA_BROADCAST_CHANNEL,
} from '../../config/quickActions.config';
import {
  ActiveMembersWidget, SanctionedLoansWidget,
  MonthEndOutstandingWidget, MemberBalanceDistributionWidget,
} from './AnalyticsWidgets';
import NoticeBoardCard from './NoticeBoardCard';
import BentoGrid from './BentoGrid';
import { loadArtConfig, saveArtConfig, resolveArt, resolvePicture, type ArtConfig } from './dashboardArt';
import { loadLayout, saveLayout, clearLayout, DEFAULT_ROWS, DEFAULT_WIDGET_CONFIG, CARD_IDS, CARD_LABELS, type RowLayout, type WidgetConfig, type WidgetKey } from './dashboardLayout';
import {
  useDashboardSummary, PendingVouchersWidget, CashPositionWidget, DayEndStatusWidget, DemandRecoveryWidget,
  DepositsSummaryWidget, UpcomingMaturitiesWidget, LoanApplicationsWidget, OverdueLoansWidget,
  RetiringMembersWidget, NewMembersWidget,
} from './SummaryWidgets';
import {
  WaitingApprovalWidget, TodayCashFlowWidget, RdDuesWidget, TopDefaultersWidget, DisbursedThisMonthWidget, LastBackupWidget,
} from './MoreWidgets';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../i18n';


// ─── Constants ───────────────────────────────────────────────────────────────

const WIDGET_CONFIG_KEY = 'lms-dashboard-widgets';
const BANNER_OPACITY_KEY = 'lms-fy-banner-opacity';

const loadWidgetConfig = (): WidgetConfig => {
  try { return { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(localStorage.getItem(WIDGET_CONFIG_KEY) || '{}') }; }
  catch { return DEFAULT_WIDGET_CONFIG; }
};

const loadBannerOpacity = (): number => {
  const v = parseInt(localStorage.getItem(BANNER_OPACITY_KEY) || '78', 10);
  return isNaN(v) ? 78 : Math.min(100, Math.max(0, v));
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const openWindow = (route: string, method = 'openNewWindow') => {
  if ((window as any).electronAPI?.[method]) {
    (window as any).electronAPI[method](route);
  }
};

const getFYInfo = () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const fyStartYear = m >= 3 ? y : y - 1;
  const fyEndYear = fyStartYear + 1;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyEndYear, 2, 31);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  const elapsed = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000));
  const remaining = Math.max(0, totalDays - elapsed);
  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
  return {
    label: `FY ${fyStartYear}–${String(fyEndYear).slice(2)}`,
    startDate: dayjs(start).format('D MMM YYYY'),
    endDate: dayjs(end).format('D MMM YYYY'),
    remaining,
    progress,
  };
};

const getCurrentUserName = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.name || u?.fullName || u?.username || 'Admin';
  } catch { return 'Admin'; }
};

// ─── Quick Actions — icon map ─────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database, FileDown, Zap,
  BookMarked, Building2, FilePen, Scale, Tag, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare, Award, Medal, FlagOff,
};

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

const SHORTCUTS = [
  { label: tLabel('New Member'),    keys: ['Ctrl', 'N'] },
  { label: tLabel('Save record'),   keys: ['Ctrl', 'S'] },
  { label: tLabel('Find / Search'), keys: ['Ctrl', 'F'] },
  { label: tLabel('Delete record'), keys: ['Ctrl', 'D'] },
  { label: tLabel('Refresh data'),  keys: ['F5'] },
  { label: tLabel('Print'),         keys: ['Ctrl', 'P'] },
  { label: tLabel('Dashboard'),     keys: ['Alt', 'H'] },
  { label: tLabel('Exit form'),     keys: ['Esc'] },
];

const kbdStyle: React.CSSProperties = {
  border: '1px solid var(--aw-border-strong)', background: 'var(--aw-surface-muted)', borderRadius: 5,
  padding: '2px 7px', fontSize: 'calc(var(--type-body-size) - 2px)', fontWeight: 700, lineHeight: 1.2, color: 'var(--aw-text)',
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const fy = useMemo(() => getFYInfo(), []);

  // Optional custom background chosen in Settings (light mode only). Left empty
  // when the user has never picked one so the window uses the theme background.
  const isDark = useSelector((s: RootState) => s.theme.interfaceMode) === 'dark';
  const [customBg, setCustomBg] = useState(() => localStorage.getItem('lms-dashboard-bg') || '');

  // Widget visibility & banner opacity — synced from Settings via BroadcastChannel
  const [widgets, setWidgets] = useState<WidgetConfig>(loadWidgetConfig);
  const [bannerOpacity, setBannerOpacity] = useState<number>(loadBannerOpacity);
  // Optional picture behind the top of the dashboard (Settings → Dashboard → Dashboard Art).
  const [artConfig, setArtConfig] = useState<ArtConfig>(loadArtConfig);
  const art = resolveArt(artConfig, isDark);
  // The same picture can also sit inside individual cards, switched on card by card in Customize mode.
  const cardArt = resolvePicture(artConfig, isDark);
  const artCards = useMemo(() => new Set(artConfig.cards), [artConfig.cards]);
  const toggleCardArt = useCallback((id: string) => {
    // Start from what is saved, so a change made in Settings meanwhile is not lost.
    const saved = loadArtConfig();
    const next = { ...saved, cards: saved.cards.includes(id) ? saved.cards.filter(c => c !== id) : [...saved.cards, id] };
    saveArtConfig(next);
    setArtConfig(next);
  }, []);

  // Quick Actions config — synced from Settings via BroadcastChannel
  const [enabledQaIds, setEnabledQaIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(QA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ENABLED_QA_IDS;
    } catch { return DEFAULT_ENABLED_QA_IDS; }
  });

  useEffect(() => {
    const bgCh = new BroadcastChannel('lms_dashboard_bg');
    bgCh.onmessage = (e) => { if (e.data?.dashboardBg) setCustomBg(e.data.dashboardBg); };

    const cfgCh = new BroadcastChannel('lms_dashboard_config');
    cfgCh.onmessage = (e) => {
      if (e.data?.widgets)      setWidgets({ ...DEFAULT_WIDGET_CONFIG, ...e.data.widgets });
      if (e.data?.resetLayout)  resetLayoutRef.current();
      if (e.data?.bannerOpacity !== undefined) setBannerOpacity(e.data.bannerOpacity);
      if (e.data?.art) setArtConfig(e.data.art);
    };

    const qaCh = new BroadcastChannel(QA_BROADCAST_CHANNEL);
    qaCh.onmessage = (e) => { if (Array.isArray(e.data?.enabledIds)) setEnabledQaIds(e.data.enabledIds); };

    return () => { bgCh.close(); cfgCh.close(); qaCh.close(); };
  }, []);

  // Settings → Dashboard Layout sends a message that resets the arrangement.
  const resetLayoutRef = useRef<() => void>(() => {});

  const visibleActions = useMemo(() =>
    enabledQaIds
      .map(id => ALL_QUICK_ACTION_DEFS.find(d => d.id === id))
      .filter((d): d is typeof ALL_QUICK_ACTION_DEFS[number] => d !== undefined),
    [enabledQaIds]
  );

  // Customize mode: cards can be moved and resized only while this is on. In normal use the
  // dashboard has no drag handles at all, so nothing unexpected appears under the pointer.
  const [editing, setEditing] = useState(false);

  // Ctrl+N → New Member; Esc leaves Customize mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openWindow('/masters/member'); }
      if (e.key === 'Escape') setEditing(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);


  const anyVisible = Object.values(widgets).some(Boolean);

  // The banner keeps its Settings-controlled strength: the accent tint scales with the opacity slider.
  const bannerTint = Math.round(4 + (bannerOpacity / 100) * 26);

  // Bento layout: rows of cards. Drag a card by its grip to move it, drag the edge between two
  // cards to resize them (the neighbour gives way so the row keeps filling the window), and drag
  // a row's bottom edge to change its height. Saved on this PC.
  const [rows, setRows] = useState<RowLayout[]>(loadLayout);
  const handleLayout = useCallback((next: RowLayout[], commit: boolean) => {
    setRows(next);
    if (commit) saveLayout(next);
  }, []);
  const resetLayout = useCallback(() => { clearLayout(); setRows(DEFAULT_ROWS()); }, []);
  resetLayoutRef.current = resetLayout;
  const hidden = useMemo(
    () => new Set<string>(Object.entries(widgets).filter(([, on]) => !on).map(([id]) => id)),
    [widgets]
  );

  // Customize mode can switch a card off (×) or back on (the "Add" list). Same saved setting as the
  // switches in Settings → Dashboard, so both places always agree.
  const setWidgetOn = useCallback((id: WidgetKey, on: boolean) => {
    setWidgets(prev => {
      const next = { ...prev, [id]: on };
      try { localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const hiddenIds = CARD_IDS.filter(id => !widgets[id]);

  const summaryState = useDashboardSummary();

  const userName = useMemo(() => getCurrentUserName(), []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('Good morning') : hour < 17 ? t('Good afternoon') : t('Good evening');

  const cards: Record<string, React.ReactNode> = {
    fyBanner: (
            <section className="aw-card dash-fy" style={{
              background: `radial-gradient(90% 140% at 100% 0%, color-mix(in srgb, var(--aw-accent) ${Math.round(bannerTint * 0.9)}%, transparent), transparent 62%), color-mix(in srgb, var(--aw-accent) ${bannerTint}%, var(--aw-surface))`,
            }}>
              <div className="dash-fy-head">
                <div className="aw-inline" style={{ alignItems: 'center', gap: 12 }}>
                  <span className="aw-card-icon" style={{ width: 38, height: 38 }}><Calendar size={18} /></span>
                  <div>
                    <p className="aw-label" style={{ margin: 0 }}>{t('Current Financial Year')}</p>
                    <p className="dash-fy-year">{fy.label}</p>
                  </div>
                </div>
                <div className="dash-fy-days">
                  <strong><CountUp value={fy.remaining} /></strong>
                  <span className="aw-label" style={{ margin: 0 }}>{t('days left')}</span>
                </div>
              </div>
              <div>
                <div className="aw-inline" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="aw-label" style={{ margin: 0 }}>{t('Progress')}</span>
                  <strong className="dash-num">{fy.progress}%</strong>
                </div>
                <div className="dash-fy-track" role="progressbar" aria-valuenow={fy.progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('Financial year progress')}>
                  <span className="dash-fy-fill" style={{ width: `${fy.progress}%` }} />
                </div>
                <div className="dash-fy-ends">
                  <span className="aw-meta">{t('Started')} <strong style={{ color: 'var(--aw-text)' }}>{fy.startDate}</strong></span>
                  <span className="aw-meta">{t('Ends')} <strong style={{ color: 'var(--aw-text)' }}>{fy.endDate}</strong></span>
                </div>
              </div>
            </section>
    ),
    quickActions: (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><LayoutGrid size={14} /></span>
                <h2 className="aw-card-title">{t('Quick Actions')}</h2>
                <span className="aw-meta">— one click to open</span>
                {visibleActions.length > 0 && <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} configured', { 1: visibleActions.length })}</span>}
              </div>
              {visibleActions.length === 0 ? (
                <div className="aw-empty" style={{ padding: 24 }}>
                  <LayoutGrid size={26} />
                  <p className="aw-strong">{t('No quick actions configured')}</p>
                  <span className="aw-meta">{t('Go to Settings → Dashboard to add some')}</span>
                </div>
              ) : (
                <div className="dash-qa-grid">
                  {visibleActions.map((qa, i) => {
                    const IconComp = ICON_MAP[qa.iconName] ?? Zap;
                    return (
                      <button key={qa.id} type="button" onClick={() => openWindow(qa.route)} className="dash-qa" style={{ ['--i' as any]: Math.min(i, 12) }}>
                        <span className="aw-card-icon"><IconComp size={17} /></span>
                        <span className="dash-qa-label">{tLabel(qa.label)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
    ),
    noticeBoard: <NoticeBoardCard />,
    shortcuts: (
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><Command size={14} /></span>
                    <h2 className="aw-card-title">{t('Keyboard Shortcuts')}</h2>
                  </div>
                  <div className="aw-rows">
                    {SHORTCUTS.map(s => (
                      <div key={s.label} className="aw-row" style={{ alignItems: 'center' }}>
                        <span>{s.label}</span>
                        <span className="aw-inline" style={{ alignItems: 'center', gap: 4 }}>
                          {s.keys.map((k, i) => (
                            <React.Fragment key={k}>
                              {i > 0 && <span className="aw-meta">+</span>}
                              <kbd style={kbdStyle}>{k}</kbd>
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="aw-meta" style={{ textTransform: 'uppercase' }}>{t('Ctrl+N is wired · other shortcuts active in open forms')}</p>
                </section>
    ),
    activeMembers: <ActiveMembersWidget />,
    sanctionedLoans: <SanctionedLoansWidget />,
    monthEndOutstanding: <MonthEndOutstandingWidget />,
    balanceDistribution: <MemberBalanceDistributionWidget />,
    pendingVouchers: <PendingVouchersWidget onOpen={route => openWindow(route)} />,
    cashPosition: <CashPositionWidget />,
    dayEndStatus: <DayEndStatusWidget onOpen={route => openWindow(route)} />,
    demandRecovery: <DemandRecoveryWidget state={summaryState} />,
    depositsSummary: <DepositsSummaryWidget state={summaryState} />,
    upcomingMaturities: <UpcomingMaturitiesWidget state={summaryState} />,
    loanApplications: <LoanApplicationsWidget state={summaryState} onOpen={route => openWindow(route)} />,
    overdueLoans: <OverdueLoansWidget />,
    retiringMembers: <RetiringMembersWidget state={summaryState} />,
    newMembers: <NewMembersWidget state={summaryState} />,
    waitingApproval: <WaitingApprovalWidget state={summaryState} onOpen={route => openWindow(route)} />,
    todayCashFlow: <TodayCashFlowWidget onOpen={route => openWindow(route)} />,
    rdDues: <RdDuesWidget state={summaryState} onOpen={route => openWindow(route)} />,
    topDefaulters: <TopDefaultersWidget onOpen={route => openWindow(route)} />,
    disbursedThisMonth: <DisbursedThisMonthWidget onOpen={route => openWindow(route)} />,
    lastBackup: <LastBackupWidget onOpen={route => openWindow(route)} />,
  };

  return (
    <div className="app-window dash" style={{ flex: '1 1 auto', height: 'auto', minHeight: 0, ...(customBg && !isDark ? { background: customBg } : {}) }}>
      <div className={`aw-content${art ? " has-art" : ""}`}>
        {art && <div className="dash-art" aria-hidden style={{ backgroundImage: `url("${art}")` }} />}
        <div className="aw-stack">

          <header className="dash-top">
            <div>
              <h1 className="dash-hello">{greeting}, <span>{userName}</span></h1>
              <p className="aw-meta" style={{ margin: '3px 0 0' }}>{dayjs().format('dddd, D MMMM YYYY')} · {fy.label}</p>
            </div>
            <div className="dash-top-actions">
              {editing && (
                <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={resetLayout}>
                  <RotateCcw size={12} /> {t('Reset layout')}
                </button>
              )}
              <button type="button" className={`aw-btn aw-btn-sm ${editing ? 'aw-btn-primary' : 'aw-btn-secondary'}`} onClick={() => setEditing(v => !v)} aria-pressed={editing}>
                {editing ? <><Check size={12} /> {t('Done')}</> : <><SlidersHorizontal size={12} /> {t('Customize')}</>}
              </button>
            </div>
          </header>

          {editing && (
            <div className="aw-panel aw-panel-accent aw-fade-in dash-edit-bar">
              <SlidersHorizontal size={14} style={{ flex: 'none', color: 'var(--aw-accent)' }} />
              <span className="aw-strong">{t('Arrange your dashboard')}</span>
              <span className="aw-meta">{t('Drag a card to move it · drag the line between two cards to resize them · × removes a card · the picture button shows art inside a card · Esc when done')}</span>
              <div className="dash-add">
                <span className="aw-label" style={{ margin: 0 }}>{hiddenIds.length ? t('Add a widget') : t('Every widget is on the dashboard')}</span>
                {hiddenIds.map(id => (
                  <button key={id} type="button" className="aw-chip" onClick={() => setWidgetOn(id, true)}>
                    <Plus size={12} /> {t(CARD_LABELS[id])}
                  </button>
                ))}
              </div>
            </div>
          )}

          {anyVisible && (
            <BentoGrid rows={rows} hidden={hidden} editing={editing} artUrl={cardArt} artCards={artCards} onToggleArt={toggleCardArt}
              onHide={id => setWidgetOn(id as WidgetKey, false)} onChange={handleLayout} renderCard={id => cards[id] ?? null} />
          )}

          {/* All widgets hidden */}
          {!anyVisible && (
            <div className="aw-empty" style={{ padding: '80px 16px' }}>
              <EyeOff size={40} />
              <p className="aw-strong">{t('All widgets hidden')}</p>
              <span className="aw-meta">{t('Press Customize above to add them back')}</span>
            </div>
          )}

        </div>
      </div>
      <Suspense fallback={null}><FloatingChatBot /></Suspense>
    </div>
  );
};

export default Dashboard;
