import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ConfigProvider,
  theme as antdTheme,
  message,
} from 'antd';
import { FONT_OPTIONS, FONT_STORAGE_KEY, FONT_SYNC_CHANNEL, applyAppFont } from '../../config/fontOptions';
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
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  Hash, Banknote, MessageSquare, Award, Medal, type LucideIcon,
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
import { useLicense } from '../license/LicenseContext';

// --- Types & Defaults ---

interface AppSettings {
  // Appearance
  themeMode: 'light' | 'dark' | 'system';
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

  // Dashboard Widgets
  dashboardWidgets: {
    showFundInterestRate: boolean;
    showDividendPayout: boolean;
    showGroupInsurance: boolean;
    showDepositInterestSlabs: boolean;
  };

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

  dashboardWidgets: {
    showFundInterestRate: true,
    showDividendPayout: true,
    showGroupInsurance: true,
    showDepositInterestSlabs: true,
  },

  dashboardBg: '#f5f6fa',
};

/* ============================================================================
   Dark "settings window" chrome.

   This window is deliberately dark regardless of the app's own Light/Dark
   setting — it is a system panel, like the OS settings app, and the controls
   inside it preview Light-mode colours (canvas presets, dashboard background)
   that would be unreadable on a matching light surface.
   ========================================================================== */
