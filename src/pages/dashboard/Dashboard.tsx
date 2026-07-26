import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { message } from 'antd';
import type { RootState } from '../../store';

const FloatingChatBot = lazy(() => import('../../components/chat/FloatingChatBot'));
import {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database,
  FileDown, Zap, Calendar, Plus, X, Bell,
  AlertTriangle, Info, CheckCircle, Command, LayoutGrid,
  StickyNote, ImageIcon, EyeOff,
  BookMarked, Building2, FilePen, Scale, Tag, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare,
  Award, Medal, type LucideIcon,
} from 'lucide-react';
import {
  ALL_QUICK_ACTION_DEFS, DEFAULT_ENABLED_QA_IDS,
  QA_STORAGE_KEY, QA_BROADCAST_CHANNEL,
} from '../../config/quickActions.config';
import dayjs from 'dayjs';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Notice {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  noticeStyle: 'card' | 'sticky';
  image?: string;
  postedAt: string;
  postedBy: string;
}

interface WidgetConfig {
  fyBanner: boolean;
  quickActions: boolean;
  noticeBoard: boolean;
  shortcuts: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WIDGET_CONFIG_KEY = 'lms-dashboard-widgets';
const BANNER_OPACITY_KEY = 'lms-fy-banner-opacity';
const DEFAULT_WIDGETS: WidgetConfig = { fyBanner: true, quickActions: true, noticeBoard: true, shortcuts: true };

const loadWidgetConfig = (): WidgetConfig => {
  try { return { ...DEFAULT_WIDGETS, ...JSON.parse(localStorage.getItem(WIDGET_CONFIG_KEY) || '{}') }; }
  catch { return DEFAULT_WIDGETS; }
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

const NOTICES_KEY = 'lms_dashboard_notices';
// Base64 images live in localStorage (~5MB total budget), so cap the source
// file to keep a few notices from blowing the quota.
const MAX_IMAGE_BYTES = 1_000_000; // 1 MB

const loadNotices = (): Notice[] => {
  try { return JSON.parse(localStorage.getItem(NOTICES_KEY) || '[]'); }
  catch { return []; }
};
// Returns false when the write fails (e.g. localStorage quota exceeded) so the
// caller can warn the user instead of throwing out of a click handler.
const saveNotices = (n: Notice[]): boolean => {
  try { localStorage.setItem(NOTICES_KEY, JSON.stringify(n)); return true; }
  catch { return false; }
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
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare, Award, Medal,
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

// ─── Notice style maps ───────────────────────────────────────────────────────

const NOTICE_STYLES = {
  info:    { border: 'border-indigo-400', bg: 'bg-indigo-50',  title: 'text-indigo-800',  body: 'text-indigo-600',  meta: 'text-indigo-400',  Icon: Info },
  warning: { border: 'border-amber-400',  bg: 'bg-amber-50',   title: 'text-amber-800',   body: 'text-amber-600',   meta: 'text-amber-400',   Icon: AlertTriangle },
  success: { border: 'border-emerald-400',bg: 'bg-emerald-50', title: 'text-emerald-800', body: 'text-emerald-600', meta: 'text-emerald-400', Icon: CheckCircle },
};

const STICKY_COLORS: Record<Notice['type'], string> = {
  info:    'bg-yellow-100 border-yellow-300',
  warning: 'bg-orange-100 border-orange-300',
  success: 'bg-lime-100 border-lime-300',
};

// ─── Component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const fy = useMemo(() => getFYInfo(), []);

  // Theme — drives background so it responds immediately on dark↔light toggle
  const interfaceMode = useSelector((s: RootState) => s.theme.interfaceMode);
  const isDark = interfaceMode === 'dark'
    || (interfaceMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Dashboard background (user-customisable in light mode; forced dark in dark mode)
  const [dashBg, setDashBg] = useState(() => localStorage.getItem('lms-dashboard-bg') || '#f5f6fa');
  const effectiveBg = isDark ? '#0f172a' : dashBg;

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
    bgCh.onmessage = (e) => { if (e.data?.dashboardBg) setDashBg(e.data.dashboardBg); };

    const cfgCh = new BroadcastChannel('lms_dashboard_config');
    cfgCh.onmessage = (e) => {
      if (e.data?.widgets)      setWidgets(e.data.widgets);
      if (e.data?.bannerOpacity !== undefined) setBannerOpacity(e.data.bannerOpacity);
    };

    const qaCh = new BroadcastChannel(QA_BROADCAST_CHANNEL);
    qaCh.onmessage = (e) => { if (Array.isArray(e.data?.enabledIds)) setEnabledQaIds(e.data.enabledIds); };

    return () => { bgCh.close(); cfgCh.close(); qaCh.close(); };
  }, []);

  const visibleActions = useMemo(() =>
    enabledQaIds
      .map(id => ALL_QUICK_ACTION_DEFS.find(d => d.id === id))
      .filter((d): d is typeof ALL_QUICK_ACTION_DEFS[number] => d !== undefined),
    [enabledQaIds]
  );

  // Notice board
  const [notices, setNotices] = useState<Notice[]>(loadNotices);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    title: '', message: '', type: 'info' as Notice['type'],
    noticeStyle: 'card' as 'card' | 'sticky', image: '',
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Ids currently animating out before removal — lets the delete fade play.
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      message.warning('Image is too large — please pick one under 1 MB.');
      e.target.value = ''; // allow re-selecting the same file after resizing
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(p => ({ ...p, image: ev.target?.result as string || '' }));
    reader.onerror = () => message.error('Could not read that image.');
    reader.readAsDataURL(file);
  }, []);

  // Ctrl+N → New Member
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openWindow('/masters/member'); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const addNotice = useCallback(() => {
    if (!form.title.trim() || !form.message.trim()) return;
    const updated: Notice[] = [{
      id: Date.now().toString(),
      title: form.title.trim(), message: form.message.trim(),
      type: form.type, noticeStyle: form.noticeStyle,
      ...(form.image ? { image: form.image } : {}),
      postedAt: new Date().toISOString(), postedBy: getCurrentUserName(),
    }, ...notices];
    // Persist first — if storage is full, warn and keep the form open so the
    // user can drop the image / trim old notices instead of losing their input.
    if (!saveNotices(updated)) {
      message.error('Could not save — storage is full. Try removing the image or deleting old notices.');
      return;
    }
    setNotices(updated);
    setForm({ title: '', message: '', type: 'info', noticeStyle: 'card', image: '' });
    setShowAddForm(false);
  }, [form, notices]);

  const deleteNotice = useCallback((id: string) => {
    // Play the fade-out, then commit the removal.
    setRemovingIds(prev => [...prev, id]);
    setTimeout(() => {
      setNotices(prev => {
        const updated = prev.filter(n => n.id !== id);
        saveNotices(updated);
        return updated;
      });
      setRemovingIds(prev => prev.filter(x => x !== id));
    }, 200);
  }, []);

  const closeForm = useCallback(() => {
    setShowAddForm(false);
    setForm({ title: '', message: '', type: 'info', noticeStyle: 'card', image: '' });
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

  // Banner glass style — opacity controlled by Settings
  // When opacity < 45 the dark layer is mostly transparent → background shows through (likely light)
  // so we flip to dark text for readability; above 45 we use the classic white-on-dark scheme.
  const isDarkBanner = bannerOpacity >= 45;
  const bannerStyle: React.CSSProperties = {
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    background: `rgba(15,23,42,${(bannerOpacity / 100).toFixed(2)})`,
    border: isDarkBanner ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
    boxShadow: isDarkBanner
      ? '0 8px 32px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.07)'
      : '0 4px 20px rgba(0,0,0,0.06)',
  };

  // Derived text / decoration tokens for the banner
  const bt = {
    label:   isDarkBanner ? '#94a3b8' : '#475569',   // "Current Financial Year" label
    value:   isDarkBanner ? '#ffffff' : '#0f172a',   // FY year, dates, progress %
    accent:  isDarkBanner ? '#fcd34d' : '#d97706',   // days-remaining number
    divider: isDarkBanner ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    chipBg:  isDarkBanner ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    chipBdr: isDarkBanner ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    icon:    isDarkBanner ? '#94a3b8' : '#475569',
    track:   isDarkBanner ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
  };

  const anyVisible = Object.values(widgets).some(Boolean);

  return (
    <div className="flex-grow flex flex-col overflow-hidden relative" style={{ backgroundColor: effectiveBg }}>

      {/* ── Decorative blobs (give glass something to blur) ───── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-sky-400/6 rounded-full blur-2xl" />
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-y-auto p-3 space-y-3">

        {/* FY Banner — glass, opacity + text colour both adapt to opacity level */}
        {widgets.fyBanner && (
          <div className="rounded-xl px-4 py-3 flex items-center justify-between shrink-0" style={bannerStyle}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: bt.chipBg, border: `1px solid ${bt.chipBdr}` }}>
                <Calendar size={16} style={{ color: bt.icon }} />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: bt.label }}>Current Financial Year</p>
                <p className="font-black text-[15px] leading-tight mt-0.5" style={{ color: bt.value }}>{fy.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: bt.label }}>Started</p>
                <p className="text-[11px] font-black" style={{ color: bt.value }}>{fy.startDate}</p>
              </div>
              <div className="w-px h-8" style={{ background: bt.divider }} />
              <div className="text-center">
                <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: bt.label }}>Ends</p>
                <p className="text-[11px] font-black" style={{ color: bt.value }}>{fy.endDate}</p>
              </div>
              <div className="w-px h-8" style={{ background: bt.divider }} />
              <div className="rounded-xl px-4 py-2 text-center min-w-[72px]" style={{ background: bt.chipBg, border: `1px solid ${bt.chipBdr}` }}>
                <p className="font-black text-2xl leading-none" style={{ color: bt.accent }}>{fy.remaining}</p>
                <p className="text-[7px] font-black uppercase tracking-wider mt-0.5" style={{ color: bt.label }}>days left</p>
              </div>
              <div className="w-28">
                <div className="flex justify-between mb-1">
                  <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: bt.label }}>Progress</span>
                  <span className="text-[9px] font-black" style={{ color: bt.value }}>{fy.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: bt.track }}>
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${fy.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {widgets.quickActions && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
              <LayoutGrid size={11} className="text-slate-400" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Quick Actions</span>
              <span className="text-[7px] text-slate-400 ml-1">— one click to open</span>
              {visibleActions.length > 0 && (
                <span className="ml-auto text-[7px] text-slate-400">{visibleActions.length} configured</span>
              )}
            </div>
            <div className={`p-3 gap-2 ${
              visibleActions.length === 0 ? 'flex' :
              visibleActions.length <= 4 ? 'grid grid-cols-4' :
              visibleActions.length <= 6 ? 'grid grid-cols-6' : 'grid grid-cols-8'
            }`}>
              {visibleActions.length === 0 ? (
                <div className="flex-1 py-6 text-center text-slate-300">
                  <LayoutGrid size={24} className="mx-auto mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">No quick actions configured</p>
                  <p className="text-[8px] text-slate-400 mt-1">Go to Settings → Dashboard to add some</p>
                </div>
              ) : visibleActions.map(qa => {
                const IconComp = ICON_MAP[qa.iconName] ?? Zap;
                return (
                  <button key={qa.id} onClick={() => openWindow(qa.route)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md bg-white group transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none">
                    <div className={`p-2 rounded-lg border ${qa.colorCls} group-hover:scale-110 transition-transform`}>
                      <IconComp size={16} />
                    </div>
                    <span className="text-[7.5px] font-black text-slate-600 text-center leading-tight uppercase tracking-tight">{qa.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notice Board + Keyboard Shortcuts */}
        {(widgets.noticeBoard || widgets.shortcuts) && (
          <div className={`grid gap-3 ${widgets.noticeBoard && widgets.shortcuts ? 'grid-cols-2' : 'grid-cols-1'}`}>

            {widgets.noticeBoard && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes noticeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
                ` }} />
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell size={11} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Notice Board</span>
                    {notices.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[7px] font-black rounded-full leading-none">{notices.length}</span>
                    )}
                  </div>
                  <button onClick={() => setShowAddForm(v => !v)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[8px] font-black uppercase transition-all">
                    <Plus size={9} /> Add Notice
                  </button>
                </div>

                <div className={`grid shrink-0 transition-all duration-300 ease-out ${showAddForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 space-y-1.5" onKeyDown={handleFormKeyDown}>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Notice title..."
                        className="col-span-2 h-6 px-2 text-[9px] bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                      <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Notice['type'] }))}
                        className="h-6 px-1 text-[9px] bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-400">
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider shrink-0">Style:</span>
                      <button onClick={() => setForm(p => ({ ...p, noticeStyle: 'card' }))}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[7.5px] font-black uppercase border transition-all ${form.noticeStyle === 'card' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <Info size={8} /> Card
                      </button>
                      <button onClick={() => setForm(p => ({ ...p, noticeStyle: 'sticky' }))}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[7.5px] font-black uppercase border transition-all ${form.noticeStyle === 'sticky' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <StickyNote size={8} /> Sticky
                      </button>
                      <button onClick={() => imageInputRef.current?.click()}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[7.5px] font-black uppercase border transition-all ml-auto ${form.image ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <ImageIcon size={8} /> {form.image ? 'Image ✓' : '+ Image'}
                      </button>
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      {form.image && (
                        <button onClick={() => setForm(p => ({ ...p, image: '' }))} className="text-slate-400 hover:text-rose-500 transition-colors">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    {form.image && <img src={form.image} alt="preview" className="h-10 rounded border border-slate-200 object-cover" />}
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Notice message..." rows={2}
                      className="w-full px-2 py-1 text-[9px] bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-400 resize-none" />
                    <div className="flex gap-1.5">
                      <button onClick={addNotice} className="h-6 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[8px] font-black uppercase transition-all">Post</button>
                      <button onClick={closeForm}
                        className="h-6 px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[8px] font-black uppercase transition-all">Cancel</button>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[140px] max-h-[280px]">
                  {notices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-8 text-slate-300">
                      <Bell size={28} className="mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-wider">No notices posted yet</p>
                      <p className="text-[8px] mt-1">Click "Add Notice" to post one</p>
                    </div>
                  ) : notices.map((n, idx) => {
                    if (n.noticeStyle === 'sticky') {
                      const stickyBg = STICKY_COLORS[n.type];
                      const tilt = idx % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]';
                      return (
                        <div key={n.id} className={`relative p-2.5 rounded shadow-md border-b-4 ${stickyBg} ${tilt} hover:rotate-0 transition-all duration-200 group ${removingIds.includes(n.id) ? 'opacity-0' : 'animate-[noticeIn_0.25s_ease-out]'}`} style={{ fontFamily: 'cursive, sans-serif' }}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <StickyNote size={11} className="text-amber-600 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-800 truncate">{n.title}</span>
                            </div>
                            <button onClick={() => deleteNotice(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 shrink-0"><X size={10} /></button>
                          </div>
                          <p className="text-[9px] text-slate-700 mt-1 leading-snug">{n.message}</p>
                          {n.image && <img src={n.image} alt="" className="mt-1.5 w-full max-h-20 rounded object-cover" />}
                          <p className="text-[7.5px] text-slate-500 mt-1.5 uppercase tracking-wide">{n.postedBy} · {dayjs(n.postedAt).format('D MMM, h:mm A')}</p>
                        </div>
                      );
                    }
                    const s = NOTICE_STYLES[n.type];
                    return (
                      <div key={n.id} className={`border-l-[3px] ${s.border} ${s.bg} rounded-r-lg p-2 relative group transition-all duration-200 ${removingIds.includes(n.id) ? 'opacity-0 -translate-y-1' : 'animate-[noticeIn_0.25s_ease-out]'}`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <s.Icon size={11} className={s.title} />
                            <span className={`text-[10px] font-black ${s.title} truncate`}>{n.title}</span>
                          </div>
                          <button onClick={() => deleteNotice(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 shrink-0"><X size={10} /></button>
                        </div>
                        <p className={`text-[9px] ${s.body} mt-0.5 leading-snug`}>{n.message}</p>
                        {n.image && <img src={n.image} alt="" className="mt-1.5 w-full max-h-20 rounded object-cover" />}
                        <p className={`text-[7.5px] ${s.meta} mt-1 uppercase tracking-wide`}>{n.postedBy} · {dayjs(n.postedAt).format('D MMM, h:mm A')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {widgets.shortcuts && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
                  <Command size={11} className="text-slate-400" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Keyboard Shortcuts</span>
                </div>
                <div className="p-2 flex-1 divide-y divide-slate-50">
                  {SHORTCUTS.map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                      <span className="text-[10px] text-slate-600 font-semibold">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <React.Fragment key={k}>
                            {i > 0 && <span className="text-[8px] text-slate-300">+</span>}
                            <kbd className="bg-slate-100 border border-slate-200 rounded text-[9px] font-black text-slate-700 px-1.5 py-0.5 leading-none">{k}</kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-slate-100 shrink-0">
                  <p className="text-[7.5px] text-slate-400 uppercase tracking-wider">Ctrl+N is wired · other shortcuts active in open forms</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All widgets hidden */}
        {!anyVisible && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-300">
            <EyeOff size={40} className="mb-3 text-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">All widgets hidden</p>
            <p className="text-[9px] mt-1.5 text-slate-400">Go to Settings → Dashboard to turn them back on</p>
          </div>
        )}

      </div>
      <Suspense fallback={null}><FloatingChatBot /></Suspense>
    </div>
  );
};

export default Dashboard;
