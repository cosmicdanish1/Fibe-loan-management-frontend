import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ConfigProvider,
  theme as antdTheme,
  message,
} from 'antd';
import { FONT_OPTIONS } from '../../config/fontOptions';
import { TopBarLookSettings } from './TopBarLookSettings';
import LoadingAnimation from '../loaders/LoadingAnimation';
import { LOADING_ANIMATIONS, saveLoadingAnimation, useLoadingAnimation } from '../../config/loadingAnimation';
import { DEFAULT_TYPOGRAPHY_OFFSETS, normalizeTypographyOffsets, readTypographyOffsets, saveTypographyOffsets, TYPOGRAPHY_SYNC_CHANNEL, type TypographyOffsets } from '../../config/typographyPreferences';
import {
  Settings,
  Save,
  X,
  Monitor,
  Palette,
  Image as ImageIcon,
  Type,
  Lock,
  Unlock,
  Code,
  BarChart2,
  RotateCcw,
  UploadCloud,
  ShieldCheck,
  Terminal,
  Activity,
  Check,
  KeyRound,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Zap,
  Bell,
  Command,
  LayoutGrid,
  Layers,
  Search,
  // Quick Actions icon set
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database, FileDown,
  BookMarked, Building2, FilePen, Scale, Tag as TagIcon, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard,
  CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Sun, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  Hash, Banknote, MessageSquare, Award, Medal, Send, MessageCircle, Mail, Smartphone, type LucideIcon,
} from 'lucide-react';
import {
  ALL_QUICK_ACTION_DEFS, DEFAULT_ENABLED_QA_IDS,
  QA_STORAGE_KEY, QA_BROADCAST_CHANNEL,
  type QuickActionDef,
} from '../../config/quickActions.config';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setTheme } from '../../store/slices/themeSlice';
import { apiService } from '../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useLicense } from '../license/LicenseContext';
import { DEFAULT_WIDGET_CONFIG, clearLayout, type WidgetConfig } from '../../pages/dashboard/dashboardLayout';
import { runThemeTransition } from '../../utils/themeTransition';
import { flushSync } from 'react-dom';

// --- Types & Defaults ---

interface AppSettings {
  // Appearance
  themeMode: 'light' | 'dark';
  accentColor: string;
  density: 'compact' | 'comfortable';
  borderRadius: number;

  // Typography
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string; // Future proofing

  // Background
  backgroundType: 'image' | 'gradient' | 'solid';
  backgroundColor1: string;
  backgroundColor2: string;
  backgroundImage: string | null;

  // Content
  textColor: string;

  // Typography extras
  boldText: boolean;

  // System
  notifications: boolean;
  soundEffects: boolean;
  showChatbot: boolean;

  // Dashboard Background
  dashboardBg: string;
}

const defaultSettings: AppSettings = {
  themeMode: 'light',
  accentColor: '#ec4899',
  density: 'comfortable',
  borderRadius: 8,

  fontSize: 'medium',
  fontFamily: 'Inter',

  backgroundType: 'solid',
  backgroundColor1: '#ffffff',
  backgroundColor2: '#000000',
  backgroundImage: null,

  textColor: '#1f2937',

  boldText: false,

  notifications: true,
  soundEffects: true,
  showChatbot: true,

  dashboardBg: '#f5f6fa',
};

/* Settings colors resolve through the shell so shared panels and dialogs
   follow Light, Dark, and the operating system's color preference. */
const C = {
  bg: 'var(--settings-bg)',
  bgHeader: 'var(--settings-bg-header)',
  panel: 'var(--settings-panel)',
  sidebar: 'var(--settings-sidebar)',
  border: 'var(--settings-border)',
  divider: 'var(--settings-divider)',
  fill: 'var(--settings-fill)',
  fillSoft: 'var(--settings-fill-soft)',
  text: 'var(--settings-text)',
  textStrong: 'var(--settings-text-strong)',
  dim: 'var(--settings-dim)',
  dimmer: 'var(--settings-dimmer)',
  green: 'var(--settings-green)',
  red: 'var(--settings-red)',
  amber: 'var(--settings-amber)',
} as const;

const SETTINGS_PALETTES = {
  dark: {
    bg: '#090a0d', bgHeader: '#0c0c0e', panel: '#1c1c1e', sidebar: '#141416',
    border: 'rgba(255,255,255,.08)', divider: 'rgba(255,255,255,.07)',
    fill: 'rgba(255,255,255,.05)', fillSoft: 'rgba(255,255,255,.03)',
    text: '#f5f5f7', textStrong: '#f8f8fa', dim: '#a0a0a8', dimmer: '#858590',
    green: '#34d399', red: '#ff6961', amber: '#fbbf24',
  },
  light: {
    bg: '#f5f6f9', bgHeader: '#fbfbfd', panel: '#fcfcfe', sidebar: '#eef0f5',
    border: 'rgba(31,42,64,.14)', divider: 'rgba(31,42,64,.10)',
    fill: 'rgba(31,42,64,.06)', fillSoft: 'rgba(31,42,64,.035)',
    text: '#263247', textStrong: '#172033', dim: '#55637a', dimmer: '#63718a',
    green: '#047857', red: '#b42330', amber: '#946200',
  },
} as const;

const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || '#6366f1').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const v = parseInt(n, 16);
  if (isNaN(v)) return [99, 102, 241];
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

// Preset Palettes
const ACCENT_PRESETS = [
  '#6366f1', // Indigo (Default)
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#71717a', // Zinc — reads on the dark panel where the old #1f2937 vanished
];

const BG_PRESETS = [
  '#ffffff', // White
  '#f8fafc', // Slate 50
  '#f1f5f9', // Slate 100
  '#e2e8f0', // Slate 200
  '#fff1f2', // Rose 50
  '#f0fdf4', // Green 50
  '#eff6ff', // Blue 50
  '#fafafa', // Zinc
];

// SHA-256 of the developer PIN (the plaintext PIN is no longer in the bundle).
// NOTE: a client-side hash is still only a speed bump, not a security control -
// the real gate must be a backend permission check.
const DEVELOPER_PIN_SHA256 = '27ed5b43a1c87bdf97934b51528c17cf26f3e34ba4328041da951caad6dcd884';
const MAX_ATTEMPTS = 3;
const PIN_LOCK_MINUTES = 5;
const PIN_FAIL_KEY = 'devPinFailCount';
const PIN_LOCK_KEY = 'devPinLockUntil';

const sha256Hex = async (text: string): Promise<string> => {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
};
const readPinLockUntil = (): number => {
  try { return Number(sessionStorage.getItem(PIN_LOCK_KEY)) || 0; } catch { return 0; }
};
const clearPinFailures = () => {
  try { sessionStorage.removeItem(PIN_FAIL_KEY); sessionStorage.removeItem(PIN_LOCK_KEY); } catch { /* ignore */ }
};
// Records a failed attempt; starts the lock when the limit is reached. Returns the new count.
const recordPinFailure = (): number => {
  let count = 1;
  try {
    count = (Number(sessionStorage.getItem(PIN_FAIL_KEY)) || 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      sessionStorage.setItem(PIN_LOCK_KEY, String(Date.now() + PIN_LOCK_MINUTES * 60000));
      sessionStorage.setItem(PIN_FAIL_KEY, '0');
    } else {
      sessionStorage.setItem(PIN_FAIL_KEY, String(count));
    }
  } catch { /* storage unavailable: fall back to per-dialog counting */ }
  return count;
};

// Sidebar / content header copy, keyed by tab.
const TAB_META: Record<string, { title: string; subtitle: string; keywords: string }> = {
  appearance: { title: 'Appearance', subtitle: 'Colors, typography and canvas',      keywords: 'theme dark light accent colour color gradient font text size bold shadow shadows density corner radius background image' },
  dashboard:  { title: 'Dashboard',  subtitle: 'Widgets, quick actions and layout',  keywords: 'widgets quick actions shortcuts fy banner opacity transparency background notice board' },
  alerts:     { title: 'Notifications', subtitle: 'Telegram, Discord and Jira: what is sent and where', keywords: 'telegram discord jira alerts notifications webhook login logout errors crashes backup day-end licence digest mute turn off on ticket' },
  system:     { title: 'System & Window', subtitle: 'Notifications and global behavior', keywords: 'notifications toasts sound effects audio chatbot ai assistant' },
  developer:  { title: 'Developer',  subtitle: 'Root-level diagnostics',             keywords: 'analytics realtime monitor window geometry reset layouts console' },
  approvers:  { title: 'Approvers',  subtitle: 'Who may approve sensitive actions with their phone code', keywords: 'approver otp authenticator two-factor 2fa approval code loan closure early closure pass reverse authorised authorized privilege' },
  license:    { title: 'License',    subtitle: 'Activation and renewal',             keywords: 'license key activate renew expiry grace customer' },
};

// Category tints for the Quick Actions grid. The shared config carries
// light-mode Tailwind classes (bg-indigo-50 …) that wash out on a dark panel,
// so the dark chrome tints by category instead.
const QA_CATEGORY_COLOR: Record<QuickActionDef['category'], string> = {
  'Masters': '#6366f1',
  'Transactions': '#10b981',
  'Demand & Recovery': '#f59e0b',
  'Administration': '#8b5cf6',
  'Utility': '#0ea5e9',
  'Certificates': '#ec4899',
};

// Icon map shared with Dashboard
const QA_ICON_MAP: Record<string, LucideIcon> = {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database, FileDown, Zap,
  BookMarked, Building2, FilePen, Scale, Tag: TagIcon, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare, Award, Medal,
};

/* --- Shared dark-chrome building blocks ---------------------------------- */

/** Card with the icon-tile + title + subtitle header the design uses everywhere. */
const Panel: React.FC<{
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ icon, tint, title, subtitle, right, className = '', style, children }) => {
  const [r, g, b] = hexToRgb(tint);
  return (
    <div
      className={`settings-panel rounded-2xl ${className}`}
      style={{ background: C.panel, border: `1px solid ${C.border}`, ...style }}
    >
      <div className="settings-panel-heading flex items-center gap-3" style={{ borderBottom: `1px solid ${C.divider}` }}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `rgba(${r},${g},${b},.18)`, color: tint }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="settings-panel-title font-bold tracking-tight" style={{ color: C.textStrong }}>{title}</h3>
          {subtitle && (
            <p className="fz-small font-medium" style={{ color: C.dim }}>{subtitle}</p>
          )}
        </div>
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
};

/** Pill badge used for the "6 / 8 on" style counters. */
const Counter: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.green }) => {
  return (
    <span
      className="px-2.5 py-1 fz-tiny font-black rounded-full uppercase tracking-widest"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {children}
    </span>
  );
};

