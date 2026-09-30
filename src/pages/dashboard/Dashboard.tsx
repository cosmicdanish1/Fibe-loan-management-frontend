import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { message } from 'antd';
import type { RootState } from '../../store';

const FloatingChatBot = lazy(() => import('../../components/chat/FloatingChatBot'));
import {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database,
  FileDown, Zap, Calendar, Plus, X, Bell,
  AlertTriangle, Info, CheckCircle, Command, LayoutGrid,
  EyeOff, GripVertical,
  BookMarked, Building2, FilePen, Scale, Tag, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare,
  Award, Medal, FlagOff, type LucideIcon,
} from 'lucide-react';
import {
  ALL_QUICK_ACTION_DEFS, DEFAULT_ENABLED_QA_IDS,
  QA_STORAGE_KEY, QA_BROADCAST_CHANNEL,
} from '../../config/quickActions.config';
import {
  ActiveMembersWidget, SanctionedLoansWidget,
  MonthEndOutstandingWidget, MemberBalanceDistributionWidget,
} from './AnalyticsWidgets';
import apiService from '../../services/api';
import BentoGrid from './BentoGrid';
import { loadLayout, saveLayout, clearLayout, DEFAULT_ROWS, DEFAULT_WIDGET_CONFIG, type RowLayout, type WidgetConfig } from './dashboardLayout';
import {
  useDashboardSummary, PendingVouchersWidget, CashPositionWidget, DayEndStatusWidget, DemandRecoveryWidget,
  DepositsSummaryWidget, UpcomingMaturitiesWidget, LoanApplicationsWidget, OverdueLoansWidget,
  RetiringMembersWidget, NewMembersWidget,
} from './SummaryWidgets';
import dayjs from 'dayjs';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Notice {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  postedAt: string;
  postedBy: string;
}


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
  { label: 'New Member',    keys: ['Ctrl', 'N'] },
  { label: 'Save record',   keys: ['Ctrl', 'S'] },
  { label: 'Find / Search', keys: ['Ctrl', 'F'] },
  { label: 'Delete record', keys: ['Ctrl', 'D'] },
  { label: 'Refresh data',  keys: ['F5'] },
  { label: 'Print',         keys: ['Ctrl', 'P'] },
  { label: 'Dashboard',     keys: ['Alt', 'H'] },
  { label: 'Exit form',     keys: ['Esc'] },
];

// ─── Notice style map (kit alert variants) ───────────────────────────────────

const NOTICE_STYLES = {
  info:    { cls: 'aw-alert-info',    Icon: Info },
  warning: { cls: 'aw-alert-warning', Icon: AlertTriangle },
  success: { cls: 'aw-alert-success', Icon: CheckCircle },
};