const C = {
  bg: '#000000',
  bgHeader: '#0c0c0e',
  panel: '#1c1c1e',
  sidebar: 'rgba(20,20,22,.92)',
  border: 'rgba(255,255,255,.08)',
  divider: 'rgba(255,255,255,.07)',
  fill: 'rgba(255,255,255,.05)',
  fillSoft: 'rgba(255,255,255,.03)',
  text: '#f5f5f7',
  textStrong: '#ffffff',
  dim: '#8e8e93',
  dimmer: '#71717a',
  green: '#34d399',
  red: '#ff453a',
  amber: '#fbbf24',
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

// Header gradient presets (start/end kept dark-slate; middle is the accent band)
const DEFAULT_HEADER_GRADIENT = 'linear-gradient(to right, #0f172a, #312e81, #0f172a)';
const HEADER_GRADIENT_PRESETS: { label: string; value: string }[] = [
  { label: 'Indigo',  value: 'linear-gradient(to right, #0f172a, #312e81, #0f172a)' },
  { label: 'Purple',  value: 'linear-gradient(to right, #0f172a, #4c1d95, #0f172a)' },
  { label: 'Emerald', value: 'linear-gradient(to right, #0f172a, #064e3b, #0f172a)' },
  { label: 'Ocean',   value: 'linear-gradient(to right, #0f172a, #1e3a8a, #0f172a)' },
  { label: 'Crimson', value: 'linear-gradient(to right, #0f172a, #7f1d1d, #0f172a)' },
  { label: 'Amber',   value: 'linear-gradient(to right, #0f172a, #78350f, #0f172a)' },
  { label: 'Slate',   value: 'linear-gradient(to right, #0f172a, #1e293b, #0f172a)' },
  { label: 'Teal',    value: 'linear-gradient(to right, #0f172a, #134e4a, #0f172a)' },
];

const DEVELOPER_PIN = '0786';
const MAX_ATTEMPTS = 3;

// Sidebar / content header copy, keyed by tab.
const TAB_META: Record<string, { title: string; subtitle: string; keywords: string }> = {
  appearance: { title: 'Appearance', subtitle: 'Colors, typography and canvas',      keywords: 'theme dark light accent colour color gradient font text size bold density corner radius background image' },
  dashboard:  { title: 'Dashboard',  subtitle: 'Widgets, quick actions and layout',  keywords: 'widgets quick actions shortcuts fy banner opacity transparency background notice board' },
  system:     { title: 'System & Window', subtitle: 'Notifications and global behavior', keywords: 'notifications toasts sound effects audio chatbot ai assistant' },
  developer:  { title: 'Developer',  subtitle: 'Root-level diagnostics',             keywords: 'analytics realtime monitor window geometry reset layouts console' },
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
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: C.panel, border: `1px solid ${C.border}`, ...style }}
    >
      <div className="flex items-center gap-3 pb-4 mb-5" style={{ borderBottom: `1px solid ${C.divider}` }}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `rgba(${r},${g},${b},.18)`, color: tint }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.textStrong }}>{title}</h3>
          {subtitle && (
            <p className="fz-small font-medium uppercase tracking-widest" style={{ color: C.dim }}>{subtitle}</p>
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
  const [r, g, b] = hexToRgb(color);
  return (
    <span
      className="px-2.5 py-1 fz-tiny font-black rounded-full uppercase tracking-widest"
      style={{ background: `rgba(${r},${g},${b},.15)`, color }}
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
    style={{ width: 42, height: 24, borderRadius: 12, background: on ? accent : 'rgba(255,255,255,.14)' }}
  >
    <span
      className="absolute block rounded-full settings-knob"
      style={{ width: 20, height: 20, top: 2, left: on ? 20 : 2, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
    />
  </button>
);

/** Native range input — antd's Slider cannot be themed dark from here. */
const Range: React.FC<{
  min: number; max: number; step?: number; value: number;
  onChange: (v: number) => void; accent: string; ariaLabel: string;
}> = ({ min, max, step = 1, value, onChange, accent, ariaLabel }) => (
  <input
    type="range"
    aria-label={ariaLabel}
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={e => onChange(parseInt(e.target.value, 10))}
    className="w-full settings-range"
    style={{ accentColor: accent, background: 'rgba(255,255,255,.12)' }}
  />
);

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
          <p className="mt-4 fz-small rounded-lg px-3 py-2" style={{ color: C.dim, background: 'rgba(0,0,0,.35)' }}>{licenseMsg}</p>
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
            border: `1px solid rgba(255,255,255,.1)`, background: C.fill, color: C.text,
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
  const [settings, setSettings] = useState<AppSettings>(() => {
    return {
      ...defaultSettings,
      themeMode: theme.interfaceMode,
      accentColor: theme.accentColor,
      borderRadius: theme.cornerRadius,
      fontSize: theme.fontScale <= 0.9 ? 'small' : theme.fontScale >= 1.2 ? 'large' : 'medium',
      density: theme.density <= 0.9 ? 'compact' : 'comfortable',
      boldText: localStorage.getItem('lms-bold-text') === '1',
      dashboardBg: localStorage.getItem('lms-dashboard-bg') || '#f5f6fa',
      // localStorage is the source of truth here (same as text size / bold
      // text). Falls back to the first option so the picker always shows a
      // selection, including for older profiles that stored plain "Inter".
      fontFamily: localStorage.getItem(FONT_STORAGE_KEY) || FONT_OPTIONS[0]!.value,
    };
  });

  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [navQuery, setNavQuery] = useState('');

  // Developer Mode State
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const accent = settings.accentColor || '#6366f1';
  const [ar, ag, ab] = hexToRgb(accent);
  const accentRgba = useCallback(
    (a: number) => `rgba(${ar},${ag},${ab},${a})`,
    [ar, ag, ab]
  );

  // Dashboard customisation state
  const [widgetConfig, setWidgetConfig] = useState<{
    fyBanner: boolean; quickActions: boolean; noticeBoard: boolean; shortcuts: boolean;
    activeMembers: boolean; sanctionedLoans: boolean; monthEndOutstanding: boolean; balanceDistribution: boolean;
  }>(() => {
    const defaults = {
      fyBanner: true, quickActions: true, noticeBoard: true, shortcuts: true,
      activeMembers: true, sanctionedLoans: true, monthEndOutstanding: true, balanceDistribution: true,
    };
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

  // Header gradient (localStorage + BroadcastChannel; applied live via CSS var)
  const [headerGradient, setHeaderGradient] = useState<string>(
    () => localStorage.getItem('lms-header-gradient') || DEFAULT_HEADER_GRADIENT
  );

  const applyHeaderGradient = useCallback((value: string) => {
    setHeaderGradient(value);
    localStorage.setItem('lms-header-gradient', value);
    document.documentElement.style.setProperty('--header-gradient', value);
    try { const bc = new BroadcastChannel('lms_header_gradient'); bc.postMessage({ headerGradient: value }); bc.close(); } catch { }
  }, []);

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
          const remotePrefs = prefRes.data;
          setSettings(prev => ({
            ...prev,
            themeMode: remotePrefs.interfaceMode || prev.themeMode,
            accentColor: remotePrefs.accentColor || prev.accentColor,
            fontScale: remotePrefs.fontScale !== undefined ? (remotePrefs.fontScale <= 0.9 ? 'small' : remotePrefs.fontScale >= 1.2 ? 'large' : 'medium') : prev.fontSize,
            density: remotePrefs.density !== undefined ? (remotePrefs.density <= 0.9 ? 'compact' : 'comfortable') : prev.density,
            borderRadius: remotePrefs.cornerRadius !== undefined ? remotePrefs.cornerRadius : prev.borderRadius,

            // Map New Fields
            fontFamily: remotePrefs.fontFamily || prev.fontFamily,
            backgroundType: remotePrefs.backgroundType || prev.backgroundType,
            backgroundColor1: remotePrefs.backgroundColor1 || prev.backgroundColor1,
            backgroundColor2: remotePrefs.backgroundColor2 || prev.backgroundColor2,
            backgroundImage: remotePrefs.backgroundImage || prev.backgroundImage,
            textColor: remotePrefs.textColor || prev.textColor,
            notifications: remotePrefs.notifications !== undefined ? remotePrefs.notifications : prev.notifications,
            soundEffects: remotePrefs.soundEffects !== undefined ? remotePrefs.soundEffects : prev.soundEffects,
            showChatbot: remotePrefs.showChatbot !== undefined ? remotePrefs.showChatbot : prev.showChatbot,
            dashboardWidgets: remotePrefs.dashboardWidgets !== undefined ? remotePrefs.dashboardWidgets : prev.dashboardWidgets,
          }));

          // Also sync global Redux state as a side effect
          dispatch(setTheme(remotePrefs));
        }

      } catch (error) {
        console.error('Failed to load settings in SettingsPage', error);
      }
    };

    fetchLatestSettings();
  }, []); // Run ONCE on mount

  useEffect(() => {
    // 2. Also listen for Redux updates (e.g., from other windows via BroadcastChannel/IPC)
    setSettings(prev => ({
      ...prev,
      themeMode: theme.interfaceMode,
      accentColor: theme.accentColor,
      borderRadius: theme.cornerRadius,
      fontSize: theme.fontScale <= 0.9 ? 'small' : theme.fontScale >= 1.2 ? 'large' : 'medium',
      density: theme.density <= 0.9 ? 'compact' : 'comfortable'
    }));
  }, [theme]);

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

  const handlePinSubmit = useCallback(() => {
    if (pinInput === DEVELOPER_PIN) {
      setIsDeveloperMode(true);
      sessionStorage.setItem('developerModeEnabled', 'true');
      setShowPinDialog(false);
      setPinInput('');
      setPinError('');
      setAttempts(0);
      message.success('Developer mode activated');
      setActiveTab('developer');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setPinError(`Too many failed attempts.`);
        setTimeout(() => setShowPinDialog(false), 1500);
        setPinInput('');
        setAttempts(0);
      } else {
        setPinError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        setPinInput('');
      }
    }
  }, [pinInput, attempts]);

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
      dashboardWidgets: settings.dashboardWidgets,
    };

    try {
      const prefRes = await apiService.updateUserPreferences(userPreferences);

      if (prefRes.success) {
        const fullThemeState = { ...userPreferences };
        dispatch(setTheme(fullThemeState));
        if (window.electronAPI?.send) {
          window.electronAPI.send('update-settings', fullThemeState);
        }

        try {
          const bc = new BroadcastChannel('theme_sync');
          bc.postMessage(fullThemeState);
          bc.close();
        } catch (e) {
          // Silent fail
        }

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
  }, [settings, dispatch]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSettings(prev => ({
          ...prev,
          backgroundImage: imageUrl,
          backgroundType: 'image'
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

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
    { key: 'developer',  label: 'Developer',       Icon: Code,      gradient: 'linear-gradient(135deg,#3f3f46,#71717a)', devOnly: true },
    { key: 'license',    label: 'License',         Icon: KeyRound,  gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', afterDivider: true },
  ]), []);

  // The search box narrows the section list by title and by the settings each
  // section contains, so "opacity" or "chatbot" lands on the right tab.
  const visibleNav = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    return NAV_ITEMS
      .filter(item => !item.devOnly || isDeveloperMode)
      .filter(item => {
        if (!q) return true;
        const meta = TAB_META[item.key];
        return item.label.toLowerCase().includes(q)
          || (meta ? `${meta.title} ${meta.subtitle} ${meta.keywords}`.toLowerCase().includes(q) : false);
      });
  }, [NAV_ITEMS, isDeveloperMode, navQuery]);

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
    color: activeTab === key ? C.textStrong : '#c7c7cc',
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
            <div className="flex p-[3px] rounded-[9px]" style={{ background: 'rgba(255,255,255,.06)' }}>
              {(['light', 'dark', 'system'] as const).map(mode => {
                const active = settings.themeMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setSettings(prev => ({ ...prev, themeMode: mode }));
                      dispatch(setTheme({ interfaceMode: mode }));
                      // Immediately propagate to main window — don't wait for Save
                      const payload = { interfaceMode: mode };
                      if ((window as any).electronAPI?.send) {
                        (window as any).electronAPI.send('update-settings', payload);
                      }
                      try { const bc = new BroadcastChannel('theme_sync'); bc.postMessage(payload); bc.close(); } catch { }
                    }}
                    className="flex-1 py-1.5 rounded-[7px] border-0 fz-small font-bold uppercase tracking-widest cursor-pointer"
                    style={{
                      background: active ? (mode === 'light' ? '#fff' : accent) : 'transparent',
                      color: active ? (mode === 'light' ? '#000' : '#fff') : C.dim,
                    }}
                  >
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
                    onClick={() => { setSettings(prev => ({ ...prev, accentColor: color })); dispatch(setTheme({ accentColor: color })); }}
                    className="w-7 h-7 rounded-full border-0 cursor-pointer flex items-center justify-center"
                    style={{ background: color, boxShadow: selected ? `0 0 0 2px ${C.panel}, 0 0 0 4px ${color}` : 'none' }}
                  >
                    {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </button>
                );
              })}
              <div className="w-px h-6 mx-0.5" style={{ background: 'rgba(255,255,255,.12)' }} />
              <ColorWell
                value={accent}
                ariaLabel="Custom accent colour"
                size={28}
                onChange={(hex) => { setSettings(prev => ({ ...prev, accentColor: hex })); dispatch(setTheme({ accentColor: hex })); }}
              />
            </div>
          </div>

          {/* Header Gradient */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Header Gradient</label>
            {/* Live preview */}
            <div className="h-[26px] w-full rounded-lg" style={{ backgroundImage: headerGradient, border: `1px solid rgba(255,255,255,.1)` }} />
            <div className="flex flex-wrap gap-2 items-center">
              {HEADER_GRADIENT_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => applyHeaderGradient(preset.value)}
                  className="border-0 cursor-pointer"
                  style={{
                    width: 34, height: 26, borderRadius: 6, backgroundImage: preset.value,
                    boxShadow: headerGradient === preset.value ? `0 0 0 2px ${C.panel}, 0 0 0 4px ${accent}` : 'none',
                  }}
                />
              ))}
              <div className="w-px h-[22px] mx-0.5" style={{ background: 'rgba(255,255,255,.12)' }} />
              {/* Custom middle colour (dark slate ends preserved) */}
              <ColorWell
                value={(headerGradient.match(/#[0-9a-fA-F]{6}/g) || [])[1] || '#312e81'}
                ariaLabel="Custom header gradient colour"
                size={28}
                onChange={(hex) => applyHeaderGradient(`linear-gradient(to right, #0f172a, ${hex}, #0f172a)`)}
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
              min={0}
              max={2}
              value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
              accent={accent}
              onChange={(v) => {
                const sizes: AppSettings['fontSize'][] = ['small', 'medium', 'large'];
                const chosen = sizes[v] as AppSettings['fontSize'];
                const pxMap: Record<AppSettings['fontSize'], string> = { small: '12px', medium: '13px', large: '15px' };
                const px = pxMap[chosen];
                // Apply to this window
                document.documentElement.style.setProperty('--fz-base', px);
                localStorage.setItem('lms-font-size', px);
                // Broadcast to every other open window
                try { const bc = new BroadcastChannel('lms_font_size'); bc.postMessage({ fontBase: px }); bc.close(); } catch { }
                setSettings(prev => ({ ...prev, fontSize: chosen }));
              }}
            />
            <div className="flex justify-between fz-tiny font-black" style={{ color: C.dim }}>
              <span>A</span><span>AA</span><span>AAA</span>
            </div>
          </div>

          {/* Font Style */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Font Style</label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map(font => {
                const selected = settings.fontFamily === font.value;
                return (
                  <div
                    key={font.label}
                    onClick={() => {
                      // Apply here, remember it, and mirror to every open window —
                      // same pattern as Text Size and Bold Text above.
                      applyAppFont(font.value);
                      localStorage.setItem(FONT_STORAGE_KEY, font.value);
                      try {
                        const bc = new BroadcastChannel(FONT_SYNC_CHANNEL);
                        bc.postMessage({ fontFamily: font.value });
                        bc.close();
                      } catch { }
                      setSettings(prev => ({ ...prev, fontFamily: font.value }));
                    }}
                    className="cursor-pointer rounded-[10px] px-3 py-2.5"
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

          {/* Density Toggle */}
          <div className="space-y-2">
            <label className="fz-small font-black uppercase tracking-widest block" style={fieldLabel}>Layout Density</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['compact', 'comfortable'] as const).map(d => {
                const selected = settings.density === d;
                return (
                  <div
                    key={d}
                    onClick={() => setSettings(prev => ({ ...prev, density: d }))}
                    className="cursor-pointer rounded-[10px] p-3 flex flex-col items-center gap-2"
                    style={{
                      border: `1px solid ${selected ? accent : C.border}`,
                      background: selected ? accentRgba(0.1) : C.fillSoft,
                    }}
                  >
                    <div
                      className="w-full rounded-md"
                      style={{ background: C.fill, padding: d === 'compact' ? 5 : 9 }}
                    >
                      <div className="h-[5px] w-2/3 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,.3)' }} />
                      <div className="h-[5px] w-full rounded-full" style={{ background: 'rgba(255,255,255,.15)' }} />
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
              min={0}
              max={16}
              value={settings.borderRadius}
              accent={accent}
              onChange={(v) => setSettings(prev => ({ ...prev, borderRadius: v }))}
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
                  onClick={() => setSettings(prev => ({ ...prev, backgroundType: mode }))}
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
                    onClick={() => setSettings(prev => ({ ...prev, backgroundColor1: color }))}
                    className="border-0 cursor-pointer"
                    style={{
                      width: 24, height: 24, borderRadius: 6, background: color,
                      boxShadow: settings.backgroundColor1 === color ? `0 0 0 2px ${C.green}` : '0 0 0 1px rgba(255,255,255,.15)',
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-3.5 items-center">
                <ColorWell
                  value={settings.backgroundColor1}
                  ariaLabel="Background colour"
                  onChange={(hex) => setSettings(prev => ({ ...prev, backgroundColor1: hex }))}
                />
                {settings.backgroundType === 'gradient' && (
                  <>
                    <span className="fz-body" style={{ color: C.dimmer }}>to</span>
                    <ColorWell
                      value={settings.backgroundColor2}
                      ariaLabel="Second background colour"
                      onChange={(hex) => setSettings(prev => ({ ...prev, backgroundColor2: hex }))}
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
                  style={{ height: 34, border: `1px solid rgba(255,255,255,.14)`, background: 'rgba(255,255,255,.06)', color: C.text }}
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
                      border: '1px solid rgba(255,255,255,.15)',
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
      { key: 'balanceDistribution' as const, label: 'Balance Distribution', desc: 'Members grouped by net balance',     Icon: PiggyBank },
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
                  className="cursor-pointer rounded-xl p-3 flex items-center gap-3"
                  style={
                    isOn
                      ? { border: `1px solid ${color}66`, background: `${color}1a` }
                      : { border: `1px solid rgba(255,255,255,.07)`, background: 'rgba(255,255,255,.02)', opacity: 0.55 }
                  }
                >
                  <div
                    className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: isOn ? `${color}33` : 'rgba(255,255,255,.06)', color: isOn ? color : C.dimmer }}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="fz-tiny font-black uppercase tracking-wide leading-none" style={{ color: isOn ? C.textStrong : C.dim }}>{label}</p>
                    <p className="fz-tiny mt-1 truncate" style={{ color: C.dimmer }}>{desc}</p>
                  </div>
                  <div
                    className="relative shrink-0"
                    style={{ width: 34, height: 19, borderRadius: 10, background: isOn ? color : 'rgba(255,255,255,.14)' }}
                  >
                    <span
                      className="absolute block rounded-full settings-knob"
                      style={{ width: 15, height: 15, top: 2, left: isOn ? 17 : 2, background: '#fff' }}
                    />
                  </div>
                </div>
              );
            })}
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
                          className="cursor-pointer rounded-[10px] px-1.5 py-2.5 flex flex-col items-center gap-1.5"
                          style={
                            isOn
                              ? { border: `1px solid ${color}66`, background: `${color}1a` }
                              : { border: `1px solid rgba(255,255,255,.07)`, background: 'rgba(255,255,255,.02)', opacity: 0.45 }
                          }
                        >
                          <div
                            className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center"
                            style={{ background: isOn ? `${color}33` : 'rgba(255,255,255,.06)', color: isOn ? color : C.dimmer }}
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
              <Range ariaLabel="FY banner opacity" min={0} max={100} value={bannerOpacity} accent={accent} onChange={applyBannerOpacity} />
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
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.1)' }}>
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
                  <div className="w-full h-9 rounded-[7px]" style={{ backgroundColor: opt.preview, border: '1px solid rgba(255,255,255,.1)' }} />
                  <span className="fz-tiny font-black uppercase tracking-wider" style={{ color: '#c7c7cc' }}>{opt.label}</span>
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
        onChange: (c: boolean) => setSettings(prev => ({ ...prev, notifications: c })),
      },
      {
        key: 'soundEffects',
        title: 'Sound Effects',
        desc: 'Play audio cues for interactions',
        value: settings.soundEffects,
        onChange: (c: boolean) => setSettings(prev => ({ ...prev, soundEffects: c })),
      },
      {
        key: 'showChatbot',
        title: 'AI Assistant (Chatbot)',
        desc: 'Show FIBE AI assistant bubble for app help',
        value: settings.showChatbot,
        onChange: (c: boolean) => {
          setSettings(prev => ({ ...prev, showChatbot: c }));
          dispatch(setTheme({ showChatbot: c }));
          if ((window as any).electronAPI?.send) { (window as any).electronAPI.send('update-settings', { showChatbot: c }); }
          try { const bc = new BroadcastChannel('theme_sync'); bc.postMessage({ showChatbot: c }); bc.close(); } catch { }
        },
      },
    ];

    return (
      <Panel icon={<Monitor size={16} />} tint="#fbbf24" title="System & Windows" subtitle="Global behavior">
        <div className="space-y-2.5">
          {rows.map(row => (
            <div
              key={row.key}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,.04)' }}
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
    );
  };

  const renderDeveloper = () => (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg,#141416,#0c0c0e)', border: '1px solid rgba(255,255,255,.09)' }}
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
            style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}`, color: C.text }}
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
            style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${C.border}`, color: C.text }}
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
        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
          <div>
            <span className="fz-body font-bold block" style={{ color: C.text }}>Reset Window Layouts</span>
            <span className="fz-small block mt-0.5" style={{ color: C.dim }}>Restore all windows to default dimensions</span>
          </div>
          <button
            onClick={resetWindowStates}
            className="rounded-lg px-3.5 fz-tiny font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            style={{ height: 32, border: '1px solid rgba(255,255,255,.14)', background: C.fill, color: C.text }}
          >
            <RotateCcw size={12} /> Reset Geometry
          </button>
        </div>
      </Panel>
    </div>
  );

  const renderLicense = () => <LicenseSection accent={accent} />;

  const tabMeta = TAB_META[activeTab] ?? TAB_META.appearance!;

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: accent,
          borderRadius: settings.borderRadius,
          fontFamily: settings.fontFamily || "'Inter', sans-serif"
        }
      }}
    >
      <div
        className="settings-shell h-screen flex flex-col overflow-hidden"
        style={{ background: C.bg, color: C.text }}
      >

        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0 z-20"
          style={{ background: C.bgHeader, borderBottom: `1px solid rgba(255,255,255,.07)` }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: '0 2px 10px rgba(0,0,0,.4)' }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight leading-none" style={{ color: C.textStrong }}>System Configuration</h1>
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

            <div className="w-px h-5" style={{ background: 'rgba(255,255,255,.12)' }} />

            <button
              onClick={handleSaveWithAnimation}
              disabled={isSaving}
              className="rounded-[9px] border-0 text-white fz-small font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              style={{ height: 34, paddingLeft: 18, paddingRight: 18, background: accent, boxShadow: '0 3px 12px rgba(0,0,0,.35)' }}
            >
              {isSaving ? <RotateCcw className="settings-spin" size={14} /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
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
        <div className="flex-1 overflow-hidden flex relative">
          {/* Sidebar */}
          <div
            className="w-[250px] shrink-0 flex flex-col px-3 py-4"
            style={{ background: C.sidebar, backdropFilter: 'blur(20px)', borderRight: `1px solid rgba(255,255,255,.07)` }}
          >
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.dim }} />
              <input
                value={navQuery}
                onChange={e => setNavQuery(e.target.value)}
                placeholder="Search settings"
                aria-label="Search settings"
                className="w-full box-border rounded-[9px] outline-none pl-8 pr-3 fz-body"
                style={{ height: 34, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.06)', color: C.text }}
              />
            </div>

            <nav className="flex flex-col gap-0.5">
              {visibleNav.map((item, idx) => {
                const { key, label, Icon, gradient } = item;
                // Keep the divider the design puts above License, but only when
                // something actually precedes it after filtering.
                const showDivider = item.afterDivider && idx > 0;
                return (
                  <React.Fragment key={key}>
                    {showDivider && <div className="h-px mx-1.5 my-2.5" style={{ background: 'rgba(255,255,255,.08)' }} />}
                    <button onClick={() => setActiveTab(key)} style={navButtonStyle(key)}>
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
          <div className="flex-1 overflow-y-auto relative">
            <div
              className="sticky top-0 z-[8] px-10 pt-7 pb-3.5"
              style={{ background: 'linear-gradient(#000 70%, rgba(0,0,0,0))' }}
            >
              <h2 className="m-0 text-[28px] font-black tracking-tight" style={{ color: C.textStrong }}>{tabMeta.title}</h2>
              <p className="mt-1 fz-body" style={{ color: C.dim }}>{tabMeta.subtitle}</p>
            </div>

            <div className="px-10 pb-12 settings-enter" style={{ maxWidth: 1080 }}>
              {activeTab === 'appearance' && renderAppearance()}
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'system' && renderSystem()}
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
              style={{ width: 320, background: C.panel, border: '1px solid rgba(255,255,255,.1)' }}
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
                  border: '1px solid rgba(255,255,255,.12)', background: C.fill, color: '#fff',
                }}
              />
              {pinError && <p className="text-center fz-small font-bold mt-2.5" style={{ color: '#ff6961' }}>{pinError}</p>}
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