/** iOS-style switch. Replaces antd Switch, which renders light-on-dark here. */
const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; accent: string; label?: string }> = ({
  on, onChange, accent, label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className="relative shrink-0 border-0 cursor-pointer"
    style={{ width: 42, height: 24, borderRadius: 12, background: on ? accent : C.border }}
  >
    <span
      className="absolute block rounded-full settings-knob"
      style={{ width: 20, height: 20, top: 2, left: 2, transform: `translateX(${on ? 18 : 0}px)`, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
    />
  </button>
);

/** Native range input — antd's Slider cannot be themed dark from here. */
const Range: React.FC<{
  min: number; max: number; step?: number; value: number;
  onChange: (v: number) => void; accent: string; ariaLabel: string;
  id?: string; format?: (v: number) => string;
}> = ({ min, max, step = 1, value, onChange, accent, ariaLabel, id, format }) => {
  // A small value bubble follows the thumb while the slider is hovered,
  // dragged or keyboard-focused, so the exact value is readable mid-drag.
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  const [focus, setFocus] = useState(false);
  const pct = max === min ? 0 : (value - min) / (max - min);
  const startDrag = () => {
    setDrag(true);
    const end = () => { setDrag(false); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  return (
    <div className="settings-range-wrap" data-show={hover || drag || focus ? 'true' : 'false'}>
      <span className="settings-range-tip" aria-hidden="true" style={{ left: `calc(${pct * 100}% + ${(0.5 - pct) * 18}px)` }}>
        {format ? format(value) : value}
      </span>
      <input
        id={id}
        type="range"
        aria-label={id ? undefined : ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        onPointerDown={startDrag}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={e => setFocus(e.currentTarget.matches(':focus-visible'))}
        onBlur={() => setFocus(false)}
        className="w-full settings-range"
        style={{ accentColor: accent, background: C.fill }}
      />
    </div>
  );
};

/** Native colour well, styled by the .settings-color rules in input.css. */
const ColorWell: React.FC<{ value: string; onChange: (hex: string) => void; ariaLabel: string; size?: number }> = ({
  value, onChange, ariaLabel, size = 30,
}) => (
  <input
    type="color"
    aria-label={ariaLabel}
    value={value}
    onChange={e => onChange(e.target.value)}
    className="settings-color cursor-pointer"
    style={{ width: size, height: size }}
  />
);

const fieldLabel: React.CSSProperties = { color: C.dim };

// --- Notifications (admin): channels, per-channel alert switches, limits and the Jira card ---
type ChannelId = 'telegram' | 'discord';
interface AlertParamData { label: string; unit: string; default: number; min: number; max: number; value: number }
interface AlertItemData { key: string; label: string; description: string; enabled: boolean; telegram: boolean; discord: boolean; param: AlertParamData | null }
interface AlertGroupData { id: string; label: string; description: string; alerts: AlertItemData[] }
interface AlertSettingsData {
  master: boolean;
  telegram: { enabled: boolean; configured: boolean; channels: Record<string, boolean> };
  discord: { enabled: boolean; configured: boolean; channels: Record<string, boolean> };
  jira: { enabled: boolean; configured: boolean; site: string; projectKey: string; issueType: string };
  groups: AlertGroupData[];
}

interface OnlineUser { username: string; role: string; host: string; ip: string; mac: string; version: string; minutes: number }

const ALERT_GROUP_TINT: Record<string, string> = {
  queries: '#38bdf8', errors: '#f87171', activity: '#34d399', business: '#fbbf24', digest: '#a78bfa',
};

/** Channels that work today. Each gets its own big card and its own settings panel. */
const CHANNEL_DEFS: { id: ChannelId; name: string; tagline: string; Icon: LucideIcon; gradient: string; tint: string }[] = [
  { id: 'telegram', name: 'Telegram', tagline: 'One group chat with topics', Icon: Send, gradient: 'linear-gradient(135deg,#229ed9,#4fc3f7)', tint: '#229ed9' },
  { id: 'discord', name: 'Discord', tagline: 'A server with channels', Icon: MessageSquare, gradient: 'linear-gradient(135deg,#5865f2,#8e9bff)', tint: '#5865f2' },
];

/** Placeholders for channels planned for later. Not clickable, nothing to configure yet. */
const COMING_SOON: { id: string; name: string; Icon: LucideIcon; gradient: string }[] = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle, gradient: 'linear-gradient(135deg,#25d366,#6ee7a0)' },
  { id: 'email', name: 'Email', Icon: Mail, gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  { id: 'sms', name: 'SMS', Icon: Smartphone, gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
  { id: 'slack', name: 'Slack', Icon: Hash, gradient: 'linear-gradient(135deg,#e01e5a,#f472b6)' },
  { id: 'teams', name: 'Microsoft Teams', Icon: Users, gradient: 'linear-gradient(135deg,#464eb8,#7b83eb)' },
];

/** Approvers (ES-124): choose which existing users may approve sensitive actions with the code from their own phone. */
const ApproversSettingsSection: React.FC<{ accent: string; isAdmin: boolean }> = ({ accent, isAdmin }) => {
  type Row = { userid: number; username: string; level: string; enabled: boolean; enrolled: boolean; approver: boolean; active: boolean };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [guards, setGuards] = useState<Record<string, { enabled: boolean }>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [pick, setPick] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const g = await apiService.twoFaGetGuards();
      setRows(g.approvers); setGuards(g.guards);
      setLabels(Object.fromEntries(g.actions.map((a) => [a.key, a.label])));
    } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : 'Could not load approvers' }); }
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <Panel icon={<ShieldCheck size={16} />} tint="#a78bfa" title="Approvers" subtitle="Administrators only">
        <p className="fz-body" style={{ color: C.dim }}>Only an administrator can choose who may approve sensitive actions.</p>
      </Panel>
    );
  }

  const change = async (id: number, add: boolean, name: string) => {
    try {
      const r = await apiService.twoFaSetApprovers(add ? [id] : [], add ? [] : [id]);
      setRows(r.approvers); setPick('');
      setNote({ ok: true, text: add ? `${name} is now an approver. They must set up their authenticator in My Profile before their code counts.` : `${name} is no longer an approver. Their code stops working immediately.` });
    } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : 'Could not change approver' }); }
  };

  const current = (rows ?? []).filter((r) => r.approver);
  const candidates = (rows ?? []).filter((r) => !r.approver && r.enabled);
  const activeCount = current.filter((r) => r.active).length;
  const btn: React.CSSProperties = { background: C.fill, border: `1px solid ${C.border}`, color: C.text };
  const protectedOn = Object.entries(guards).filter(([, v]) => v.enabled).map(([k]) => labels[k] || k);

  return (
    <div className="flex flex-col gap-4">
      <Panel icon={<ShieldCheck size={16} />} tint="#a78bfa" title="Approvers (OTP)" subtitle="Existing users who can approve with the code from their own phone"
        right={<Counter color={activeCount > 0 ? C.green : C.red}>{activeCount} active</Counter>}>
        <div className="flex flex-col gap-3">
          <p className="fz-body" style={{ color: C.dim }}>
            An approver gives the current 6-digit code from their authenticator app to the person doing a protected action (for example an Early Loan Closure).
            Each approver sets up their own authenticator in <strong>My Profile</strong>. You can also grant this as <strong>Approver (OTP)</strong> in the Access Privilege Matrix (Create / Modify Users).
          </p>

          {note && <div className="px-3.5 py-2.5 rounded-xl fz-body" style={{ background: C.fill, color: note.ok ? C.green : C.red }}>{note.text}</div>}

          <div className="flex items-center gap-2 flex-wrap">
            <select aria-label="Add approver" value={pick} onChange={(e) => setPick(e.target.value)}
              className="rounded-lg px-3 fz-body outline-none" style={{ height: 34, minWidth: 220, ...btn }}>
              <option value="">Add an approver…</option>
              {candidates.map((u) => <option key={u.userid} value={u.userid}>{u.username}{u.level ? ` (${u.level})` : ''}</option>)}
            </select>
            <button type="button" disabled={!pick} className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest cursor-pointer"
              style={{ height: 34, background: pick ? accent : C.fill, color: pick ? '#fff' : C.dim, border: 0, opacity: pick ? 1 : 0.6 }}
              onClick={() => { const u = candidates.find((c) => String(c.userid) === pick); if (u) void change(u.userid, true, u.username); }}>
              Add
            </button>
          </div>

          {rows === null ? <p className="fz-body" style={{ color: C.dim }}>Loading…</p>
            : current.length === 0 ? <p className="fz-body" style={{ color: C.dim }}>No approver yet.</p>
            : (
              <div className="flex flex-col gap-1.5">
                {current.map((r) => (
                  <div key={r.userid} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: C.fill }}>
                    <div className="min-w-0">
                      <span className="fz-body font-bold" style={{ color: C.textStrong }}>{r.username}</span>
                      <span className="fz-small ml-2" style={{ color: C.dim }}>{r.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Counter color={!r.enabled ? C.red : r.enrolled ? C.green : C.amber ?? C.dim}>
                        {!r.enabled ? 'Disabled' : r.enrolled ? 'Active' : 'Needs authenticator'}
                      </Counter>
                      <button type="button" className="rounded-lg px-3 fz-tiny font-black uppercase tracking-widest cursor-pointer" style={{ height: 30, ...btn }}
                        onClick={() => void change(r.userid, false, r.username)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </Panel>

      <Panel icon={<KeyRound size={16} />} tint="#38bdf8" title="Protected actions" subtitle="Which windows ask for an approver's code"
        right={<button type="button" className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest cursor-pointer" style={{ height: 30, ...btn }}
          onClick={() => (window as any).electronAPI?.openNewWindow?.('/two-factor-settings')}>Manage…</button>}>
        <p className="fz-body" style={{ color: C.dim }}>
          {protectedOn.length > 0
            ? <>Approver code required for: <strong style={{ color: C.textStrong }}>{protectedOn.join(', ')}</strong>.</>
            : 'No window asks for an approver code at the moment.'}
          {' '}Switching a protection on or off is done in <strong>Administration &gt; Security &gt; Two-Factor Authentication</strong>; switching one off needs your password and an approver's code.
        </p>
      </Panel>
    </div>
  );
};

const AlertSettingsSection: React.FC<{ accent: string; isAdmin: boolean }> = ({ accent, isAdmin }) => {
  const [data, setData] = useState<AlertSettingsData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sel, setSel] = useState<ChannelId | null>(null);
  const [testingDest, setTestingDest] = useState<string | null>(null);
  const [jiraTesting, setJiraTesting] = useState(false);
  const [jiraResult, setJiraResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<OnlineUser[] | null>(null);
  const [onlineError, setOnlineError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res: any = await apiService.get('/alert-settings');
      const d = res?.data ?? res;
      if (d && Array.isArray(d.groups)) { setData(d); setLoadError(''); }
      else setLoadError(res?.message || 'Could not load the notification settings.');
    } catch (e: any) {
      setLoadError(e?.message || 'Could not reach the server.');
    }
  }, []);

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const loadOnline = useCallback(async () => {
    try {
      const res: any = await apiService.get('/alert-settings/online');
      const d = res?.data ?? res;
      if (d && Array.isArray(d.users)) { setOnline(d.users); setOnlineError(''); }
      else setOnlineError(res?.message || 'Could not load who is online.');
    } catch (e: any) {
      setOnlineError(e?.message || 'Could not reach the server.');
    }
  }, []);

  // Refresh the online list every 30 seconds while the home view is showing.
  useEffect(() => {
    if (!isAdmin || sel) return undefined;
    void loadOnline();
    const timer = window.setInterval(() => { void loadOnline(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [isAdmin, sel, loadOnline]);

  const postOnline = async () => {
    setPosting(true);
    try {
      const res: any = await apiService.post('/alert-settings/online/post');
      const d = res?.data ?? res;
      message.success(`Posted to the channels that receive it (${d?.count ?? 0} online).`);
    } catch { message.error('Could not post the online list.'); }
    finally { setTimeout(() => setPosting(false), 3000); }
  };

  /** Saves one change straight away (these are shared server settings, not part of the page's Save). */
  const save = async (path: string, body: Record<string, unknown>, optimistic?: (d: AlertSettingsData) => AlertSettingsData) => {
    const before = data;
    if (optimistic && data) setData(optimistic(data));
    try {
      const res: any = await apiService.put(path, body);
      const d = res?.data ?? res;
      if (res?.success === false || !d || !Array.isArray(d.groups)) throw new Error(res?.message || res?.error || 'Save failed');
      setData(d);
    } catch (e: any) {
      setData(before);
      message.error(e?.message || 'Could not save that change.');
    }
  };

  const mapAlert = (key: string, patch: Partial<AlertItemData>) => (d: AlertSettingsData): AlertSettingsData => ({
    ...d, groups: d.groups.map((g) => ({ ...g, alerts: g.alerts.map((a) => (a.key === key ? { ...a, ...patch } : a)) })),
  });

  /** One alert, one channel. Switching on also clears any older global mute on that alert. */
  const toggleAlertFor = (key: string, dest: ChannelId, on: boolean) =>
    save(`/alert-settings/${key}`, on ? { [dest]: true, enabled: true } : { [dest]: false },
      mapAlert(key, on ? { [dest]: true, enabled: true } : { [dest]: false }));

  /** A whole group of alerts, for one channel only. */
  const toggleGroupFor = (id: string, dest: ChannelId, on: boolean) =>
    save(`/alert-settings/group/${id}`, { enabled: on, dest }, (d) => ({
      ...d, groups: d.groups.map((g) => (g.id === id
        ? { ...g, alerts: g.alerts.map((a) => ({ ...a, [dest]: on, ...(on ? { enabled: true } : {}) })) }
        : g)),
    }));

  const toggleMaster = (enabled: boolean) => save('/alert-settings/master', { enabled }, (d) => ({ ...d, master: enabled }));
  const toggleDest = (dest: ChannelId, enabled: boolean) =>
    save(`/alert-settings/dest.${dest}`, { enabled }, (d) => ({ ...d, [dest]: { ...d[dest], enabled } }));
  const toggleJira = (enabled: boolean) => save('/alert-settings/jira.create', { enabled }, (d) => ({ ...d, jira: { ...d.jira, enabled } }));

  const commitParam = (item: AlertItemData) => {
    const raw = drafts[item.key];
    if (raw === undefined || !item.param) return;
    const n = Number(raw);
    setDrafts((p) => { const { [item.key]: _drop, ...rest } = p; return rest; });
    if (!Number.isFinite(n) || raw.trim() === '' || n < item.param.min || n > item.param.max) {
      message.error(`${item.param.label} must be between ${item.param.min} and ${item.param.max}.`);
      return;
    }
    if (n !== item.param.value) void save(`/alert-settings/${item.key}`, { param: n });
  };

  const sendTest = async (dest: ChannelId) => {
    setTestingDest(dest);
    try {
      const res: any = await apiService.post(`/alert-settings/test/${dest}`);
      const d = res?.data ?? res;
      const name = dest === 'telegram' ? 'Telegram' : 'Discord';
      if (d?.queued > 0) message.success(`Test messages are on their way to ${name} (${d.queued} channel${d.queued === 1 ? '' : 's'}).`);
      else message.warning(`${name} is not configured on the server (see the .env file).`);
    } catch { message.error('Could not send the test messages.'); }
    finally { setTimeout(() => setTestingDest(null), 4000); }
  };

  const testJira = async () => {
    setJiraTesting(true);
    setJiraResult(null);
    try {
      const res: any = await apiService.post('/alert-settings/jira/test');
      const d = res?.data ?? res;
      setJiraResult({ ok: !!d?.ok, message: d?.message || 'No answer from the server.' });
    } catch { setJiraResult({ ok: false, message: 'Could not reach the server.' }); }
    finally { setJiraTesting(false); }
  };

  const smallButton = (disabled: boolean): React.CSSProperties => ({
    height: 32, border: `1px solid ${C.border}`, background: C.fill, color: C.text, opacity: disabled ? 0.5 : 1,
  });

  if (!isAdmin) {
    return (
      <Panel icon={<Bell size={16} />} tint="#38bdf8" title="Notifications" subtitle="Administrators only">
        <p className="fz-body" style={{ color: C.dim }}>Only an administrator can choose which alerts are sent and where.</p>
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel icon={<Bell size={16} />} tint="#38bdf8" title="Notifications" subtitle={loadError ? 'Could not load' : 'Loading…'}>
        {loadError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
            <span className="fz-body" style={{ color: C.red }}>{loadError}</span>
            <button onClick={load} className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest cursor-pointer" style={smallButton(false)}>Retry</button>
          </div>
        )}
      </Panel>
    );
  }

  const allAlerts = data.groups.flatMap((g) => g.alerts);
  const withLimits = allAlerts.filter((a) => a.param);
  const statusOf = (id: ChannelId) => {
    const ch = data[id];
    if (!ch.configured) return { text: 'Not configured', color: C.amber };
    if (!ch.enabled) return { text: 'Switched off', color: C.dimmer };
    return { text: 'Active', color: C.green };
  };

  // These are plain render functions (not components), so React keeps focus when a switch is pressed.
  const renderChannelCard = (def: (typeof CHANNEL_DEFS)[number]) => {
    const ch = data[def.id];
    const selected = sel === def.id;
    const status = statusOf(def.id);
    return (
      <div
        key={def.id}
        className="rounded-[20px] flex flex-col justify-between"
        style={{
          aspectRatio: '1 / 1', minHeight: 176, padding: 16,
          background: selected ? `color-mix(in srgb, ${def.tint} 12%, ${C.panel})` : C.fill,
          border: `2px solid ${selected ? def.tint : C.border}`,
          opacity: ch.enabled ? 1 : 0.78,
        }}
      >
        <button
          type="button"
          onClick={() => setSel(def.id)}
          aria-pressed={selected}
          aria-label={`Open ${def.name} settings`}
          className="text-left cursor-pointer flex flex-col gap-3"
          style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, color: 'inherit' }}
        >
          <span className="rounded-2xl flex items-center justify-center" style={{ width: 52, height: 52, background: def.gradient, color: '#fff' }}>
            <def.Icon size={26} />
          </span>
          <span>
            <span className="block font-black" style={{ fontSize: 19, color: C.textStrong }}>{def.name}</span>
            <span className="fz-small block mt-0.5" style={{ color: C.dim }}>{def.tagline}</span>
          </span>
          <span className="flex items-center gap-1.5 fz-small font-bold" style={{ color: status.color }}>
            <span className="block rounded-full" style={{ width: 8, height: 8, background: status.color }} />
            {status.text}
          </span>
        </button>
        <div className="flex items-center justify-between gap-2">
          <span className="fz-tiny font-black uppercase tracking-widest" style={{ color: selected ? def.tint : C.dimmer }}>
            Open settings ›
          </span>
          <Toggle on={ch.enabled} accent={def.tint} label={`Send alerts to ${def.name}`} onChange={(v) => toggleDest(def.id, v)} />
        </div>
      </div>
    );
  };

  const renderComingSoon = (c: (typeof COMING_SOON)[number]) => (
    <div
      key={c.id}
      aria-disabled="true"
      className="rounded-2xl flex items-center gap-3"
      style={{ padding: '10px 12px', background: C.fillSoft, border: `1px dashed ${C.border}`, opacity: 0.7 }}
    >
      <span className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 34, height: 34, background: c.gradient, color: '#fff', filter: 'grayscale(.35)' }}>
        <c.Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="fz-body font-bold block truncate" style={{ color: C.text }}>{c.name}</span>
        <span className="fz-tiny font-black uppercase tracking-widest block" style={{ color: C.dimmer }}>Coming soon</span>
      </span>
    </div>
  );

  const renderChannelPanel = (sel: ChannelId) => {
    const def = CHANNEL_DEFS.find((d) => d.id === sel)!;
    const ch = data[sel];
    const effective = (a: AlertItemData) => a.enabled && a[sel];
    const onCount = allAlerts.filter(effective).length;
    const status = statusOf(sel);
    const chMap: Record<string, boolean> | undefined = sel === 'discord' ? data.discord?.channels : data.telegram?.channels;
    const mapping = chMap ? Object.entries(chMap) : [];
    const noTopics = sel === 'telegram' && ch.configured && mapping.length > 0 && mapping.every(([, ok]) => !ok);
    return (
      <Panel
        icon={<def.Icon size={16} />} tint={def.tint} title={`${def.name} settings`}
        subtitle={`Choose which alerts are sent to ${def.name}. Nothing here affects the other channels.`}
        right={<Counter color={ch.enabled && data.master ? C.green : C.red}>{ch.enabled && data.master ? `${onCount} / ${allAlerts.length} alerts` : 'Off'}</Counter>}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
            <div>
              <span className="fz-body font-bold block" style={{ color: C.text }}>
                Connection: <span style={{ color: status.color }}>{status.text}</span>
              </span>
              <span className="fz-small block mt-0.5" style={{ color: C.dim }}>
                {sel === 'telegram'
                  ? (ch.configured ? 'Sends to the topics of your Telegram group.' : 'Add the bot token and chat id to the server .env file.')
                  : (ch.configured ? 'Sends to the Discord channels that have a webhook in the server .env file.' : 'Add a webhook URL per channel (DISCORD_WEBHOOK_…) to the server .env file. Nothing is sent until you do.')}
              </span>
              {ch.configured && mapping.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="fz-tiny font-black uppercase tracking-widest" style={{ color: C.dimmer }}>{sel === 'discord' ? 'Channels' : 'Topics'}</span>
                  {noTopics && <span className="fz-small" style={{ color: C.dim }}>none set up: everything goes to the group's General chat</span>}
                  {!noTopics && mapping.map(([name, ok]) => (
                    <span key={name} className="px-2 py-0.5 rounded-full fz-tiny font-bold"
                      style={{ background: `color-mix(in srgb, ${ok ? C.green : C.amber} 16%, transparent)`, color: ok ? C.green : C.amber }}>
                      #{name} {ok ? '✓' : '—'}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => sendTest(sel)}
                disabled={testingDest === sel || !ch.configured}
                className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest cursor-pointer"
                style={smallButton(testingDest === sel || !ch.configured)}
              >
                {testingDest === sel ? 'Sending…' : 'Send test'}
              </button>
              <Toggle on={ch.enabled} accent={def.tint} label={`Send alerts to ${def.name}`} onChange={(v) => toggleDest(sel, v)} />
            </div>
          </div>

          <div style={{ opacity: ch.enabled && data.master ? 1 : 0.5 }} className="space-y-4">
            {data.groups.map((g) => {
              const on = g.alerts.filter(effective).length;
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between gap-3 px-1 pb-2">
                    <div className="min-w-0">
                      <span className="fz-body font-black block" style={{ color: ALERT_GROUP_TINT[g.id] || accent }}>{g.label}</span>
                      <span className="fz-small block" style={{ color: C.dim }}>{g.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Counter color={on === g.alerts.length ? C.green : on === 0 ? C.red : C.amber}>{on} / {g.alerts.length}</Counter>
                      <Toggle on={on === g.alerts.length} accent={def.tint} label={`All ${g.label} alerts to ${def.name}`} onChange={(v) => toggleGroupFor(g.id, sel, v)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {g.alerts.map((a) => (
                      <div key={a.key} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ background: C.fill }}>
                        <div className="min-w-0">
                          <span className="fz-body font-bold block" style={{ color: C.text }}>{a.label}</span>
                          <span className="fz-small block mt-0.5" style={{ color: C.dim }}>{a.description}</span>
                        </div>
                        <Toggle on={effective(a)} accent={def.tint} label={`${a.label} to ${def.name}`} onChange={(v) => toggleAlertFor(a.key, sel, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    );
  };

  const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

  const renderOnlinePanel = () => (
    <Panel
      icon={<Bell size={16} />} tint="#34d399" title="Online now"
      subtitle="Everyone whose app is open and has signalled in the last few minutes"
      right={(
        <>
          <Counter color={online && online.length > 0 ? C.green : C.dimmer}>{online ? `${online.length} online` : '…'}</Counter>
          <button onClick={loadOnline} className="rounded-lg px-3 fz-tiny font-black uppercase tracking-widest cursor-pointer" style={smallButton(false)}>Refresh</button>
          <button onClick={postOnline} disabled={posting || !online} className="rounded-lg px-3 fz-tiny font-black uppercase tracking-widest cursor-pointer" style={smallButton(posting || !online)}>
            {posting ? 'Posting…' : 'Post to channels'}
          </button>
        </>
      )}
    >
      {onlineError && (
        <div className="px-4 py-3 rounded-xl fz-small font-semibold" style={{ background: C.fill, color: C.red }}>
          {onlineError} (the backend may need a restart)
        </div>
      )}
      {!onlineError && online && online.length === 0 && (
        <div className="px-4 py-3 rounded-xl fz-small" style={{ background: C.fill, color: C.dim }}>Nobody is online right now.</div>
      )}
      {online && online.length > 0 && (
        <div className="space-y-2">
          {online.map((u, i) => (
            <div key={`${u.username}-${u.host}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ background: C.fill }}>
              <div className="min-w-0">
                <span className="fz-body font-bold block" style={{ color: C.text }}>
                  <span className="inline-block rounded-full align-middle mr-2" style={{ width: 8, height: 8, background: C.green }} />
                  {u.username}
                  {u.role && <span className="fz-tiny font-black uppercase tracking-widest ml-2" style={{ color: C.dimmer }}>{u.role.toLowerCase()}</span>}
                </span>
                <span className="fz-small block mt-0.5" style={{ color: C.dim }}>
                  {[u.host, u.ip, u.mac && `MAC ${u.mac}`, u.version && `v${u.version}`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <span className="fz-small font-bold shrink-0" style={{ color: C.dim }}>online {fmtMinutes(u.minutes)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );

  const renderLimitsPanel = () => (
      <Panel icon={<Bell size={16} />} tint="#fbbf24" title="Alert limits" subtitle="These limits apply to every channel, so changing one here changes it everywhere">
        <div className="space-y-2.5">
          {withLimits.map((a) => (
            <div key={a.key} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ background: C.fill }}>
              <div className="min-w-0">
                <span className="fz-body font-bold block" style={{ color: C.text }}>{a.label}</span>
                <span className="fz-small block mt-0.5" style={{ color: C.dim }}>{a.description}</span>
              </div>
              <label className="flex items-center gap-2 fz-small shrink-0" style={{ color: C.dim }}>
                {a.param!.label}
                <input
                  type="number"
                  inputMode="numeric"
                  min={a.param!.min}
                  max={a.param!.max}
                  aria-label={`${a.label}: ${a.param!.label} (${a.param!.unit})`}
                  value={drafts[a.key] ?? String(a.param!.value)}
                  onChange={(e) => setDrafts((p) => ({ ...p, [a.key]: e.target.value }))}
                  onBlur={() => commitParam(a)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  className="rounded-lg px-2 text-right font-bold"
                  style={{ width: 64, height: 30, background: C.panel, border: `1px solid ${C.border}`, color: C.text }}
                />
                <span>{a.param!.unit}</span>
              </label>
            </div>
          ))}
        </div>
      </Panel>
  );

  // A channel is open: show EVERYTHING for that channel on its own page, with a way back.
  if (sel) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSel(null)}
          className="flex items-center gap-1.5 fz-small font-bold cursor-pointer"
          style={{ border: 'none', background: 'transparent', color: C.dim, padding: 0 }}
        >
          ‹ Back to Notifications
        </button>
        {renderChannelPanel(sel)}
        {renderLimitsPanel()}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        icon={<Bell size={16} />} tint="#38bdf8" title="Notifications"
        subtitle="Click a channel to open all of its settings. A society can use one, both or none."
        right={<Counter color={data.master ? C.green : C.red}>{data.master ? 'Alerts on' : 'All muted'}</Counter>}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
            <div>
              <span className="fz-body font-bold block" style={{ color: C.text }}>Send alerts</span>
              <span className="fz-small block mt-0.5" style={{ color: C.dim }}>
                Master switch for every channel. Off = nothing is sent anywhere. Muted alerts are dropped, never saved up for later.
              </span>
            </div>
            <Toggle on={data.master} accent={accent} label="Send alerts" onChange={toggleMaster} />
          </div>

          <div>
            <span className="fz-tiny font-black uppercase tracking-widest block mb-2" style={{ color: C.dimmer }}>Channels you can use now</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 220px))', gap: 14 }}>
              {CHANNEL_DEFS.map(renderChannelCard)}
            </div>
          </div>

          <div>
            <span className="fz-tiny font-black uppercase tracking-widest block mb-2" style={{ color: C.dimmer }}>Planned</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {COMING_SOON.map(renderComingSoon)}
            </div>
          </div>
        </div>
      </Panel>

      {renderOnlinePanel()}

      <Panel icon={<Bell size={16} />} tint="#2684ff" title="Jira" subtitle="Support Desk queries become Jira tickets">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
            <div>
              <span className="fz-body font-bold block" style={{ color: C.text }}>Create a Jira ticket for each query</span>
              <span className="fz-small block mt-0.5" style={{ color: C.dim }}>
                {data.jira.configured
                  ? `Tickets go to project ${data.jira.projectKey} on ${data.jira.site} as "${data.jira.issueType}". Off = queries are still saved here, with no ticket.`
                  : 'Jira is not configured on the server (.env). Queries are saved here until it is.'}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={testJira}
                disabled={jiraTesting || !data.jira.configured}
                className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest cursor-pointer"
                style={smallButton(jiraTesting || !data.jira.configured)}
              >
                {jiraTesting ? 'Testing…' : 'Test connection'}
              </button>
              <Toggle on={data.jira.enabled} accent={accent} label="Create a Jira ticket for each query" onChange={toggleJira} />
            </div>
          </div>
          {jiraResult && (
            <div className="px-4 py-3 rounded-xl fz-small font-semibold" role="status"
              style={{ background: C.fill, color: jiraResult.ok ? C.green : C.red }}>
              {jiraResult.ok ? '✓ ' : '✕ '}{jiraResult.message}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};

// --- License Section Component ---
const LicenseSection: React.FC<{ accent: string }> = ({ accent }) => {
  const { status, daysRemaining, graceDaysRemaining, message: licenseMsg, customerName, expiresAt, refresh } = useLicense();
  const [activateKey, setActivateKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');

  const formatKey = (value: string) => {
    // Full key: PWT0-XXXX-XXXX-XXXX-XXXX = 20 alphanum + 4 dashes = 24 chars
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleActivate = async () => {
    if (activateKey.length !== 24) {
      setActivateError('Enter a complete key: PWT0-XXXX-XXXX-XXXX-XXXX');
      return;
    }
    setActivating(true);
    setActivateError('');
    try {
      const res = await apiService.activateLicense(activateKey);
      if (res.success) {
        message.success('License activated!');
        setActivateKey('');
        await refresh();
      } else {
        setActivateError(res.message || res.error || 'Invalid key');
      }
    } catch {
      setActivateError('Cannot connect to server');
    } finally {
      setActivating(false);
    }
  };

  // Each status keeps its own tint so the card reads at a glance, the way the
  // light version did — just re-pitched for the dark panel.
  const statusConfig = {
    active:        { color: '#34d399', icon: <ShieldCheck size={16} />,    label: 'Active' },
    grace:         { color: '#fbbf24', icon: <AlertTriangle size={16} />,  label: 'Grace Period' },
    expired:       { color: '#ff453a', icon: <AlertTriangle size={16} />,  label: 'Expired' },
    not_activated: { color: '#8e8e93', icon: <KeyRound size={16} />,       label: 'Not Activated' },
    checking:      { color: '#8e8e93', icon: <Clock size={16} />,          label: 'Checking...' },
  } as const;

  const cfg = statusConfig[status] || statusConfig.checking;
  const [sr, sg, sb] = hexToRgb(cfg.color);

  return (
    <div className="space-y-5" style={{ maxWidth: 680 }}>
      {/* Status Card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: `rgba(${sr},${sg},${sb},.09)`, border: `1px solid rgba(${sr},${sg},${sb},.2)` }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-[10px]" style={{ background: C.panel, color: cfg.color }}>{cfg.icon}</div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.textStrong }}>License Status</h3>
            <span
              className="inline-block mt-1.5 px-2.5 py-0.5 fz-tiny font-black rounded-full uppercase tracking-widest"
              style={{ background: `rgba(${sr},${sg},${sb},.15)`, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {customerName && (
            <div>
              <span className="fz-tiny font-black uppercase tracking-widest block" style={{ color: C.dimmer }}>Customer</span>
              <span className="fz-body font-bold" style={{ color: C.text }}>{customerName}</span>
            </div>
          )}
          {expiresAt && (
            <div>
              <span className="fz-tiny font-black uppercase tracking-widest block" style={{ color: C.dimmer }}>Expires</span>
              <span className="fz-body font-bold" style={{ color: C.text }}>{new Date(expiresAt).toLocaleDateString()}</span>
            </div>
          )}
          {status === 'active' && (
            <div>
              <span className="fz-tiny font-black uppercase tracking-widest block" style={{ color: C.dimmer }}>Days Remaining</span>
              <span className="font-black text-lg" style={{ color: daysRemaining <= 30 ? C.amber : C.green }}>{daysRemaining}</span>
            </div>
          )}
          {status === 'grace' && (
            <div>
              <span className="fz-tiny font-black uppercase tracking-widest block" style={{ color: C.dimmer }}>Grace Days Left</span>
              <span className="font-black text-lg" style={{ color: C.red }}>{graceDaysRemaining}</span>
            </div>
          )}
        </div>

        {licenseMsg && (
          <p className="mt-4 fz-small rounded-lg px-3 py-2" style={{ color: C.dim, background: C.fill }}>{licenseMsg}</p>
        )}
      </div>

      {/* Activate / Renew */}
      <Panel
        icon={<KeyRound size={17} />}
        tint={accent}
        title={status === 'not_activated' ? 'Activate Software' : 'Renew License'}
        subtitle="Enter your license key"
      >
        <input
          value={activateKey}
          onChange={e => { setActivateKey(formatKey(e.target.value)); setActivateError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleActivate(); }}
          placeholder="PWT0-XXXX-XXXX-XXXX-XXXX"
          maxLength={24}
          className="w-full box-border px-3.5 rounded-[10px] outline-none font-mono"
          style={{
            height: 44, letterSpacing: '0.1em', fontSize: 14,
            border: `1px solid ${C.border}`, background: C.fill, color: C.text,
          }}
        />
        {activateError && <p className="fz-small font-bold mt-2" style={{ color: C.red }}>{activateError}</p>}
        <button
          onClick={handleActivate}
          disabled={activating || activateKey.length !== 24}
          className="w-full mt-3 rounded-[10px] border-0 font-bold cursor-pointer disabled:cursor-not-allowed"
          style={{
            height: 40, background: accent, color: '#fff',
            opacity: activating || activateKey.length !== 24 ? 0.45 : 1,
          }}
        >
          {activating ? 'Working…' : status === 'not_activated' ? 'Activate' : 'Apply New Key'}
        </button>
      </Panel>
    </div>
  );
};

// --- Main Component ---

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.theme);

  // State
  // The shared theme state (Redux) is the single source of truth for every
  // look-and-feel setting here. Local state only mirrors it, so what the
  // controls show is always what the app is using.
  const themeToSettings = (t: RootState['theme']): Partial<AppSettings> => ({
    themeMode: t.interfaceMode === 'dark' ? 'dark' : 'light',
    accentColor: t.accentColor,
    borderRadius: t.cornerRadius,
    fontSize: t.fontScale <= 0.9 ? 'small' : t.fontScale >= 1.2 ? 'large' : 'medium',
    density: t.density <= 0.9 ? 'compact' : 'comfortable',
    // Older profiles stored plain "Inter"; fall back to the first option so the picker always shows a selection.
    fontFamily: FONT_OPTIONS.some(f => f.value === t.fontFamily) ? t.fontFamily! : FONT_OPTIONS[0]!.value,
    backgroundType: t.backgroundType ?? 'solid',
    backgroundColor1: t.backgroundColor1 || '#ffffff',
    backgroundColor2: t.backgroundColor2 || '#000000',
    backgroundImage: t.backgroundImage || null,
    notifications: t.notifications !== false,
    soundEffects: t.soundEffects === true,
    showChatbot: t.showChatbot !== false,
  });

  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...defaultSettings,
    ...themeToSettings(theme),
    boldText: localStorage.getItem('lms-bold-text') === '1',
    dashboardBg: localStorage.getItem('lms-dashboard-bg') || '#f5f6fa',
  }));
  // Read straight from the shared state (not the mirrored form) so the palette
  // flips in the same render as the theme change.
  const isDark = theme.interfaceMode === 'dark';
  const palette = SETTINGS_PALETTES[isDark ? 'dark' : 'light'];
  const [typographyOffsets, setTypographyOffsets] = useState<TypographyOffsets>(readTypographyOffsets);

  const updateTypographyOffset = (role: keyof TypographyOffsets, value: number) => {
    const next = saveTypographyOffsets({ ...typographyOffsets, [role]: value });
    setTypographyOffsets(next);
  };

  useEffect(() => {
    const channel = new BroadcastChannel(TYPOGRAPHY_SYNC_CHANNEL);
    channel.onmessage = event => setTypographyOffsets(normalizeTypographyOffsets(event.data));
    return () => channel.close();
  }, []);

  const [activeTab, setActiveTab] = useState('appearance');
  const { user: authUser } = useAuth();
  const isAdmin = ['administrator', 'admin', 'system'].includes(String(authUser?.role || '').toLowerCase());
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(t);
  }, [justSaved]);
  const [navQuery, setNavQuery] = useState('');

  // Developer Mode State
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [, setAttempts] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const accent = settings.accentColor || '#6366f1';
  const loadingAnimation = useLoadingAnimation();
  const [ar, ag, ab] = hexToRgb(accent);
  const accentRgba = useCallback(
    (a: number) => `rgba(${ar},${ag},${ab},${a})`,
    [ar, ag, ab]
  );

  // Dashboard customisation state
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() => {
    const defaults = DEFAULT_WIDGET_CONFIG;
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('lms-dashboard-widgets') || '{}') };
    } catch { return defaults; }
  });

  const [bannerOpacity, setBannerOpacity] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('lms-fy-banner-opacity') || '78', 10);
    return isNaN(v) ? 78 : v;
  });

  const [enabledQaIds, setEnabledQaIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(QA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ENABLED_QA_IDS;
    } catch { return DEFAULT_ENABLED_QA_IDS; }
  });

  const toggleQaItem = useCallback((id: string) => {
    setEnabledQaIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(next));
      try { const bc = new BroadcastChannel(QA_BROADCAST_CHANNEL); bc.postMessage({ enabledIds: next }); bc.close(); } catch { }
      return next;
    });
  }, []);

  const broadcastDashboardConfig = useCallback((payload: object) => {
    try { const bc = new BroadcastChannel('lms_dashboard_config'); bc.postMessage(payload); bc.close(); } catch { }
  }, []);

  // Puts every dashboard card back where it started; the open dashboard hears the broadcast and redraws.
  const [layoutReset, setLayoutReset] = useState(false);
  const resetDashboardLayout = useCallback(() => {
    clearLayout();
    broadcastDashboardConfig({ resetLayout: true });
    setLayoutReset(true);
    setTimeout(() => setLayoutReset(false), 1800);
  }, [broadcastDashboardConfig]);

  const toggleWidget = useCallback((key: keyof typeof widgetConfig) => {
    setWidgetConfig(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('lms-dashboard-widgets', JSON.stringify(next));
      broadcastDashboardConfig({ widgets: next });
      return next;
    });
  }, [broadcastDashboardConfig]);

  const applyBannerOpacity = useCallback((v: number) => {
    setBannerOpacity(v);
    localStorage.setItem('lms-fy-banner-opacity', String(v));
    broadcastDashboardConfig({ bannerOpacity: v });
  }, [broadcastDashboardConfig]);

  // --- Effects ---

  useEffect(() => {
    const devModeEnabled = sessionStorage.getItem('developerModeEnabled');
    if (devModeEnabled === 'true') {
      setIsDeveloperMode(true);
    }
  }, []);

  useEffect(() => {
    // 1. Fetch latest settings from server ensures we display the "Truth"
    const fetchLatestSettings = async () => {
      try {
        const prefRes = await apiService.getUserPreferences();

        if (prefRes.success && prefRes.data) {
          // Only the shared theme state is updated; the effect below mirrors it
          // into this form. Null columns are skipped so they can't wipe a value.
          const remotePrefs = Object.fromEntries(
            Object.entries(prefRes.data).filter(([, v]) => v !== null && v !== undefined)
          );
          dispatch(setTheme(remotePrefs));
        }

      } catch (error) {
        console.error('Failed to load settings in SettingsPage', error);
      }
    };

    fetchLatestSettings();
  }, []); // Run ONCE on mount

  useEffect(() => {
    // 2. Mirror the shared theme state (server load, other windows, or this form) into the controls
    setSettings(prev => ({ ...prev, ...themeToSettings(theme) }));
  }, [theme]);

  // Every appearance/behaviour control goes through here: it updates the shared
  // theme state (which applies it instantly in this window) and tells the other
  // open windows. Save Changes then only has to persist the result to the server.
  const applyTheme = useCallback((patch: Partial<RootState['theme']>) => {
    dispatch(setTheme(patch));
    try { window.electronAPI?.send?.('update-settings', patch); } catch { }
    try { const bc = new BroadcastChannel('theme_sync'); bc.postMessage(patch); bc.close(); } catch { }
  }, [dispatch]);

  // The PIN field is inside a plain overlay now (not an antd Modal), so it has
  // to claim focus itself when the dialog opens.
  useEffect(() => {
    if (showPinDialog) {
      const t = setTimeout(() => pinInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [showPinDialog]);

  // Escape closes the PIN dialog, matching what the Modal used to give us.
  useEffect(() => {
    if (!showPinDialog) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPinDialog(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPinDialog]);

  // --- Handlers ---

  const handleDeveloperModeToggle = useCallback(() => {
    if (isDeveloperMode) {
      setIsDeveloperMode(false);
      sessionStorage.removeItem('developerModeEnabled');
      setActiveTab('appearance');
      message.info('Developer mode deactivated');
    } else {
      setShowPinDialog(true);
      setPinInput('');
      setPinError('');
    }
  }, [isDeveloperMode]);

  const handlePinSubmit = useCallback(async () => {
    const lockedUntil = readPinLockUntil();
    if (lockedUntil > Date.now()) {
      const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
      setPinError(`Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
      setPinInput('');
      return;
    }
    const pinOk = (await sha256Hex(pinInput)) === DEVELOPER_PIN_SHA256;
    if (pinOk) {
      clearPinFailures();
      setIsDeveloperMode(true);
      sessionStorage.setItem('developerModeEnabled', 'true');
      setShowPinDialog(false);
      setPinInput('');
      setPinError('');
      setAttempts(0);
      message.success('Developer mode activated');
      setActiveTab('developer');
    } else {
      const newAttempts = recordPinFailure();
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setPinError(`Too many failed attempts. Locked for ${PIN_LOCK_MINUTES} minutes.`);
        setTimeout(() => setShowPinDialog(false), 1500);
        setPinInput('');
      } else {
        setPinError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        setPinInput('');
      }
    }
  }, [pinInput]);

  const handleSaveWithAnimation = useCallback(async () => {
    setIsSaving(true);

    const userPreferences = {
      interfaceMode: settings.themeMode,
      accentColor: settings.accentColor,
      fontScale: settings.fontSize === 'small' ? 0.9 : settings.fontSize === 'large' ? 1.2 : 1.0,
      density: settings.density === 'compact' ? 0.8 : 1.0,
      cornerRadius: settings.borderRadius,
      fontFamily: settings.fontFamily,
      backgroundType: settings.backgroundType,
      backgroundColor1: settings.backgroundColor1,
      backgroundColor2: settings.backgroundColor2,
      backgroundImage: settings.backgroundImage,
      textColor: settings.textColor,
      notifications: settings.notifications,
      soundEffects: settings.soundEffects,
      showChatbot: settings.showChatbot,
    };

    try {
      const prefRes = await apiService.updateUserPreferences(userPreferences);

      if (prefRes.success) {
        setJustSaved(true);
        const CheckCircle2 = ({ className }: { className?: string }) => (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
        );
        message.success({ content: 'Configuration saved & broadcasted', icon: <CheckCircle2 className="text-emerald-500" /> });
      } else {
        message.error('Failed to persist settings to server');
      }
    } catch (error) {
      message.error('Connection error while saving');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        message.error('Please choose an image file.');
        e.target.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        message.error('Image is too large. Maximum size is 2 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        // Make sure the data actually decodes as an image before persisting it.
        const probe = new Image();
        probe.onload = () => applyTheme({ backgroundImage: imageUrl, backgroundType: 'image' });
        probe.onerror = () => message.error('That file could not be read as an image.');
        probe.src = imageUrl;
      };
      reader.onerror = () => message.error('Failed to read the selected file.');
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  }, [applyTheme]);

  const openWindow = useCallback((url: string, title: string, width: number = 1200, height: number = 850) => {
    if (window.electronAPI?.openNewWindow) {
      window.electronAPI.openNewWindow(url);
    } else {
      window.open(`/#${url}`, title, `width=${width},height=${height},scrollbars=yes,resizable=yes`);
    }
  }, []);

  const resetWindowStates = useCallback(() => {
    if (window.electronAPI?.send) {
      window.electronAPI.send('reset-window-states');
      message.success('Window layouts reset to default');
    } else {
      message.warning('Only available in desktop app');
    }
  }, []);

  // --- Sidebar ---

  // Icon tiles carry the gradient the design gives each section.
  const NAV_ITEMS = useMemo(() => ([
    { key: 'appearance', label: 'Appearance',      Icon: Palette,   gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
    { key: 'dashboard',  label: 'Dashboard',       Icon: BarChart2, gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
    { key: 'system',     label: 'System & Window', Icon: Monitor,   gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    { key: 'alerts',     label: 'Notifications',   Icon: Bell,      gradient: 'linear-gradient(135deg,#229ed9,#4fc3f7)', adminOnly: true },
    { key: 'approvers',  label: 'Approvers',       Icon: ShieldCheck, gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', adminOnly: true },
    { key: 'developer',  label: 'Developer',       Icon: Code,      gradient: 'linear-gradient(135deg,#3f3f46,#71717a)', devOnly: true },
    { key: 'license',    label: 'License',         Icon: KeyRound,  gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', afterDivider: true },
  ]), []);

  // The search box narrows the section list by title and by the settings each
  // section contains, so "opacity" or "chatbot" lands on the right tab.
  const visibleNav = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    return NAV_ITEMS
      .filter(item => !item.devOnly || isDeveloperMode)
      .filter(item => !item.adminOnly || isAdmin)
      .filter(item => {
        if (!q) return true;
        const meta = TAB_META[item.key];
        return item.label.toLowerCase().includes(q)
          || (meta ? `${meta.title} ${meta.subtitle} ${meta.keywords}`.toLowerCase().includes(q) : false);
      });
  }, [NAV_ITEMS, isDeveloperMode, isAdmin, navQuery]);

  const navButtonStyle = (key: string): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
    padding: '8px 10px',
    border: 'none',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    cursor: 'pointer',
    background: activeTab === key ? accentRgba(0.16) : 'transparent',
    color: activeTab === key ? C.textStrong : C.dim,
  });

  // --- Render Sections ---

  const renderAppearance = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Theme & Accent */}
      <Panel icon={<Palette size={17} />} tint="#818cf8" title="Theme & Colors" subtitle="Global palette settings">
        <div className="space-y-5">
          {/* Theme Mode */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Interface Mode</label>
            <div className="relative flex p-[3px] rounded-[9px]" style={{ background: C.fill }}>
              {/* Sliding pill: glides between Light and Dark instead of swapping backgrounds. */}
              <span
                aria-hidden="true"
                className="settings-seg-thumb absolute rounded-[7px]"
                style={{
                  top: 3, bottom: 3, left: 3, width: 'calc(50% - 3px)',
                  background: C.panel, boxShadow: `0 1px 3px ${C.border}`,
                  transform: `translateX(${isDark ? '100%' : '0'})`,
                }}
              />
              {(['light', 'dark'] as const).map(mode => {
                const active = theme.interfaceMode === mode;
                const ModeIcon = mode === 'light' ? Sun : Moon;
                return (
                  <button
                    key={mode}
                    onClick={(e) => {
                      if (theme.interfaceMode === mode) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      runThemeTransition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, () => {
                        flushSync(() => applyTheme({ interfaceMode: mode }));
                        document.documentElement.classList.toggle('dark', mode === 'dark');
                      });
                    }}
                    className="relative z-[1] flex-1 py-1.5 rounded-[7px] border-0 bg-transparent fz-small font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ color: active ? C.textStrong : C.dim }}
                  >
                    <ModeIcon size={13} />
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Accent Color</label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {ACCENT_PRESETS.map(color => {
                const selected = accent.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    aria-label={`Accent ${color}`}
                    onClick={() => applyTheme({ accentColor: color })}
                    className="w-7 h-7 rounded-full border-0 cursor-pointer flex items-center justify-center"
                    style={{ background: color, boxShadow: selected ? `0 0 0 2px ${C.panel}, 0 0 0 4px ${color}` : 'none' }}
                  >
                    {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </button>
                );
              })}
              <div className="w-px h-6 mx-0.5" style={{ background: C.divider }} />
              <ColorWell
                value={accent}
                ariaLabel="Custom accent colour"
                size={28}
                onChange={(hex) => applyTheme({ accentColor: hex })}
              />
            </div>
          </div>

        </div>
      </Panel>

      {/* Layout & Type */}
      <Panel icon={<Type size={17} />} tint="#f472b6" title="Layout & Type" subtitle="Density and scaling">
        <div className="space-y-5">
          {/* Text Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="fz-small font-black uppercase tracking-widest" style={fieldLabel}>Text Size</label>
              <span
                className="fz-tiny font-black uppercase px-2 py-0.5 rounded-full"
                style={{ background: accentRgba(0.15), color: accent }}
              >
                {settings.fontSize}
              </span>
            </div>
            <Range
              ariaLabel="Text size"
              format={v => ['Small', 'Medium', 'Large'][v] ?? ''}
              min={0}
              max={2}
              value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
              accent={accent}
              onChange={(v) => {
                applyTheme({ fontScale: [0.9, 1.0, 1.2][v] ?? 1.0 });
              }}
            />
            <div className="flex justify-between fz-tiny font-black" style={{ color: C.dim }}>
              <span>A</span><span>AA</span><span>AAA</span>
            </div>
          </div>

          <details className="settings-type-advanced rounded-[10px]" style={{ border: `1px solid ${C.border}`, background: C.fillSoft }}>
            <summary className="cursor-pointer px-3 py-2.5 font-bold" style={{ color: C.textStrong }}>
              Advanced text sizes
            </summary>
            <div className="px-3 pb-3 space-y-4" style={{ borderTop: `1px solid ${C.divider}` }}>
              <p className="fz-small pt-3" style={{ color: C.dim }}>Fine-tune Settings text. Other windows can adopt these same roles after you approve the result.</p>
              {([
                { role: 'heading', title: 'Headings', hint: 'Page, section and panel titles' },
                { role: 'label', title: 'Labels & fields', hint: 'Control labels, input text and placeholders' },
                { role: 'body', title: 'Supporting text', hint: 'Descriptions and helper text' },
              ] as const).map(({ role, title, hint }) => (
                <div key={role} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`settings-type-${role}`} className="font-semibold" style={{ color: C.textStrong }}>{title}</label>
                    <span className="fz-small tabular-nums" style={{ color: C.dim }}>{typographyOffsets[role] > 0 ? '+' : ''}{typographyOffsets[role]} px</span>
                  </div>
                  <p className="fz-small" style={{ color: C.dim }}>{hint}</p>
                  <Range
                    id={`settings-type-${role}`}
                    ariaLabel={title}
                    min={-2}
                    max={4}
                    value={typographyOffsets[role]}
                    onChange={v => updateTypographyOffset(role, v)}
                    accent={accent}
                    format={v => `${v > 0 ? '+' : ''}${v} px`}
                  />
                </div>
              ))}
              <div className="settings-type-preview rounded-lg px-3 py-2.5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="settings-panel-title font-bold" style={{ color: C.textStrong }}>Preview heading</div>
                <label className="block mt-2" style={{ color: C.dim }}>Sample field</label>
                <input readOnly placeholder="Sample placeholder" aria-label="Typography preview" className="w-full rounded-md px-2 py-1 mt-1" style={{ background: C.fillSoft, border: `1px solid ${C.border}`, color: C.textStrong }} />
                <p className="fz-body mt-2" style={{ color: C.dim }}>Supporting information stays easy to read.</p>
              </div>
              <button
                type="button"
                onClick={() => setTypographyOffsets(saveTypographyOffsets(DEFAULT_TYPOGRAPHY_OFFSETS))}
                className="rounded-lg px-3 py-1.5 font-semibold cursor-pointer"
                style={{ color: C.textStrong, background: C.fill, border: `1px solid ${C.border}` }}
              >
                Reset advanced sizes
              </button>
            </div>
          </details>

          {/* Font Style */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Font Style</label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map(font => {
                const selected = settings.fontFamily === font.value;
                return (
                  <div
                    key={font.label}
                    onClick={() => applyTheme({ fontFamily: font.value })}
                    className="settings-select cursor-pointer rounded-[10px] px-3 py-2.5"
                    style={{
                      border: `1px solid ${selected ? accent : C.border}`,
                      background: selected ? accentRgba(0.1) : C.fillSoft,
                      boxShadow: selected ? `0 0 0 1px ${accent}` : 'none',
                    }}
                  >
                    {/* Previewed in its own face. The `.font-face-preview` rule in
                        input.css is what lets this beat the global !important
                        font-family — same trick the .font-mono override uses. */}
                    <div
                      className="fz-body font-bold leading-tight font-face-preview"
                      style={{ color: C.text, ['--preview-font' as any]: font.value }}
                    >
                      {font.label}
                    </div>
                    <div className="fz-small mt-0.5" style={{ color: C.dim }}>{font.hint}</div>
                    <div
                      className="fz-caption mt-1 truncate font-face-preview"
                      style={{ color: C.dimmer, ['--preview-font' as any]: font.value }}
                    >
                      Member 1043 · ₹ 24,850.00
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bold Text */}
          <div className="flex items-center justify-between">
            <div>
              <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Bold Text</label>
              <p className="fz-small mt-0.5" style={{ color: C.dim }}>Make all labelled text heavier</p>
            </div>
            <Toggle
              on={settings.boldText}
              accent={accent}
              label="Bold text"
              onChange={(v) => {
                setSettings(prev => ({ ...prev, boldText: v }));
                document.documentElement.classList.toggle('bold-text', v);
                localStorage.setItem('lms-bold-text', v ? '1' : '0');
                try { const bc = new BroadcastChannel('lms_bold_text'); bc.postMessage({ boldText: v }); bc.close(); } catch { }
              }}
            />
          </div>

          {/* Soft Shadows */}
          <div className="flex items-center justify-between">
            <div>
              <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Soft Shadows</label>
              <p className="fz-small mt-0.5" style={{ color: C.dim }}>Subtle depth on cards, buttons and pop-ups. Turn off for maximum speed on older PCs.</p>
            </div>
            <Toggle
              on={theme.shadows !== false}
              accent={accent}
              label="Soft shadows"
              onChange={(v) => applyTheme({ shadows: v })}
            />
          </div>

          {/* Header Style */}
          <div className="space-y-2">
            <div>
              <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Header Style</label>
              <p className="fz-small mt-0.5" style={{ color: C.dim }}>A soft decorative background behind each window's title bar.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {([
                { id: 'none', label: 'None' },
                { id: 'waves', label: 'Soft waves' },
                { id: 'blobs', label: 'Blob shapes' },
                { id: 'mesh', label: 'Mesh gradient' },
              ] as const).map(opt => {
                const selected = (theme.headerStyle ?? 'waves') === opt.id;
                const fill = accent;
                return (
                  <div
                    key={opt.id}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => applyTheme({ headerStyle: opt.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTheme({ headerStyle: opt.id }); } }}
                    className="settings-select cursor-pointer rounded-[10px] p-3 flex flex-col items-center gap-2"
                    style={{
                      border: `1px solid ${selected ? accent : C.border}`,
                      background: selected ? accentRgba(0.1) : C.fillSoft,
                    }}
                  >
                    <div className="w-full rounded-md overflow-hidden relative" style={{ background: C.fill, height: 38 }}>
                      {opt.id === 'waves' && (
                        <svg viewBox="0 0 120 38" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                          <path d="M0 28 C20 12 42 12 64 26 S100 38 120 22 L120 38 L0 38Z" fill={fill} opacity="0.28" />
                          <path d="M0 35 C25 32 50 8 78 11 S110 22 120 15 L120 38 L0 38Z" fill={fill} opacity="0.2" />
                        </svg>
                      )}
                      {opt.id === 'blobs' && (
                        <svg viewBox="0 0 120 38" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                          <path d="M18 38 C26 35 38 12 52 5 C64 -1 76 9 86 25 C91 33 99 37 106 38Z" fill={fill} opacity="0.3" />
                        </svg>
                      )}
                      {opt.id === 'mesh' && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `radial-gradient(70% 140% at 12% 110%, ${fill}55 0%, transparent 70%), radial-gradient(55% 130% at 80% -20%, ${fill}38 0%, transparent 70%)`,
                          }}
                        />
                      )}
                    </div>
                    <span className="fz-small font-bold uppercase tracking-wider" style={{ color: C.text }}>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Density Toggle */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Layout Density</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['compact', 'comfortable'] as const).map(d => {
                const selected = settings.density === d;
                return (
                  <div
                    key={d}
                    onClick={() => applyTheme({ density: d === 'compact' ? 0.8 : 1.0 })}
                    className="settings-select cursor-pointer rounded-[10px] p-3 flex flex-col items-center gap-2"
                    style={{
                      border: `1px solid ${selected ? accent : C.border}`,
                      background: selected ? accentRgba(0.1) : C.fillSoft,
                    }}
                  >
                    <div
                      className="w-full rounded-md"
                      style={{ background: C.fill, padding: d === 'compact' ? 5 : 9 }}
                    >
                      <div className="h-[5px] w-2/3 rounded-full mb-1.5" style={{ background: C.dim }} />
                      <div className="h-[5px] w-full rounded-full" style={{ background: C.divider }} />
                    </div>
                    <span className="fz-small font-bold uppercase tracking-wider" style={{ color: C.text }}>{d}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>
              Corner Radius: {settings.borderRadius}px
            </label>
            <Range
              ariaLabel="Corner radius"
              format={v => `${v}px`}
              min={0}
              max={16}
              value={settings.borderRadius}
              accent={accent}
              onChange={(v) => applyTheme({ cornerRadius: v })}
            />
          </div>
        </div>
      </Panel>

      {/* Background Config */}
      <div className="lg:col-span-2">
        <Panel icon={<ImageIcon size={17} />} tint="#34d399" title="Background" subtitle="Canvas appearance">
          {/* Dark mode keeps its own canvas so the navbar and toolbars stay
              readable, which means these controls have no visible effect while
              it is on. Say so rather than letting them look broken. */}
          {settings.themeMode === 'dark' && (
            <div
              className="mb-4 px-3.5 py-2.5 rounded-[9px]"
              style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)' }}
            >
              <p className="fz-caption font-bold" style={{ color: C.amber }}>
                Dark mode uses its own canvas colour — these background settings apply in Light mode.
              </p>
            </div>
          )}

          {/* Background Mode */}
          <div className="flex gap-2 mb-4" style={{ maxWidth: 420 }}>
            {(['solid', 'gradient', 'image'] as const).map(mode => {
              const selected = settings.backgroundType === mode;
              return (
                <button
                  key={mode}
                  onClick={() => applyTheme({ backgroundType: mode })}
                  className="flex-1 py-2 rounded-lg fz-small font-bold uppercase tracking-widest cursor-pointer"
                  style={
                    selected
                      ? { background: C.green, color: '#04140d', border: 'none' }
                      : { background: C.fill, color: C.dim, border: `1px solid ${C.border}` }
                  }
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Solid/Gradient Controls */}
          {settings.backgroundType !== 'image' && (
            <div className="space-y-3">
              <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>
                {settings.backgroundType === 'gradient' ? 'Colors' : 'Color Selection'}
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {BG_PRESETS.map(color => (
                  <button
                    key={color}
                    aria-label={`Background ${color}`}
                    onClick={() => applyTheme({ backgroundColor1: color })}
                    className="border-0 cursor-pointer"
                    style={{
                      width: 24, height: 24, borderRadius: 6, background: color,
                      boxShadow: settings.backgroundColor1 === color ? `0 0 0 2px ${C.green}` : `0 0 0 1px ${C.border}`,
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-3.5 items-center">
                <ColorWell
                  value={settings.backgroundColor1}
                  ariaLabel="Background colour"
                  onChange={(hex) => applyTheme({ backgroundColor1: hex })}
                />
                {settings.backgroundType === 'gradient' && (
                  <>
                    <span className="fz-body" style={{ color: C.dimmer }}>to</span>
                    <ColorWell
                      value={settings.backgroundColor2}
                      ariaLabel="Second background colour"
                      onChange={(hex) => applyTheme({ backgroundColor2: hex })}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Image Controls */}
          {settings.backgroundType === 'image' && (
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[9px] fz-small font-bold flex items-center gap-2 px-4 cursor-pointer"
                  style={{ height: 34, border: `1px solid ${C.border}`, background: C.fill, color: C.text }}
                >
                  <UploadCloud size={13} /> Upload Image
                </button>
                {/* Thumbnail of what was actually picked — the old build showed a
                    stray "Preview Text" chip here instead of the image. */}
                {settings.backgroundImage && (
                  <div
                    className="rounded-lg"
                    style={{
                      width: 120, height: 64,
                      backgroundImage: `url(${settings.backgroundImage})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      border: `1px solid ${C.border}`,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const BG_OPTIONS = [
      { value: '#f5f6fa', label: 'Slate',   preview: '#f5f6fa' },
      { value: '#fefef4', label: 'Cream',   preview: '#fefef4' },
      { value: '#ffffff', label: 'White',   preview: '#ffffff' },
      { value: '#f0f4ff', label: 'Blue',    preview: '#f0f4ff' },
      { value: '#f0fff4', label: 'Mint',    preview: '#f0fff4' },
      { value: '#fff8f0', label: 'Peach',   preview: '#fff8f0' },
      { value: '#1e1b4b', label: 'Dark',    preview: '#1e1b4b' },
      { value: '#0f172a', label: 'Night',   preview: '#0f172a' },
    ];

    const applyDashboardBg = (color: string) => {
      setSettings(prev => ({ ...prev, dashboardBg: color }));
      localStorage.setItem('lms-dashboard-bg', color);
      try { const bc = new BroadcastChannel('lms_dashboard_bg'); bc.postMessage({ dashboardBg: color }); bc.close(); } catch { }
    };

    const WIDGET_DEFS = [
      { key: 'fyBanner'     as const, label: 'FY Indicator',      desc: 'Financial year banner with progress',  Icon: Calendar },
      { key: 'quickActions' as const, label: 'Quick Actions',     desc: 'Configurable one-click shortcut buttons', Icon: Zap },
      { key: 'noticeBoard'  as const, label: 'Notice Board',      desc: 'Admin notices & sticky notes',          Icon: Bell },
      { key: 'shortcuts'    as const, label: 'Keyboard Shortcuts',desc: 'Hotkey reference panel',                Icon: Command },
      { key: 'activeMembers'        as const, label: 'Active Members',        desc: 'Current active member count',        Icon: Users },
      { key: 'sanctionedLoans'      as const, label: 'Sanctioned Loans',      desc: 'Pending disbursal, by loan type',    Icon: Landmark },
      { key: 'monthEndOutstanding'  as const, label: 'Loan Outstanding',      desc: 'This month’s regular vs emergency split', Icon: TrendingUp },
      { key: 'balanceDistribution' as const, label: 'Balance Distribution', desc: 'Members grouped by net balance (ring chart)', Icon: PiggyBank },
      { key: 'pendingVouchers'     as const, label: 'Pending Vouchers',     desc: 'Vouchers waiting to be passed',      Icon: CheckSquare },
      { key: 'cashPosition'        as const, label: 'Cash Position',        desc: 'Today’s cash book with a 7-day trend', Icon: Wallet },
      { key: 'dayEndStatus'        as const, label: 'Day-End Status',       desc: 'Last open day and whether it is closed', Icon: Clock },
      { key: 'demandRecovery'      as const, label: 'Demand vs Recovery',   desc: 'This month’s demand posted to the ledger (gauge)', Icon: Scale },
      { key: 'depositsSummary'     as const, label: 'Deposits Summary',     desc: 'Fixed & recurring, savings and compulsory (ring chart)', Icon: Banknote },
      { key: 'upcomingMaturities'  as const, label: 'Upcoming Maturities',  desc: 'Deposits maturing this month (timeline)', Icon: Calendar },
      { key: 'loanApplications'    as const, label: 'Loan Applications',    desc: 'Pending → sanctioned → disbursed steps', Icon: FileText },
      { key: 'overdueLoans'        as const, label: 'Overdue Loans',        desc: 'Defaulters by time since last payment (ring chart)', Icon: AlertTriangle },
      { key: 'retiringMembers'     as const, label: 'Retiring Members',     desc: 'Members retiring in 6 months, with loan balance', Icon: Users },
      { key: 'newMembers'          as const, label: 'New Members',          desc: 'Joined this month vs last month',    Icon: Star },
    ];

    const bannerBgAlpha = (bannerOpacity / 100).toFixed(2);
    const bannerPreviewStyle: React.CSSProperties = {
      backdropFilter: 'blur(12px)',
      background: `rgba(15,23,42,${bannerBgAlpha})`,
      border: '1px solid rgba(255,255,255,0.10)',
    };

    const categories = Array.from(new Set(ALL_QUICK_ACTION_DEFS.map(d => d.category)));

    return (
      <div className="space-y-5">

        {/* ── Widget Visibility ─────────────────────────────────────── */}
        <Panel
          icon={<LayoutGrid size={16} />}
          tint="#818cf8"
          title="Dashboard Widgets"
          subtitle="Choose which panels are visible on your dashboard"
          right={<Counter>{Object.values(widgetConfig).filter(Boolean).length} / {WIDGET_DEFS.length} on</Counter>}
        >
          <div className="grid grid-cols-2 gap-2.5">
            {WIDGET_DEFS.map(({ key, label, desc, Icon }, i) => {
              const isOn = widgetConfig[key];
              const color = ACCENT_PRESETS[i % ACCENT_PRESETS.length]!;
              return (
                <div
                  key={key}
                  onClick={() => toggleWidget(key)}
                  className="settings-select cursor-pointer rounded-xl p-3 flex items-center gap-3"
                  style={
                    isOn
                      ? { border: `1px solid ${color}66`, background: `${color}1a` }
                      : { border: `1px solid ${C.border}`, background: C.fillSoft, opacity: 0.7 }
                  }
                >
                  <div
                    className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: isOn ? `${color}33` : C.fill, color: isOn ? color : C.dimmer }}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="fz-tiny font-black uppercase tracking-wide leading-none" style={{ color: isOn ? C.textStrong : C.dim }}>{label}</p>
                    <p className="fz-tiny mt-1 truncate" style={{ color: C.dimmer }}>{desc}</p>
                  </div>
                  <div
                    className="settings-track relative shrink-0"
                    style={{ width: 34, height: 19, borderRadius: 10, background: isOn ? color : C.border }}
                  >
                    <span
                      className="absolute block rounded-full settings-knob"
                      style={{ width: 15, height: 15, top: 2, left: 2, transform: `translateX(${isOn ? 15 : 0}px)`, background: '#fff' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ── Dashboard Layout ──────────────────────────────────────── */}
        <Panel
          icon={<LayoutGrid size={16} />}
          tint="#60a5fa"
          title="Dashboard Layout"
          subtitle="Arrange the cards on the dashboard itself; reset them here"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
            <div className="min-w-0">
              <span className="fz-body font-bold block" style={{ color: C.text }}>Reset Card Layout</span>
              <span className="fz-small block mt-0.5" style={{ color: C.dim }}>
                On the dashboard, drag the bar at the top of a card to move it, drag the edge between cards to resize, and double-click an edge to reset it. This puts every card back in its original place and size.
              </span>
            </div>
            <button
              onClick={resetDashboardLayout}
              className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer shrink-0"
              style={{ height: 32, border: `1px solid ${C.border}`, background: C.fill, color: C.text }}
            >
              {layoutReset ? <><Check size={12} strokeWidth={3} /> Layout reset</> : <><RotateCcw size={12} /> Reset Layout</>}
            </button>
          </div>
        </Panel>

        {/* ── Quick Actions Configuration ───────────────────────────── */}
        <Panel
          icon={<Zap size={16} />}
          tint="#34d399"
          title="Quick Actions Bar"
          subtitle="Choose which windows appear in the dashboard quick actions"
          right={
            <>
              <Counter>{enabledQaIds.length} / {ALL_QUICK_ACTION_DEFS.length} enabled</Counter>
              {enabledQaIds.length !== DEFAULT_ENABLED_QA_IDS.length && (
                <button
                  onClick={() => {
                    setEnabledQaIds(DEFAULT_ENABLED_QA_IDS);
                    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED_QA_IDS));
                    try { const bc = new BroadcastChannel(QA_BROADCAST_CHANNEL); bc.postMessage({ enabledIds: DEFAULT_ENABLED_QA_IDS }); bc.close(); } catch { }
                  }}
                  className="px-2.5 py-1 fz-mini font-black uppercase tracking-widest rounded-lg cursor-pointer"
                  style={{ color: C.dim, border: `1px solid ${C.border}`, background: 'transparent' }}
                >
                  Reset
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {categories.map(cat => {
              const items = ALL_QUICK_ACTION_DEFS.filter(d => d.category === cat);
              const enabledInCat = items.filter(d => enabledQaIds.includes(d.id)).length;
              const color = QA_CATEGORY_COLOR[cat] ?? '#6366f1';
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="fz-tiny font-black uppercase tracking-widest" style={{ color }}>{cat}</span>
                    <div className="flex-1 h-px" style={{ background: C.divider }} />
                    <span className="fz-mini" style={{ color: C.dimmer }}>{enabledInCat}/{items.length}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {items.map((item: QuickActionDef) => {
                      const isOn = enabledQaIds.includes(item.id);
                      const IconComp = QA_ICON_MAP[item.iconName] ?? Zap;
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleQaItem(item.id)}
                          className="settings-select cursor-pointer rounded-[10px] px-1.5 py-2.5 flex flex-col items-center gap-1.5"
                          style={
                            isOn
                              ? { border: `1px solid ${color}66`, background: `${color}1a` }
                              : { border: `1px solid ${C.border}`, background: C.fillSoft, opacity: 0.7 }
                          }
                        >
                          <div
                            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center"
                            style={{ background: isOn ? `${color}33` : C.fill, color: isOn ? color : C.dimmer }}
                          >
                            <IconComp size={13} />
                          </div>
                          <span
                            className="fz-micro font-black uppercase tracking-tight text-center leading-tight"
                            style={{ color: isOn ? '#e5e5ea' : C.dimmer }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ── FY Banner Transparency ────────────────────────────────── */}
        <Panel
          icon={<Layers size={16} />}
          tint="#a78bfa"
          title="FY Banner Transparency"
          subtitle="Control how opaque the glass banner appears"
          right={
            <Counter color={bannerOpacity === 0 ? C.red : C.green}>
              {bannerOpacity === 0 ? 'Invisible' : bannerOpacity === 100 ? 'Solid' : `${bannerOpacity}% opaque`}
            </Counter>
          }
        >
          <div className="space-y-4">
            {/* Quick presets */}
            <div className="flex gap-2">
              {[
                { label: 'Hidden', value: 0 },
                { label: 'Ghost', value: 20 },
                { label: 'Glass', value: 55 },
                { label: 'Default', value: 78 },
                { label: 'Solid', value: 100 },
              ].map(p => {
                const selected = bannerOpacity === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => applyBannerOpacity(p.value)}
                    className="flex-1 py-1.5 rounded-lg fz-tiny font-black uppercase tracking-widest cursor-pointer"
                    style={
                      selected
                        ? { background: accent, color: '#fff', border: 'none' }
                        : { background: C.fill, color: C.dim, border: `1px solid ${C.border}` }
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="fz-tiny font-black uppercase tracking-widest flex items-center gap-1" style={{ color: C.dimmer }}>
                  <EyeOff size={10} /> 0% — Invisible
                </span>
                <span className="fz-tiny font-black uppercase tracking-widest flex items-center gap-1" style={{ color: C.dimmer }}>
                  100% — Solid <Eye size={10} />
                </span>
              </div>
              <Range ariaLabel="FY banner opacity" format={v => `${v}%`} min={0} max={100} value={bannerOpacity} accent={accent} onChange={applyBannerOpacity} />
              <p className="text-center fz-tiny font-black uppercase tracking-widest mt-1" style={{ color: accent }}>{bannerOpacity}%</p>
            </div>

            {/* Live banner preview */}
            <div>
              <p className="fz-tiny font-black uppercase tracking-widest mb-2" style={{ color: C.dimmer }}>Live Preview</p>
              <div className="relative rounded-xl overflow-hidden h-16" style={{ background: settings.dashboardBg || '#f5f6fa' }}>
                {/* Simulated blobs behind */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-violet-400/20 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-400/15 rounded-full blur-xl" />
                {/* Banner */}
                <div className="absolute inset-2 rounded-lg flex items-center px-4 gap-3" style={bannerPreviewStyle}>
                  <Calendar size={14} className="shrink-0" style={{ color: '#cbd5e1' }} />
                  <div>
                    <p className="fz-micro uppercase tracking-widest font-black" style={{ color: '#94a3b8' }}>Current Financial Year</p>
                    <p className="font-black fz-label leading-tight" style={{ color: '#fff' }}>FY 2026–27</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="text-right">
                      <p className="fz-nano uppercase" style={{ color: '#94a3b8' }}>Days Left</p>
                      <p className="font-black text-sm leading-none" style={{ color: '#fcd34d' }}>292</p>
                    </div>
                    <div className="w-16">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: C.fill }}>
                        <div className="h-full rounded-full" style={{ width: '20%', background: '#10b981' }} />
                      </div>
                      <p className="fz-nano uppercase mt-0.5 text-right" style={{ color: '#94a3b8' }}>20%</p>
                    </div>
                  </div>
                </div>
                {bannerOpacity === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="fz-tiny font-black uppercase tracking-widest" style={{ color: '#64748b' }}>Banner hidden (opacity 0)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Loading Animation ─────────────────────────────────────── */}
        <Panel
          icon={<Zap size={16} />}
          tint="#34d399"
          title="Loading Animation"
          subtitle="Shown while data loads from the database"
          right={<Counter>{LOADING_ANIMATIONS.find(a => a.id === loadingAnimation)?.name}</Counter>}
        >
          <div className="grid grid-cols-3 gap-2.5">
            {LOADING_ANIMATIONS.map(opt => {
              const selected = loadingAnimation === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => saveLoadingAnimation(opt.id)}
                  aria-pressed={selected}
                  className="flex flex-col items-center gap-1 p-2 rounded-[10px] cursor-pointer overflow-hidden"
                  style={{
                    background: selected ? accentRgba(0.12) : C.fill,
                    border: `1.5px solid ${selected ? accent : C.border}`,
                  }}
                >
                  <div style={{ width: '100%', height: 96, display: 'grid', placeItems: 'center', transform: 'scale(.8)' }}>
                    <LoadingAnimation variant={opt.id} height={96} />
                  </div>
                  <span className="fz-small font-bold flex items-center gap-1" style={{ color: selected ? accent : C.textStrong }}>
                    {selected && <Check size={12} />}{opt.name}
                  </span>
                  <span className="fz-tiny font-medium text-center" style={{ color: C.dim }}>{opt.description}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ── Background Theme ──────────────────────────────────────── */}
        <Panel
          icon={<ImageIcon size={16} />}
          tint="#38bdf8"
          title="Dashboard Background"
          subtitle="Canvas colour for the home screen"
        >
          <div className="grid grid-cols-4 gap-2.5 mb-4">
            {BG_OPTIONS.map(opt => {
              const selected = settings.dashboardBg === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => applyDashboardBg(opt.value)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-[10px] cursor-pointer"
                  style={{
                    border: `1px solid ${selected ? accent : C.border}`,
                    background: selected ? accentRgba(0.1) : 'transparent',
                  }}
                >
                  <div className="w-full h-9 rounded-[7px]" style={{ backgroundColor: opt.preview, border: `1px solid ${C.border}` }} />
                  <span className="fz-tiny font-black uppercase tracking-wider" style={{ color: C.text }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="fz-small font-black uppercase tracking-widest" style={fieldLabel}>Custom colour</span>
            <ColorWell value={settings.dashboardBg} ariaLabel="Dashboard background colour" onChange={applyDashboardBg} />
          </div>
        </Panel>
      </div>
    );
  };

  const renderSystem = () => {
    const rows = [
      {
        key: 'notifications',
        title: 'Notifications',
        desc: 'Show success and info toasts — errors and warnings always appear',
        value: settings.notifications,
        onChange: (c: boolean) => applyTheme({ notifications: c }),
      },
      {
        key: 'soundEffects',
        title: 'Sound Effects',
        desc: 'Play audio cues for interactions',
        value: settings.soundEffects,
        onChange: (c: boolean) => applyTheme({ soundEffects: c }),
      },
      {
        key: 'showChatbot',
        title: 'AI Assistant (Chatbot)',
        desc: 'Show FIBE AI assistant bubble for app help',
        value: settings.showChatbot,
        onChange: (c: boolean) => applyTheme({ showChatbot: c }),
      },
    ];

    return (
      <div className="space-y-5">
      <Panel icon={<Monitor size={16} />} tint="#fbbf24" title="System & Windows" subtitle="Global behavior">
        <div className="space-y-2.5">
          {rows.map(row => (
            <div
              key={row.key}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl"
              style={{ background: C.fill }}
            >
              <div>
                <span className="fz-body font-bold block" style={{ color: C.text }}>{row.title}</span>
                <span className="fz-small block mt-0.5" style={{ color: C.dim }}>{row.desc}</span>
              </div>
              <Toggle on={row.value} accent={accent} label={row.title} onChange={row.onChange} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel icon={<Bell size={16} />} tint="#38bdf8" title="Notifications & Search" subtitle="Look and feel of the top-bar alerts and search">
        <TopBarLookSettings accent={accent} />
      </Panel>
      </div>
    );
  };

  const renderDeveloper = () => (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: C.panel, border: `1px solid ${C.border}` }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.07] pointer-events-none">
          <Code size={120} className="text-indigo-400" />
        </div>

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(16,185,129,.18)', color: C.green }}>
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.textStrong }}>Developer Console</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ background: C.green }} />
              <p className="fz-small font-medium uppercase tracking-widest" style={{ color: C.dim }}>Access Granted: Root Level</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
          <button
            onClick={() => openWindow('/analytics-dashboard', 'Analytics Dashboard')}
            className="text-left rounded-xl p-4 cursor-pointer"
            style={{ background: C.fill, border: `1px solid ${C.border}`, color: C.text }}
          >
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center mb-2.5" style={{ background: 'rgba(99,102,241,.2)', color: '#818cf8' }}>
              <BarChart2 size={15} />
            </div>
            <h4 className="font-bold fz-body mb-1" style={{ color: C.textStrong }}>Analytics Dashboard</h4>
            <p className="fz-small" style={{ color: C.dim }}>View aggregated metrics.</p>
          </button>

          <button
            onClick={() => openWindow('/analytics-realtime', 'Real-time Monitor', 1600, 1000)}
            className="text-left rounded-xl p-4 cursor-pointer"
            style={{ background: C.fill, border: `1px solid ${C.border}`, color: C.text }}
          >
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center mb-2.5" style={{ background: 'rgba(16,185,129,.2)', color: C.green }}>
              <Activity size={15} />
            </div>
            <h4 className="font-bold fz-body mb-1" style={{ color: C.textStrong }}>Real-time Monitor</h4>
            <p className="fz-small" style={{ color: C.dim }}>Watch live transaction streams.</p>
          </button>
        </div>
      </div>

      <Panel icon={<Monitor size={16} />} tint="#a78bfa" title="Environment State" subtitle="Window geometry & layout">
        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: C.fill }}>
          <div>
            <span className="fz-body font-bold block" style={{ color: C.text }}>Reset Window Layouts</span>
            <span className="fz-small block mt-0.5" style={{ color: C.dim }}>Restore all windows to default dimensions</span>
          </div>
          <button
            onClick={resetWindowStates}
            className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            style={{ height: 32, border: `1px solid ${C.border}`, background: C.fill, color: C.text }}
          >
            <RotateCcw size={12} /> Reset Geometry
          </button>
        </div>
      </Panel>
    </div>
  );

  const renderLicense = () => <LicenseSection accent={accent} />;

  const tabMeta = TAB_META[activeTab] ?? TAB_META.appearance!;
  const settingsCssVars = {
    '--settings-bg': palette.bg,
    '--settings-bg-header': palette.bgHeader,
    '--settings-panel': palette.panel,
    '--settings-sidebar': palette.sidebar,
    '--settings-border': palette.border,
    '--settings-divider': palette.divider,
    '--settings-fill': palette.fill,
    '--settings-fill-soft': palette.fillSoft,
    '--settings-text': palette.text,
    '--settings-text-strong': palette.textStrong,
    '--settings-dim': palette.dim,
    '--settings-dimmer': palette.dimmer,
    '--settings-green': palette.green,
    '--settings-red': palette.red,
    '--settings-amber': palette.amber,
    '--settings-accent': accent,
  } as React.CSSProperties;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: accent,
          borderRadius: settings.borderRadius,
          fontFamily: settings.fontFamily || "'Inter', sans-serif"
        }
      }}
    >
      <div
        className="settings-shell h-screen flex flex-col overflow-hidden"
        style={{ ...settingsCssVars, background: C.bg, color: C.text }}
      >

        {/* Header */}
        <div
          className="settings-header flex items-center justify-between shrink-0 z-20"
          style={{ background: C.bgHeader, borderBottom: `1px solid ${C.divider}` }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: accent, boxShadow: '0 2px 10px rgba(0,0,0,.4)' }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h1 className="settings-title font-bold tracking-tight leading-none" style={{ color: C.textStrong }}>System Configuration</h1>
              <div className="flex items-center gap-1.5 mt-1.5 fz-tiny font-bold uppercase tracking-widest leading-none" style={{ color: C.dim }}>
                <ShieldCheck size={11} style={{ color: C.green }} /> Administrative Panel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">

            <button
              onClick={handleDeveloperModeToggle}
              className="rounded-[9px] px-3.5 fz-small font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              style={
                isDeveloperMode
                  ? { height: 34, background: 'rgba(52,211,153,.12)', color: C.green, border: '1px solid rgba(52,211,153,.2)' }
                  : { height: 34, background: 'transparent', color: C.dim, border: `1px solid ${C.border}` }
              }
            >
              {isDeveloperMode ? <Unlock size={13} /> : <Lock size={13} />}
              {isDeveloperMode ? 'Dev Active' : 'Dev Locked'}
            </button>

            <div className="w-px h-5" style={{ background: C.divider }} />

            <button
              onClick={handleSaveWithAnimation}
              disabled={isSaving}
              className="rounded-[9px] border-0 text-white fz-small font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              style={{ height: 34, paddingLeft: 18, paddingRight: 18, background: accent, boxShadow: '0 3px 12px rgba(0,0,0,.35)' }}
            >
              <span key={isSaving ? 'saving' : justSaved ? 'saved' : 'idle'} className="settings-swap inline-flex items-center gap-2">
                {isSaving ? <RotateCcw className="settings-spin" size={14} /> : justSaved ? <Check size={14} strokeWidth={3} /> : <Save size={14} />}
                {isSaving ? 'Saving...' : justSaved ? 'Saved' : 'Save Changes'}
              </span>
            </button>

            <button
              onClick={() => window.close()}
              className="rounded-[9px] px-4 fz-small font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              style={{ height: 34, background: 'rgba(255,69,58,.12)', color: C.red, border: '1px solid rgba(255,69,58,.15)' }}
            >
              <X size={13} /> Close
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="settings-layout flex-1 overflow-hidden flex relative">
          {/* Sidebar */}
          <div
            className="settings-sidebar shrink-0 flex flex-col"
            style={{ background: C.sidebar, borderRight: `1px solid ${C.divider}` }}
          >
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.dim }} />
              <input
                value={navQuery}
                onChange={e => setNavQuery(e.target.value)}
                placeholder="Search settings"
                aria-label="Search settings"
                className="w-full box-border rounded-[9px] outline-none pl-8 pr-3 fz-body"
                style={{ height: 34, border: `1px solid ${C.border}`, background: C.fill, color: C.text }}
              />
            </div>

            <nav className="settings-nav flex flex-col gap-0.5" aria-label="Settings sections">
              {visibleNav.map((item, idx) => {
                const { key, label, Icon, gradient } = item;
                // Keep the divider the design puts above License, but only when
                // something actually precedes it after filtering.
                const showDivider = item.afterDivider && idx > 0;
                return (
                  <React.Fragment key={key}>
                    {showDivider && <div className="h-px mx-1.5 my-2.5" style={{ background: C.divider }} />}
                    <button className="settings-nav-button" onClick={() => setActiveTab(key)} style={navButtonStyle(key)} aria-current={activeTab === key ? 'page' : undefined}>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: gradient }}
                      >
                        <Icon size={15} className="text-white" />
                      </div>
                      <span className="fz-body font-bold">{label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
              {visibleNav.length === 0 && (
                <p className="fz-small px-2 py-3" style={{ color: C.dimmer }}>No section matches “{navQuery}”.</p>
              )}
            </nav>
          </div>

          {/* Content Area */}
          <div className="settings-main flex-1 overflow-y-auto relative">
            <div
              className="settings-main-header sticky top-0 z-[8]"
              style={{ background: C.bg }}
            >
              <h2 className="m-0 settings-section-title font-bold tracking-tight" style={{ color: C.textStrong }}>{tabMeta.title}</h2>
              <p className="mt-1 fz-body" style={{ color: C.dim }}>{tabMeta.subtitle}</p>
            </div>

            <div className="settings-main-body" style={{ maxWidth: 1080 }}>
              {activeTab === 'appearance' && renderAppearance()}
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'system' && renderSystem()}
              {activeTab === 'alerts' && <AlertSettingsSection accent={accent} isAdmin={isAdmin} />}
              {activeTab === 'approvers' && <ApproversSettingsSection accent={accent} isAdmin={isAdmin} />}
              {activeTab === 'developer' && renderDeveloper()}
              {activeTab === 'license' && renderLicense()}
            </div>
          </div>
        </div>

        {/* PIN dialog — a plain overlay rather than antd's Modal, which renders
            its own light surface and fights the dark chrome. */}
        {showPinDialog && (
          <div
            className="fixed inset-0 flex items-center justify-center z-[100]"
            style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowPinDialog(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Security access"
              onClick={e => e.stopPropagation()}
              className="rounded-[18px] p-6 settings-pop"
              style={{ width: 320, background: C.panel, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 mb-4" style={{ color: accent }}>
                <Lock size={16} />
                <span className="text-sm font-black uppercase tracking-wide">Security Access</span>
              </div>
              <p className="text-center fz-small font-bold uppercase tracking-widest mb-3.5" style={{ color: C.dim }}>
                Enter Restricted PIN to Unlock
              </p>
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePinSubmit(); }}
                placeholder="••••"
                maxLength={4}
                className="w-full box-border text-center rounded-xl outline-none"
                style={{
                  height: 52, fontSize: 22, fontWeight: 800, letterSpacing: '0.5em',
                  border: `1px solid ${C.border}`, background: C.fill, color: C.textStrong,
                }}
              />
              {pinError && <p className="text-center fz-small font-bold mt-2.5" style={{ color: C.red }}>{pinError}</p>}
              <button
                onClick={handlePinSubmit}
                className="w-full mt-3 rounded-[10px] border-0 fz-small font-black uppercase tracking-widest text-white cursor-pointer"
                style={{ height: 42, background: accent }}
              >
                Authenticate
              </button>
              <button
                onClick={() => setShowPinDialog(false)}
                className="w-full mt-1.5 border-0 bg-transparent fz-small font-bold cursor-pointer"
                style={{ height: 36, color: C.dim }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </ConfigProvider>
  );
};

export default SettingsPage;
