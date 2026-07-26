import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ConfigProvider,
  Input,
  Button,
  Switch,
  ColorPicker,
  message,
  Modal,
  Badge,
  Slider,
  Tag
} from 'antd';
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
  welcomeText: string;
  textColor: string;

  // Typography extras
  boldText: boolean;

  // System
  notifications: boolean;
  syncAcrossWindows: boolean;
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

  welcomeText: '',
  textColor: '#1f2937',

  boldText: false,

  notifications: true,
  syncAcrossWindows: true,
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

// Preset Palettes
const ACCENT_PRESETS = [
  '#6366f1', // Indigo (Default)
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#1f2937', // Gray
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

// Icon map shared with Dashboard
const QA_ICON_MAP: Record<string, LucideIcon> = {
  Users, BookOpen, PiggyBank, ArrowDownLeft, Printer, Database, FileDown, Zap,
  BookMarked, Building2, FilePen, Scale, Tag: TagIcon, Briefcase,
  FileText, ArrowLeftRight, Wallet, ArrowRightLeft, CreditCard, RotateCcw,
  Layers, CheckSquare, Receipt, ReceiptText, DollarSign, Landmark,
  PenLine, Moon, Calculator, TrendingUp, Star, Settings2, ListOrdered,
  ShieldCheck, Lock, Hash, BarChart2, Banknote, MessageSquare, Award, Medal,
};

// --- License Section Component ---
const LicenseSection: React.FC = () => {
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

  const statusConfig = {
    active: { color: 'success', icon: <ShieldCheck size={16} />, label: 'Active', bg: 'bg-emerald-50 border-emerald-200' },
    grace: { color: 'warning', icon: <AlertTriangle size={16} />, label: 'Grace Period', bg: 'bg-amber-50 border-amber-200' },
    expired: { color: 'error', icon: <AlertTriangle size={16} />, label: 'Expired', bg: 'bg-red-50 border-red-200' },
    not_activated: { color: 'default', icon: <KeyRound size={16} />, label: 'Not Activated', bg: 'bg-slate-50 border-slate-200' },
    checking: { color: 'processing', icon: <Clock size={16} />, label: 'Checking...', bg: 'bg-slate-50 border-slate-200' },
  } as const;

  const cfg = statusConfig[status] || statusConfig.checking;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`border rounded-2xl p-6 ${cfg.bg}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white p-2 rounded-lg shadow-sm">{cfg.icon}</div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">License Status</h3>
            <Tag color={cfg.color} className="mt-1">{cfg.label}</Tag>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {customerName && (
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Customer</span>
              <span className="font-semibold text-slate-700">{customerName}</span>
            </div>
          )}
          {expiresAt && (
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Expires</span>
              <span className="font-semibold text-slate-700">{new Date(expiresAt).toLocaleDateString()}</span>
            </div>
          )}
          {status === 'active' && (
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Days Remaining</span>
              <span className={`font-bold text-lg ${daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{daysRemaining}</span>
            </div>
          )}
          {status === 'grace' && (
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Grace Days Left</span>
              <span className="font-bold text-lg text-red-600">{graceDaysRemaining}</span>
            </div>
          )}
        </div>

        {licenseMsg && (
          <p className="mt-4 text-xs text-slate-500 bg-white/60 rounded-lg px-3 py-2">{licenseMsg}</p>
        )}
      </div>

      {/* Activate / Renew */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><KeyRound size={18} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              {status === 'not_activated' ? 'Activate Software' : 'Renew License'}
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Enter your license key</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={activateKey}
            onChange={e => { setActivateKey(formatKey(e.target.value)); setActivateError(''); }}
            placeholder="PWT0-XXXX-XXXX-XXXX-XXXX"
            maxLength={24}
            className="font-mono tracking-widest text-base"
            style={{ letterSpacing: '0.1em', height: '44px' }}
            onPressEnter={handleActivate}
          />
          {activateError && <p className="text-red-500 text-xs">{activateError}</p>}
          <Button
            type="primary"
            onClick={handleActivate}
            loading={activating}
            disabled={activateKey.length !== 24}
            block
            className="h-10 font-bold"
          >
            {status === 'not_activated' ? 'Activate' : 'Apply New Key'}
          </Button>
        </div>
      </div>
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
      welcomeText: typeof theme.welcomeText === 'string' ? theme.welcomeText : (theme.welcomeText as any)?.value || '',
      fontSize: theme.fontScale <= 0.9 ? 'small' : theme.fontScale >= 1.2 ? 'large' : 'medium',
      density: theme.density <= 0.9 ? 'compact' : 'comfortable',
      boldText: localStorage.getItem('lms-bold-text') === '1',
      dashboardBg: localStorage.getItem('lms-dashboard-bg') || '#f5f6fa',
    };
  });

  const [activeTab, setActiveTab] = useState('appearance');
  const [isSaving, setIsSaving] = useState(false);

  // Developer Mode State
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard customisation state
  const [widgetConfig, setWidgetConfig] = useState<{
    fyBanner: boolean; quickActions: boolean; noticeBoard: boolean; shortcuts: boolean;
  }>(() => {
    try {
      return { fyBanner: true, quickActions: true, noticeBoard: true, shortcuts: true, ...JSON.parse(localStorage.getItem('lms-dashboard-widgets') || '{}') };
    } catch { return { fyBanner: true, quickActions: true, noticeBoard: true, shortcuts: true }; }
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
        const [prefRes, welcomeRes] = await Promise.all([
          apiService.getUserPreferences(),
          apiService.getSystemSetting('welcomeText')
        ]);

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
            syncAcrossWindows: remotePrefs.syncAcrossWindows !== undefined ? remotePrefs.syncAcrossWindows : prev.syncAcrossWindows,
            soundEffects: remotePrefs.soundEffects !== undefined ? remotePrefs.soundEffects : prev.soundEffects,
            showChatbot: remotePrefs.showChatbot !== undefined ? remotePrefs.showChatbot : prev.showChatbot,
            dashboardWidgets: remotePrefs.dashboardWidgets !== undefined ? remotePrefs.dashboardWidgets : prev.dashboardWidgets,
          }));

          // Also sync global Redux state as a side effect
          dispatch(setTheme(remotePrefs));
        }

        if (welcomeRes.success && welcomeRes.data) {
          const text = typeof welcomeRes.data === 'string' ? welcomeRes.data : (welcomeRes.data as any).value;
          setSettings(prev => ({ ...prev, welcomeText: text || prev.welcomeText }));
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
      welcomeText: typeof theme.welcomeText === 'string' ? theme.welcomeText : (theme.welcomeText as any)?.value || theme.welcomeText || '',
      fontSize: theme.fontScale <= 0.9 ? 'small' : theme.fontScale >= 1.2 ? 'large' : 'medium',
      density: theme.density <= 0.9 ? 'compact' : 'comfortable'
    }));
  }, [theme]);

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
      syncAcrossWindows: settings.syncAcrossWindows,
      soundEffects: settings.soundEffects,
      showChatbot: settings.showChatbot,
      dashboardWidgets: settings.dashboardWidgets,
    };

    const systemSettings = {
      welcomeText: settings.welcomeText
    };

    try {
      const [prefRes, welcomeRes] = await Promise.all([
        apiService.updateUserPreferences(userPreferences),
        apiService.updateSystemSetting('welcomeText', systemSettings.welcomeText)
      ]);

      if (prefRes.success && welcomeRes.success) {
        const fullThemeState = { ...userPreferences, ...systemSettings };
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

  // --- Render Sections ---

  const renderAppearance = () => (
    <div className="space-y-6">

      {/* Theme & Typography Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Theme & Accent */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Theme & Colors</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Global palette settings</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Theme Mode */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface Mode</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['light', 'dark', 'system'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      const m = mode as 'light' | 'dark' | 'system';
                      setSettings(prev => ({ ...prev, themeMode: m }));
                      dispatch(setTheme({ interfaceMode: m }));
                      // Immediately propagate to main window — don't wait for Save
                      const payload = { interfaceMode: m };
                      if ((window as any).electronAPI?.send) {
                        (window as any).electronAPI.send('update-settings', payload);
                      }
                      try { const bc = new BroadcastChannel('theme_sync'); bc.postMessage(payload); bc.close(); } catch { }
                    }}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${settings.themeMode === mode
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accent Color</label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => { setSettings(prev => ({ ...prev, accentColor: color })); dispatch(setTheme({ accentColor: color })); }}
                    className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${settings.accentColor?.toLowerCase() === color.toLowerCase()
                      ? 'ring-2 ring-offset-2 ring-slate-300 scale-110'
                      : 'hover:scale-105'
                      }`}
                    style={{ backgroundColor: color }}
                  >
                    {settings.accentColor?.toLowerCase() === color.toLowerCase() && <Check size={14} className="text-white" />}
                  </button>
                ))}
                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                <ColorPicker
                  value={settings.accentColor}
                  onChange={(c) => { const hex = c.toHexString(); setSettings(prev => ({ ...prev, accentColor: hex })); dispatch(setTheme({ accentColor: hex })); }}
                />
              </div>
            </div>

            {/* Content Logic */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Welcome Text</label>
              <div className="flex gap-2">
                <Input
                  value={settings.welcomeText}
                  onChange={e => setSettings({ ...settings, welcomeText: e.target.value })}
                  size="small"
                  className="text-xs font-semibold"
                />
                <ColorPicker
                  value={settings.textColor}
                  onChange={(c) => setSettings(prev => ({ ...prev, textColor: c.toHexString() }))}
                />
              </div>
            </div>

            {/* Header Gradient */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Header Gradient</label>
              {/* Live preview */}
              <div className="h-7 w-full rounded-lg border border-slate-200 mb-1" style={{ backgroundImage: headerGradient }} />
              <div className="flex flex-wrap gap-2 items-center">
                {HEADER_GRADIENT_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    title={preset.label}
                    onClick={() => applyHeaderGradient(preset.value)}
                    className={`w-9 h-7 rounded-md border transition-all ${headerGradient === preset.value
                      ? 'ring-2 ring-offset-1 ring-slate-400 border-transparent scale-105'
                      : 'border-slate-200 hover:scale-105'
                      }`}
                    style={{ backgroundImage: preset.value }}
                  />
                ))}
                <div className="w-px h-7 bg-slate-200 mx-1" />
                {/* Custom middle colour (dark slate ends preserved) */}
                <ColorPicker
                  value={(headerGradient.match(/#[0-9a-fA-F]{6}/g) || [])[1] || '#312e81'}
                  onChange={(c) => applyHeaderGradient(`linear-gradient(to right, #0f172a, ${c.toHexString()}, #0f172a)`)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Layout & Type */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-pink-100 p-2 rounded-lg text-pink-600">
              <Type size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Layout & Type</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Density and scaling</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Text Size */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Text Size</label>
                <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 rounded-full">{settings.fontSize}</span>
              </div>
              <div className="px-2">
                <Slider
                  min={0}
                  max={2}
                  step={1}
                  tooltip={{ formatter: null }}
                  value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
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
                  marks={{ 0: 'A', 1: 'AA', 2: 'AAA' }}
                />
              </div>
            </div>

            {/* Bold Text */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bold Text</label>
                <p className="text-[10px] text-slate-400 mt-0.5">Make all labelled text heavier</p>
              </div>
              <Switch
                checked={settings.boldText}
                onChange={(v) => {
                  setSettings(prev => ({ ...prev, boldText: v }));
                  document.documentElement.classList.toggle('bold-text', v);
                  localStorage.setItem('lms-bold-text', v ? '1' : '0');
                  try { const bc = new BroadcastChannel('lms_bold_text'); bc.postMessage({ boldText: v }); bc.close(); } catch { }
                }}
              />
            </div>

            {/* Density Toggle */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout Density</label>
              <div className="grid grid-cols-2 gap-3">
                {['compact', 'comfortable'].map(d => (
                  <div
                    key={d}
                    onClick={() => setSettings(prev => ({ ...prev, density: d as any }))}
                    className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${settings.density === d
                      ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className={`w-full bg-white border border-slate-200 rounded-md ${d === 'compact' ? 'space-y-1 p-1' : 'space-y-2 p-2'}`}>
                      <div className="h-1.5 w-2/3 bg-slate-200 rounded-full"></div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full"></div>
                    </div>
                    <span className="fz-body font-bold uppercase tracking-wider text-slate-600">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corner Radius: {settings.borderRadius}px</label>
              </div>
              <Slider
                min={0}
                max={16}
                value={settings.borderRadius}
                onChange={(v) => setSettings(prev => ({ ...prev, borderRadius: v }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Config */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
            <ImageIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Background</h3>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Canvas appearance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            {/* Background Mode */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {['solid', 'gradient', 'image'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSettings(prev => ({ ...prev, backgroundType: mode as any }))}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${settings.backgroundType === mode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Solid/Gradient Controls */}
            {settings.backgroundType !== 'image' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {settings.backgroundType === 'gradient' ? 'Colors' : 'Color Selection'}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {BG_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSettings(prev => ({ ...prev, backgroundColor1: color }))}
                      className={`w-6 h-6 rounded border transition-all ${settings.backgroundColor1 === color ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-4 items-center">
                  <ColorPicker
                    value={settings.backgroundColor1}
                    onChange={(c) => setSettings(prev => ({ ...prev, backgroundColor1: c.toHexString() }))}
                    showText
                  />
                  {settings.backgroundType === 'gradient' && (
                    <>
                      <span className="text-slate-300">to</span>
                      <ColorPicker
                        value={settings.backgroundColor2}
                        onChange={(c) => setSettings(prev => ({ ...prev, backgroundColor2: c.toHexString() }))}
                        showText
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Image Controls */}
            {settings.backgroundType === 'image' && (
              <div className="space-y-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="flex gap-2">
                  <Button onClick={() => fileInputRef.current?.click()} icon={<UploadCloud size={14} />}>
                    Upload
                  </Button>
                  {settings.backgroundImage && (
                    <div className="absolute bottom-4 left-4 right-4 backdrop-blur-sm px-4 py-2 shadow-sm border border-white/50" style={{ borderRadius: settings.borderRadius }}>
                      <span style={{ color: settings.textColor, fontFamily: settings.fontFamily, fontSize: settings.fontSize === 'small' ? 12 : settings.fontSize === 'large' ? 16 : 14 }} className="font-bold">
                        {settings.welcomeText || 'Preview Text'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
    ];

    const bannerBgAlpha = (bannerOpacity / 100).toFixed(2);
    const bannerPreviewStyle = {
      backdropFilter: 'blur(12px)',
      background: `rgba(15,23,42,${bannerBgAlpha})`,
      border: '1px solid rgba(255,255,255,0.10)',
    };

    return (
      <div className="space-y-6">

        {/* ── Widget Visibility ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Dashboard Widgets</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Choose which panels are visible on your dashboard</p>
            </div>
            <span className="ml-auto px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-widest">
              {Object.values(widgetConfig).filter(Boolean).length} / 4 on
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {WIDGET_DEFS.map(({ key, label, desc, Icon }) => {
              const isOn = widgetConfig[key];
              return (
                <div key={key}
                  onClick={() => toggleWidget(key)}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-4 transition-all ${
                    isOn
                      ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 opacity-60'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${isOn ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-wide leading-none ${isOn ? 'text-slate-800' : 'text-slate-400'}`}>{label}</p>
                    <p className="text-[9px] text-slate-400 mt-1 truncate">{desc}</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full shrink-0 relative transition-all ${isOn ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isOn ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions Configuration ───────────────────────────── */}
        {(() => {
          const categories = Array.from(new Set(ALL_QUICK_ACTION_DEFS.map(d => d.category)));
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Quick Actions Bar</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Choose which windows appear in the dashboard quick actions</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-widest">
                    {enabledQaIds.length} / {ALL_QUICK_ACTION_DEFS.length} enabled
                  </span>
                  {enabledQaIds.length !== DEFAULT_ENABLED_QA_IDS.length && (
                    <button
                      onClick={() => {
                        setEnabledQaIds(DEFAULT_ENABLED_QA_IDS);
                        localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED_QA_IDS));
                        try { const bc = new BroadcastChannel(QA_BROADCAST_CHANNEL); bc.postMessage({ enabledIds: DEFAULT_ENABLED_QA_IDS }); bc.close(); } catch { }
                      }}
                      className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {categories.map(cat => {
                  const items = ALL_QUICK_ACTION_DEFS.filter(d => d.category === cat);
                  const enabledInCat = items.filter(d => enabledQaIds.includes(d.id)).length;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cat}</span>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[8px] text-slate-400">{enabledInCat}/{items.length}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {items.map((item: QuickActionDef) => {
                          const isOn = enabledQaIds.includes(item.id);
                          const IconComp = QA_ICON_MAP[item.iconName] ?? Zap;
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleQaItem(item.id)}
                              className={`cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                                isOn
                                  ? 'border-emerald-400 bg-emerald-50/40 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-slate-300 opacity-50'
                              }`}
                            >
                              <div className={`p-2 rounded-lg border ${isOn ? item.colorCls : 'bg-slate-50 text-slate-400 border-slate-100'} transition-all`}>
                                <IconComp size={14} />
                              </div>
                              <span className={`text-[7.5px] font-black uppercase tracking-tight text-center leading-tight ${isOn ? 'text-slate-700' : 'text-slate-400'}`}>
                                {item.label}
                              </span>
                              <div className={`w-7 h-3.5 rounded-full relative transition-all ${isOn ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-all ${isOn ? 'right-0.5' : 'left-0.5'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── FY Banner Transparency ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">FY Banner Transparency</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Control how opaque the glass banner appears</p>
            </div>
            <span className="ml-auto px-2 py-1 text-[10px] font-black rounded-full uppercase tracking-widest"
              style={{ background: bannerOpacity === 0 ? '#fef2f2' : '#f0fdf4', color: bannerOpacity === 0 ? '#dc2626' : '#16a34a' }}>
              {bannerOpacity === 0 ? 'Invisible' : bannerOpacity === 100 ? 'Solid' : `${bannerOpacity}% opaque`}
            </span>
          </div>

          <div className="space-y-5">
            {/* Quick presets */}
            <div className="flex gap-2">
              {[
                { label: 'Hidden',      value: 0,  cls: 'border-red-200 text-red-500 hover:bg-red-50' },
                { label: 'Ghost',       value: 20, cls: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                { label: 'Glass',       value: 55, cls: 'border-violet-200 text-violet-600 hover:bg-violet-50' },
                { label: 'Default',     value: 78, cls: 'border-indigo-200 text-indigo-600 hover:bg-indigo-50' },
                { label: 'Solid',       value: 100,cls: 'border-slate-700 text-slate-700 hover:bg-slate-100' },
              ].map(p => (
                <button key={p.value} onClick={() => applyBannerOpacity(p.value)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                    bannerOpacity === p.value ? 'ring-2 ring-indigo-400 scale-105 shadow-sm' : ''
                  } ${p.cls}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="px-1">
              <div className="flex justify-between mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><EyeOff size={10} /> 0% — Invisible</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">100% — Solid <Eye size={10} /></span>
              </div>
              <Slider
                min={0}
                max={100}
                value={bannerOpacity}
                onChange={applyBannerOpacity}
                tooltip={{ formatter: (v) => `${v}% opacity` }}
                trackStyle={{ background: 'linear-gradient(to right, transparent, #6366f1)' }}
              />
              <p className="text-center text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">{bannerOpacity}%</p>
            </div>

            {/* Live banner preview */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Preview</p>
              <div className="relative rounded-xl overflow-hidden h-16"
                style={{ background: settings.dashboardBg || '#f5f6fa' }}>
                {/* Simulated blobs behind */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-violet-400/20 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-400/15 rounded-full blur-xl" />
                {/* Banner */}
                <div className="absolute inset-2 rounded-lg flex items-center px-4 gap-3" style={bannerPreviewStyle}>
                  <Calendar size={14} className="text-slate-300 shrink-0" />
                  <div>
                    <p className="text-[7px] text-slate-400 uppercase tracking-widest font-black">Current Financial Year</p>
                    <p className="text-white font-black text-[12px] leading-tight">FY 2026–27</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[6px] text-slate-400 uppercase">Days Left</p>
                      <p className="text-amber-300 font-black text-sm leading-none">292</p>
                    </div>
                    <div className="w-16">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '20%' }} />
                      </div>
                      <p className="text-[6px] text-slate-400 uppercase mt-0.5 text-right">20%</p>
                    </div>
                  </div>
                </div>
                {bannerOpacity === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banner hidden (opacity 0)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Background Theme ──────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Dashboard Background</h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Canvas colour for the home screen</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {BG_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => applyDashboardBg(opt.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  settings.dashboardBg === opt.value
                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <div className="w-full h-10 rounded-lg border border-slate-200"
                  style={{ backgroundColor: opt.preview }} />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{opt.label}</span>
                {settings.dashboardBg === opt.value && (
                  <span className="text-[8px] font-black text-indigo-600 uppercase">Active</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom colour</span>
            <ColorPicker
              value={settings.dashboardBg}
              onChange={(c) => applyDashboardBg(c.toHexString())}
              showText
            />
          </div>
        </div>

        {/* ── Preview ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Monitor size={20} /></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Background Preview</h3>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden h-24 flex items-center justify-center"
            style={{ backgroundColor: settings.dashboardBg }}>
            <span className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: settings.dashboardBg.startsWith('#0') || settings.dashboardBg === '#1e1b4b' ? '#94a3b8' : '#64748b' }}>
              Dashboard background preview
            </span>
          </div>
        </div>

      </div>
    );
  };

  const renderSystem = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <Monitor size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">System & Windows</h3>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Global behavior</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">Sync All Windows</span>
            <span className="text-[10px] text-slate-400 block">Apply settings updates to all open windows immediately</span>
          </div>
          <Switch
            checked={settings.syncAcrossWindows}
            onChange={(c) => setSettings(prev => ({ ...prev, syncAcrossWindows: c }))}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">Notifications</span>
            <span className="text-[10px] text-slate-400 block">Enable system alerts and toast messages</span>
          </div>
          <Switch
            checked={settings.notifications}
            onChange={(c) => setSettings(prev => ({ ...prev, notifications: c }))}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">Sound Effects</span>
            <span className="text-[10px] text-slate-400 block">Play audio cues for interactions</span>
          </div>
          <Switch
            checked={settings.soundEffects}
            onChange={(c) => setSettings(prev => ({ ...prev, soundEffects: c }))}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">AI Assistant (Chatbot)</span>
            <span className="text-[10px] text-slate-400 block">Show FIBE AI assistant bubble for app help</span>
          </div>
          <Switch
            checked={settings.showChatbot}
            onChange={(c) => {
              setSettings(prev => ({ ...prev, showChatbot: c }));
              dispatch(setTheme({ showChatbot: c }));
              if ((window as any).electronAPI?.send) { (window as any).electronAPI.send('update-settings', { showChatbot: c }); }
              try { const bc = new BroadcastChannel('theme_sync'); bc.postMessage({ showChatbot: c }); bc.close(); } catch {}
            }}
          />
        </div>

      </div>
    </div>
  );

  const renderDeveloper = () => (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Code size={120} className="text-indigo-400" />
        </div>

        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="bg-emerald-500/20 border border-emerald-500/30 p-2 rounded-lg text-emerald-400">
            <Terminal size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wide">Developer Console</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge status="processing" color="#10b981" />
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Access Granted: Root Level</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          <button
            onClick={() => openWindow('/analytics-dashboard', 'Analytics Dashboard')}
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 p-4 rounded-xl text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                <BarChart2 size={18} />
              </div>
              <span className="fz-body font-black text-slate-500 uppercase tracking-widest px-2 py-1 bg-slate-900 rounded">Analysis</span>
            </div>
            <h4 className="text-white font-bold text-sm mb-1">Analytics Dashboard</h4>
            <p className="text-slate-400 text-xs text-opacity-80">View aggregated metrics.</p>
          </button>

          <button
            onClick={() => openWindow('/analytics-realtime', 'Real-time Monitor', 1600, 1000)}
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 p-4 rounded-xl text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/30 transition-colors">
                <Activity size={18} />
              </div>
              <span className="fz-body font-black text-slate-500 uppercase tracking-widest px-2 py-1 bg-slate-900 rounded">Live</span>
            </div>
            <h4 className="text-white font-bold text-sm mb-1">Real-time Monitor</h4>
            <p className="text-slate-400 text-xs text-opacity-80">Watch live transaction streams.</p>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Monitor size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Environment State</h3>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Window geometry & layout</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">Reset Window Layouts</span>
            <span className="text-[10px] text-slate-400 block">Restore all windows to default dimensions</span>
          </div>
          <Button
            onClick={resetWindowStates}
            icon={<RotateCcw size={14} />}
            className="text-[10px] font-bold uppercase tracking-widest border-slate-300 text-slate-600"
          >
            Reset Geometry
          </Button>
        </div>
      </div>
    </div>
  );

  const renderLicense = () => <LicenseSection />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: settings.accentColor,
          borderRadius: settings.borderRadius,
          fontFamily: settings.fontFamily || "'Inter', sans-serif"
        }
      }}
    >
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 overflow-hidden"
        style={{ fontFamily: settings.fontFamily }}
      >

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/20" style={{ backgroundColor: settings.accentColor }}>
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-white uppercase tracking-tight leading-none">System Configuration</h1>
              <div className="flex items-center gap-2 mt-1.5 fz-body font-bold text-slate-400 uppercase tracking-widest leading-none">
                <ShieldCheck size={10} className="text-emerald-400" /> Administrative Panel
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={handleDeveloperModeToggle}
              className={`h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isDeveloperMode
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                }`}
            >
              {isDeveloperMode ? <Unlock size={14} /> : <Lock size={14} />}
              {isDeveloperMode ? 'Dev Active' : 'Dev Locked'}
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1" />

            <button
              onClick={handleSaveWithAnimation}
              disabled={isSaving}
              className="h-9 px-5 text-white rounded-lg text-[10px] font-black shadow-lg transition-all flex items-center gap-2 transform active:scale-95 uppercase tracking-widest"
              style={{ backgroundColor: settings.accentColor }}
            >
              {isSaving ? <RotateCcw className="animate-spin" size={14} /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={() => window.close()}
              className="h-9 px-4 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-[10px] font-black transition-all flex items-center gap-2 transform active:scale-95 uppercase tracking-widest border border-rose-500/10"
            >
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar */}
          <div className="w-60 bg-white border-r border-slate-200 flex flex-col pt-6 shrink-0 z-10">
            <nav className="flex-1 px-4 space-y-1">
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'appearance'
                  ? 'bg-slate-50 text-indigo-600 shadow-sm ring-1 ring-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                style={activeTab === 'appearance' ? { color: settings.accentColor } : {}}
              >
                <Palette size={16} /> Appearance
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'dashboard'
                  ? 'bg-slate-50 text-indigo-600 shadow-sm ring-1 ring-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                style={activeTab === 'dashboard' ? { color: settings.accentColor } : {}}
              >
                <BarChart2 size={16} /> Dashboard
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'system'
                  ? 'bg-slate-50 text-indigo-600 shadow-sm ring-1 ring-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                style={activeTab === 'system' ? { color: settings.accentColor } : {}}
              >
                <Monitor size={16} /> System & Window
              </button>

              {isDeveloperMode && (
                <>
                  <div className="my-4 px-2">
                    <div className="h-px bg-slate-100 w-full" />
                    <span className="fz-body font-black text-slate-300 uppercase tracking-widest mt-2 block pl-2">System Core</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('developer')}
                    className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'developer'
                      ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Code size={16} /> Developer
                  </button>
                </>
              )}

              {/* License Tab - always visible */}
              <div className="my-4 px-2">
                <div className="h-px bg-slate-100 w-full" />
              </div>
              <button
                onClick={() => setActiveTab('license')}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'license'
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <KeyRound size={16} /> License
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-slate-50/50 overflow-auto p-8 relative">
            <div className="max-w-5xl mx-auto">
                {activeTab === 'appearance' && renderAppearance()}
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'system' && renderSystem()}
                {activeTab === 'developer' && renderDeveloper()}
                {activeTab === 'license' && renderLicense()}
            </div>
          </div>
        </div>

        {/* Modals */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-indigo-600">
              <Lock size={18} />
              <span className="text-sm font-black uppercase tracking-wide">Security Access</span>
            </div>
          }
          open={showPinDialog}
          onCancel={() => setShowPinDialog(false)}
          footer={null}
          width={320}
          centered
          className="compact-modal"
        >
          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest text-center">
              Enter Restricted PIN to Unlock
            </p>
            <Input.Password
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              maxLength={4}
              onPressEnter={handlePinSubmit}
              className="text-center font-black text-lg tracking-[0.5em] h-12"
            />
            {pinError && <p className="text-xs text-center text-rose-500 font-bold">{pinError}</p>}
            <Button
              type="primary"
              block
              size="large"
              onClick={handlePinSubmit}
              className="bg-indigo-600 font-bold uppercase tracking-widest text-[10px]"
            >
              Authenticate
            </Button>
          </div>
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default SettingsPage;