const kbdStyle: React.CSSProperties = {
  border: '1px solid var(--aw-border-strong)', background: 'var(--aw-surface-muted)', borderRadius: 5,
  padding: '2px 7px', fontSize: 'calc(var(--type-body-size) - 2px)', fontWeight: 700, lineHeight: 1.2, color: 'var(--aw-text)',
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const fy = useMemo(() => getFYInfo(), []);

  // Optional custom background chosen in Settings (light mode only). Left empty
  // when the user has never picked one so the window uses the theme background.
  const isDark = useSelector((s: RootState) => s.theme.interfaceMode) === 'dark';
  const [customBg, setCustomBg] = useState(() => localStorage.getItem('lms-dashboard-bg') || '');

  // Widget visibility & banner opacity — synced from Settings via BroadcastChannel
  const [widgets, setWidgets] = useState<WidgetConfig>(loadWidgetConfig);
  const [bannerOpacity, setBannerOpacity] = useState<number>(loadBannerOpacity);

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

  // Notice board — shared across every PC via the backend, not localStorage.
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' as Notice['type'] });
  // Ids currently animating out before removal — lets the delete fade play.
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  // Dragged notice id, tracked outside state so drag-over doesn't re-render.
  const dragIdRef = useRef<number | null>(null);

  const refreshNotices = useCallback(async () => {
    const res = await apiService.getDashboardNotices();
    if (res.success && Array.isArray(res.data)) {
      setNotices(res.data.map((n: any) => ({
        id: n.id, title: n.title, message: n.message, type: n.type,
        postedAt: n.createdAt, postedBy: n.postedBy,
      })));
    }
  }, []);

  useEffect(() => { refreshNotices(); }, [refreshNotices]);

  // Ctrl+N → New Member
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openWindow('/masters/member'); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const addNotice = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    const res = await apiService.createDashboardNotice({
      title: form.title.trim(), message: form.message.trim(),
      type: form.type, postedBy: getCurrentUserName(),
    });
    if (!res.success) {
      message.error('Could not post the notice — please try again.');
      return;
    }
    await refreshNotices();
    setForm({ title: '', message: '', type: 'info' });
    setShowAddForm(false);
  }, [form, refreshNotices]);

  const deleteNotice = useCallback((id: number) => {
    // Play the fade-out, then commit the removal.
    setRemovingIds(prev => [...prev, id]);
    setTimeout(async () => {
      const res = await apiService.deleteDashboardNotice(id);
      if (res.success) {
        setNotices(prev => prev.filter(n => n.id !== id));
      } else {
        message.error('Could not delete the notice — please try again.');
      }
      setRemovingIds(prev => prev.filter(x => x !== id));
    }, 200);
  }, []);

  const closeForm = useCallback(() => {
    setShowAddForm(false);
    setForm({ title: '', message: '', type: 'info' });
  }, []);

  // Drag-and-drop reorder — optimistic locally, persisted in the background
  // so one user's reordering doesn't block on the network.
  const handleNoticeDrop = useCallback((targetId: number) => {
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    if (draggedId === null || draggedId === targetId) return;
    setNotices(prev => {
      const list = [...prev];
      const fromIdx = list.findIndex(n => n.id === draggedId);
      const toIdx = list.findIndex(n => n.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      if (!moved) return prev;
      list.splice(toIdx, 0, moved);
      apiService.reorderDashboardNotices(list.map(n => n.id)).catch(() => {});
      return list;
    });
  }, []);

  // Enter posts (Ctrl/⌘+Enter inside the textarea, where Enter is a newline);
  // Esc cancels.
  const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeForm(); return; }
    if (e.key === 'Enter') {
      const isTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (!isTextarea || e.ctrlKey || e.metaKey) { e.preventDefault(); addNotice(); }
    }
  }, [addNotice, closeForm]);


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

  const summaryState = useDashboardSummary();

  const cards: Record<string, React.ReactNode> = {
    fyBanner: (
            <section className="aw-card" style={{ background: `color-mix(in srgb, var(--aw-accent) ${bannerTint}%, var(--aw-surface))` }}>
              <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div className="aw-inline" style={{ alignItems: 'center', gap: 12 }}>
                  <span className="aw-card-icon" style={{ width: 36, height: 36 }}><Calendar size={17} /></span>
                  <div>
                    <p className="aw-label" style={{ margin: 0 }}>Current Financial Year</p>
                    <p className="aw-strong" style={{ fontSize: 'calc(var(--type-body-size) + 4px)', marginTop: 2 }}>{fy.label}</p>
                  </div>
                </div>
                <div className="aw-inline" style={{ alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p className="aw-label" style={{ margin: 0 }}>Started</p>
                    <p className="aw-strong">{fy.startDate}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p className="aw-label" style={{ margin: 0 }}>Ends</p>
                    <p className="aw-strong">{fy.endDate}</p>
                  </div>
                  <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-warning)', minWidth: 84 }}>
                    <div className="aw-stat-value">{fy.remaining}</div>
                    <div className="aw-stat-label">days left</div>
                  </div>
                  <div style={{ width: 140 }}>
                    <div className="aw-inline" style={{ justifyContent: 'space-between' }}>
                      <span className="aw-label" style={{ margin: 0 }}>Progress</span>
                      <strong>{fy.progress}%</strong>
                    </div>
                    <div className="aw-bar" role="progressbar" aria-valuenow={fy.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Financial year progress" style={{ marginTop: 6 }}>
                      <span style={{ width: `${fy.progress}%`, background: 'var(--aw-success)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
    ),
    quickActions: (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><LayoutGrid size={14} /></span>
                <h2 className="aw-card-title">Quick Actions</h2>
                <span className="aw-meta">— one click to open</span>
                {visibleActions.length > 0 && <span className="aw-meta" style={{ marginLeft: 'auto' }}>{visibleActions.length} configured</span>}
              </div>
              {visibleActions.length === 0 ? (
                <div className="aw-empty" style={{ padding: 24 }}>
                  <LayoutGrid size={26} />
                  <p className="aw-strong">No quick actions configured</p>
                  <span className="aw-meta">Go to Settings → Dashboard to add some</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 'var(--aw-gap)' }}>
                  {visibleActions.map(qa => {
                    const IconComp = ICON_MAP[qa.iconName] ?? Zap;
                    return (
                      <button key={qa.id} type="button" onClick={() => openWindow(qa.route)} className="aw-panel"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 8px', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                        <span className="aw-card-icon" style={{ width: 34, height: 34 }}><IconComp size={16} /></span>
                        <span style={{ fontSize: 'calc(var(--type-body-size) - 2px)', fontWeight: 700, textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '.02em' }}>{qa.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
    ),
    noticeBoard: (
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><Bell size={14} /></span>
                    <h2 className="aw-card-title">Notice Board</h2>
                    {notices.length > 0 && <span className="aw-pill">{notices.length}</span>}
                    <button type="button" onClick={() => setShowAddForm(v => !v)} className="aw-btn aw-btn-primary aw-btn-sm" style={{ marginLeft: 'auto' }}>
                      <Plus size={12} /> Add Notice
                    </button>
                  </div>

                  {showAddForm && (
                    <div className="aw-panel aw-fade-in" onKeyDown={handleFormKeyDown}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--aw-gap)' }}>
                        <input aria-label="Notice title" className="aw-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notice title..." />
                        <select aria-label="Notice type" className="aw-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Notice['type'] }))}>
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="success">Success</option>
                        </select>
                      </div>
                      <textarea aria-label="Notice message" className="aw-input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        placeholder="Notice message..." rows={2} style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                      <div className="aw-btn-row">
                        <button type="button" onClick={addNotice} className="aw-btn aw-btn-primary aw-btn-sm">Post</button>
                        <button type="button" onClick={closeForm} className="aw-btn aw-btn-secondary aw-btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, maxHeight: 300, overflowY: 'auto' }}>
                    {notices.length === 0 ? (
                      <div className="aw-empty" style={{ padding: 24 }}>
                        <Bell size={28} />
                        <p className="aw-strong">No notices posted yet</p>
                        <span className="aw-meta">Click "Add Notice" to post one</span>
                      </div>
                    ) : notices.map((n) => {
                      const s = NOTICE_STYLES[n.type];
                      return (
                        <div key={n.id}
                          draggable
                          onDragStart={() => { dragIdRef.current = n.id; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleNoticeDrop(n.id)}
                          className={`aw-alert ${s.cls} aw-fade-in`}
                          style={{ opacity: removingIds.includes(n.id) ? 0 : 1, transition: 'opacity .2s', alignItems: 'flex-start', cursor: 'grab' }}>
                          <GripVertical size={13} style={{ flex: 'none', marginTop: 2 }} />
                          <s.Icon size={14} style={{ flex: 'none', marginTop: 2 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>{n.title}</strong>
                            <p>{n.message}</p>
                            <p className="aw-meta" style={{ textTransform: 'uppercase', marginTop: 4 }}>{n.postedBy} · {dayjs(n.postedAt).format('D MMM, h:mm A')}</p>
                          </div>
                          <button type="button" className="aw-icon-btn is-sm is-danger" onClick={() => deleteNotice(n.id)} aria-label="Delete notice" data-tip="Delete notice" data-tip-pos="left"><X size={13} /></button>
                        </div>
                      );
                    })}
                  </div>
                </section>
    ),
    shortcuts: (
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><Command size={14} /></span>
                    <h2 className="aw-card-title">Keyboard Shortcuts</h2>
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
                  <p className="aw-meta" style={{ textTransform: 'uppercase' }}>Ctrl+N is wired · other shortcuts active in open forms</p>
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
  };

  return (
    <div className="app-window" style={{ flex: '1 1 auto', height: 'auto', minHeight: 0, ...(customBg && !isDark ? { background: customBg } : {}) }}>
      <div className="aw-content">
        <div className="aw-stack">

          {anyVisible && (
            <BentoGrid rows={rows} hidden={hidden} onChange={handleLayout} renderCard={id => cards[id] ?? null} />
          )}

          {/* All widgets hidden */}
          {!anyVisible && (
            <div className="aw-empty" style={{ padding: '80px 16px' }}>
              <EyeOff size={40} />
              <p className="aw-strong">All widgets hidden</p>
              <span className="aw-meta">Go to Settings → Dashboard to turn them back on</span>
            </div>
          )}

        </div>
      </div>
      <Suspense fallback={null}><FloatingChatBot /></Suspense>
    </div>
  );
};

export default Dashboard;
