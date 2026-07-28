// page/CreateModifyUsers.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronsRight,
  ChevronLeft,
  ChevronsLeft,
  Save,
  RotateCcw,
  ShieldCheck,
  User,
  Lock,
  Shield,
  Key,
  ShieldAlert,
  Fingerprint,
  UserCheck,
  Settings2,
  LockKeyhole,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  Camera,
} from 'lucide-react';
import { useUserManagement } from '../hook/useUserManagement';
import type { UserLevel } from '../interface/types';
import { ConfigProvider, Tooltip, Modal } from 'antd';
import UserLookup from '@/components/shared/UserLookup/UserLookup';

interface CreateModifyUsersProps {
  className?: string;
}

const USER_LEVELS: { value: UserLevel | ''; label: string }[] = [
  { value: '',               label: 'Select Level'   },
  { value: 'system',        label: 'SYSTEM'          },
  { value: 'administrator', label: 'ADMINISTRATOR'   },
  { value: 'manager',       label: 'MANAGER'         },
  { value: 'branch_manager',label: 'BRANCH MANAGER'  },
  { value: 'officer',       label: 'OFFICER'         },
  { value: 'passing_officer',label: 'PASSING OFFICER'},
  { value: 'loan_officer',  label: 'LOAN OFFICER'    },
  { value: 'clerk',         label: 'CLERK'           },
  { value: 'auditor',       label: 'AUDITOR'         },
  { value: 'cashier',       label: 'CASHIER'         },
  { value: 'accountant',    label: 'ACCOUNTANT'      },
  { value: 'data_operator', label: 'DATA OPERATOR'   },
  { value: 'user',          label: 'USER'            },
];

const STATUS_ICONS = {
  success: <CheckCircle2  size={12} className="shrink-0" />,
  info:    <Info          size={12} className="shrink-0" />,
  warning: <AlertTriangle size={12} className="shrink-0" />,
  error:   <AlertCircle   size={12} className="shrink-0" />,
};
const STATUS_COLORS = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  info:    'bg-blue-50 border-blue-300 text-blue-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  error:   'bg-red-50 border-red-300 text-red-800',
};

// ── Animated Permission List ──────────────────────────────────────────────────
interface PermListProps {
  items: string[];
  selected: string[];
  flyingOut: string[];    // items currently animating out of this panel
  justArrived: string[];  // items that just landed in this panel
  onToggle: (item: string, ctrlKey: boolean) => void;
  label: string;
  count: string;
  side: 'left' | 'right';
}

const PermList: React.FC<PermListProps> = ({
  items, selected, flyingOut, justArrived, onToggle, label, count, side,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <label className="cmu-label fz-caption font-black text-slate-600 uppercase tracking-wider">{label}</label>
        <span className="cmu-badge fz-caption font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div
        ref={scrollRef}
        className="cmu-rights-list relative w-full h-64 bg-slate-50 border-2 border-slate-200 rounded-lg overflow-y-auto overflow-x-hidden perm-scroll"
      >
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
            <ShieldCheck size={28} strokeWidth={1} />
            <span className="fz-caption font-black uppercase mt-1">Empty</span>
          </div>
        )}
        {items.map((item) => {
          const isSelected   = selected.includes(item);
          const isExiting    = flyingOut.includes(item);
          const isEntering   = justArrived.includes(item);

          return (
            <div
              key={item}
              onMouseDown={(e) => { e.preventDefault(); onToggle(item, e.ctrlKey || e.metaKey); }}
              className={[
                'perm-item fz-caption font-bold px-2.5 py-1 mx-1 my-0.5 rounded cursor-pointer select-none',
                isSelected  ? 'perm-selected' : 'perm-normal',
                isExiting   ? (side === 'left' ? 'perm-fly-right' : 'perm-fly-left') : '',
                isEntering  ? (side === 'right' ? 'perm-arrive-right' : 'perm-arrive-left') : '',
              ].filter(Boolean).join(' ')}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CreateModifyUsers: React.FC<CreateModifyUsersProps> = ({ className = '' }) => {
  const {
    formData,
    selectedDefaultRights,
    selectedRightsAllot,
    setSelectedDefaultRights,
    setSelectedRightsAllot,
    updateFormData,
    moveRights,
    moveAllRights,
    resetForm,
    saveUser,
    isUpdating,
    fetchUser,
    loadUser,
    statusMessage,
    clearStatus,
  } = useUserManagement();

  const [isLookupVisible, setIsLookupVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Animation state ──────────────────────────────────────────────────────
  const [flyingToRight, setFlyingToRight]   = useState<string[]>([]);
  const [flyingToLeft,  setFlyingToLeft]    = useState<string[]>([]);
  const [arrivedRight,  setArrivedRight]    = useState<string[]>([]);
  const [arrivedLeft,   setArrivedLeft]     = useState<string[]>([]);
  const [isAnimating,   setIsAnimating]     = useState(false);

  // Auto-dismiss status messages
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(clearStatus, 5000);
    return () => clearTimeout(t);
  }, [statusMessage, clearStatus]);

  // ── Animated move helpers ────────────────────────────────────────────────
  const animateMove = useCallback((
    direction: 'right' | 'left',
    itemsToFly: string[],
    doMove: () => void,
  ) => {
    if (itemsToFly.length === 0 || isAnimating) return;
    setIsAnimating(true);

    if (direction === 'right') {
      setFlyingToRight(itemsToFly);
      setTimeout(() => {
        doMove();
        setFlyingToRight([]);
        setArrivedRight(itemsToFly);
        setTimeout(() => { setArrivedRight([]); setIsAnimating(false); }, 450);
      }, 320);
    } else {
      setFlyingToLeft(itemsToFly);
      setTimeout(() => {
        doMove();
        setFlyingToLeft([]);
        setArrivedLeft(itemsToFly);
        setTimeout(() => { setArrivedLeft([]); setIsAnimating(false); }, 450);
      }, 320);
    }
  }, [isAnimating]);

  const handleMoveSelectedRight = () => {
    animateMove('right', selectedDefaultRights, () => moveRights('default', 'allot'));
  };
  const handleMoveAllRight = () => {
    const all = [...formData.availablePermissions];
    setSelectedDefaultRights(all);
    animateMove('right', all, () => moveAllRights('default', 'allot'));
  };
  const handleMoveSelectedLeft = () => {
    animateMove('left', selectedRightsAllot, () => moveRights('allot', 'default'));
  };
  const handleMoveAllLeft = () => {
    const all = [...formData.assignedPermissions];
    setSelectedRightsAllot(all);
    animateMove('left', all, () => moveAllRights('allot', 'default'));
  };

  // ── Selection toggles ────────────────────────────────────────────────────
  const toggleAvailable = (item: string, multi: boolean) => {
    setSelectedDefaultRights(prev =>
      multi
        ? prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
        : prev.includes(item) && prev.length === 1 ? [] : [item]
    );
  };
  const toggleAssigned = (item: string, multi: boolean) => {
    setSelectedRightsAllot(prev =>
      multi
        ? prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
        : prev.includes(item) && prev.length === 1 ? [] : [item]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try { await saveUser(); } finally { setIsSaving(false); }
  };

  const handleClose = () => {
    const api = (window as any).electronAPI;
    if (api?.ipcRenderer) api.ipcRenderer.send('window-close');
    else window.close();
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}>
      <style>{`
        /* ── Scrollbar ── */
        .cmu-page .perm-scroll::-webkit-scrollbar { width: 5px; }
        .cmu-page .perm-scroll::-webkit-scrollbar-track { background: transparent; }
        .cmu-page .perm-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

        /* ── Permission item base ── */
        .cmu-page .perm-item {
          transition: background 0.12s, color 0.12s, transform 0.12s;
          transform-origin: center left;
        }
        .cmu-page .perm-normal  { background: transparent; color: #1e293b; }
        .cmu-page .perm-normal:hover { background: #e2e8f0; }
        .cmu-page .perm-selected {
          background: linear-gradient(90deg, #4f46e5, #6366f1);
          color: white;
          box-shadow: 0 1px 6px rgba(99,102,241,0.35);
        }
        .cmu-page .perm-selected:hover { background: linear-gradient(90deg, #4338ca, #4f46e5); }

        /* ── Fly-out animations ── */
        @keyframes perm-fly-to-right {
          0%   { transform: translateX(0)    scaleX(1)    opacity(1); opacity: 1; }
          40%  { transform: translateX(18px) scaleX(0.95);            opacity: 0.7; }
          100% { transform: translateX(60px) scaleX(0.6);             opacity: 0; }
        }
        .cmu-page .perm-fly-right {
          animation: perm-fly-to-right 0.3s cubic-bezier(.4,0,.6,1) forwards;
          pointer-events: none;
        }
        @keyframes perm-fly-to-left {
          0%   { transform: translateX(0)     scaleX(1)    opacity(1); opacity: 1; }
          40%  { transform: translateX(-18px) scaleX(0.95);            opacity: 0.7; }
          100% { transform: translateX(-60px) scaleX(0.6);             opacity: 0; }
        }
        .cmu-page .perm-fly-left {
          animation: perm-fly-to-left 0.3s cubic-bezier(.4,0,.6,1) forwards;
          pointer-events: none;
        }

        /* ── Arrival animations ── */
        @keyframes perm-arrive-from-left {
          0%   { transform: translateX(-30px) scale(0.85); opacity: 0; }
          55%  { transform: translateX(4px)   scale(1.04); opacity: 1; }
          100% { transform: translateX(0)     scale(1);    opacity: 1; }
        }
        .cmu-page .perm-arrive-right {
          animation: perm-arrive-from-left 0.4s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes perm-arrive-from-right {
          0%   { transform: translateX(30px) scale(0.85); opacity: 0; }
          55%  { transform: translateX(-4px) scale(1.04); opacity: 1; }
          100% { transform: translateX(0)    scale(1);    opacity: 1; }
        }
        .cmu-page .perm-arrive-left {
          animation: perm-arrive-from-right 0.4s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* ── Dark mode ── */
        html.dark .cmu-page { background: #0d0d0d !important; }
        html.dark .cmu-page .cmu-card       { background: #151515 !important; border-color: #222 !important; }
        html.dark .cmu-page .cmu-card-icon  { background: #1a1a1a !important; color: #94a3b8 !important; }
        html.dark .cmu-page .cmu-label      { color: #64748b !important; }
        html.dark .cmu-page .cmu-label-icon { color: #4b5563 !important; }
        html.dark .cmu-page .cmu-input      { background: #1a1a1a !important; border-color: #222 !important; color: #e2e8f0 !important; }
        html.dark .cmu-page .cmu-input::placeholder { color: #374151 !important; }
        html.dark .cmu-page .cmu-input:focus { border-color: #4f46e5 !important; background: #1e1e35 !important; }
        html.dark .cmu-page .cmu-select     { background: #1a1a1a !important; border-color: #222 !important; color: #e2e8f0 !important; }
        html.dark .cmu-page .cmu-select option { background: #1a1a1a; color: #e2e8f0; }
        html.dark .cmu-page .cmu-auth-toggle { background: #1a1a1a !important; border-color: #222 !important; }
        html.dark .cmu-page .cmu-auth-label { color: #94a3b8 !important; }
        html.dark .cmu-page .cmu-rights-list { background: #111 !important; border-color: #222 !important; }
        html.dark .cmu-page .perm-normal  { color: #cbd5e1; }
        html.dark .cmu-page .perm-normal:hover  { background: #1f1f1f; }
        html.dark .cmu-page .cmu-transfer-panel { background: #1a1a1a !important; border-color: #222 !important; }
        html.dark .cmu-page .cmu-transfer-btn   { background: #222 !important; border-color: #2a2a2a !important; color: #94a3b8 !important; }
        html.dark .cmu-page .cmu-transfer-btn:hover:not(:disabled)  { background: #4f46e5 !important; color: white !important; border-color: #4f46e5 !important; }
        html.dark .cmu-page .cmu-transfer-btn:disabled { opacity: 0.2 !important; }
        html.dark .cmu-page .cmu-transfer-divider { background: #222 !important; }
        html.dark .cmu-page .cmu-badge     { background: #1a1a1a !important; color: #94a3b8 !important; }
        html.dark .cmu-page .cmu-search-btn { background: #222 !important; border-color: #222 !important; color: #e2e8f0 !important; }
        html.dark .cmu-page .cmu-info-icon  { background: #1a1a1a !important; color: #64748b !important; }
        html.dark .cmu-page .cmu-info-title { color: #64748b !important; }
        html.dark .cmu-page .cmu-info-body  { color: #4b5563 !important; }
        html.dark .cmu-page .cmu-hdr-btn   { color: #94a3b8 !important; }
        html.dark .cmu-page .cmu-hdr-btn:hover { background: rgba(255,255,255,.08) !important; color: #e2e8f0 !important; }
        html.dark .cmu-page .cmu-section-title { color: #e2e8f0 !important; }
        html.dark .cmu-page .cmu-section-sub   { color: #4b5563 !important; }
        html.dark .cmu-page .cmu-pw-hint        { color: #374151 !important; }
      `}</style>

      <div className={`cmu-page min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 font-sans ${className}`}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between gap-1.5 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1 rounded-lg text-white backdrop-blur-sm">
              <ShieldCheck size={14} />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-tight leading-none uppercase">
                {isUpdating ? 'MODIFY USER' : 'CREATE USER'}
              </h1>
              <div className="flex items-center gap-1 mt-0.5 fz-caption font-bold text-slate-300 uppercase tracking-wider">
                <Fingerprint size={8} className="text-indigo-300" /> User Access Management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsLookupVisible(true)}
              className="px-2 py-0.5 h-6 bg-white/10 text-white hover:bg-white/20 rounded fz-caption font-black transition-all flex items-center gap-1">
              <Search size={10} /> SEARCH
            </button>
            <button onClick={resetForm}
              className="cmu-hdr-btn px-2 py-0.5 h-6 text-slate-300 hover:text-white hover:bg-white/10 rounded fz-caption font-bold transition-all flex items-center gap-1">
              <RotateCcw size={10} /> Reset
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-2 py-0.5 h-6 bg-pink-600 hover:bg-pink-500 text-white rounded fz-caption font-black shadow-md transition-all flex items-center gap-1 active:scale-95 disabled:opacity-60">
              {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              {isUpdating ? 'UPDATE' : 'SAVE'}
            </button>
            <button onClick={handleClose}
              className="cmu-hdr-btn h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-white/10 transition-all" title="Close">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Status banner ──────────────────────────────────────────────────── */}
        {statusMessage && (
          <div className={`shrink-0 px-3 py-1 border-b flex items-center gap-2 fz-caption font-bold ${STATUS_COLORS[statusMessage.type]}`}>
            {STATUS_ICONS[statusMessage.type]}
            <span className="flex-1">{statusMessage.text}</span>
            <button onClick={clearStatus} className="opacity-60 hover:opacity-100 transition-opacity"><X size={11} /></button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-2">
          <div className="max-w-6xl mx-auto space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">

              {/* ── Left: Identity + Level ── */}
              <div className="lg:col-span-5 space-y-2">

                <div className="cmu-card bg-white border-2 border-slate-200 rounded-lg p-2 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-[0.04] pointer-events-none"><User size={60} strokeWidth={1} /></div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="cmu-card-icon bg-slate-50 p-1 rounded-md text-slate-600"><UserCheck size={12} /></div>
                    <h3 className="cmu-section-title fz-caption font-black text-slate-900 tracking-tight uppercase">Identity Profile</h3>
                  </div>
                  <div className="space-y-2">
                    {/* Avatar / Profile Photo */}
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <div className="relative group">
                        <input id="user-avatar-upload" type="file" accept="image/jpeg,image/png" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => updateFormData('avatar', reader.result as string);
                              reader.readAsDataURL(file);
                            }
                            e.target.value = '';
                          }} />
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="Avatar"
                            onClick={() => document.getElementById('user-avatar-upload')?.click()}
                            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400 shadow-md cursor-pointer transition-transform group-hover:scale-105" />
                        ) : (
                          <div
                            onClick={() => document.getElementById('user-avatar-upload')?.click()}
                            className="w-12 h-12 rounded-full border-2 border-slate-300 shadow-md cursor-pointer bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 font-black text-lg uppercase transition-transform group-hover:scale-105 group-hover:border-indigo-400">
                            {formData.username?.[0] || <User size={20} />}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 rounded-full p-0.5 text-white shadow cursor-pointer group-hover:bg-indigo-500"
                          onClick={() => document.getElementById('user-avatar-upload')?.click()}>
                          <Camera size={8} />
                        </div>
                      </div>
                      <div>
                        <p className="fz-caption font-black text-slate-700 uppercase">{formData.username || 'New User'}</p>
                        <p className="text-[8px] text-slate-400 cursor-pointer hover:text-indigo-500"
                          onClick={() => document.getElementById('user-avatar-upload')?.click()}>
                          Click photo to change
                        </p>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="cmu-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                        <Key size={10} className="cmu-label-icon text-slate-600" /> User Name
                      </label>
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <User size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={formData.username}
                            onChange={(e) => updateFormData('username', e.target.value)}
                            className="cmu-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-7 pr-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
                            placeholder="e.g. admin_pro_01" />
                        </div>
                        <button onClick={() => formData.username ? fetchUser() : setIsLookupVisible(true)}
                          className="cmu-search-btn h-6 px-2 bg-slate-800 border-2 border-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center active:scale-95">
                          <Search size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="cmu-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                          <Lock size={10} className="cmu-label-icon" /> Password
                        </label>
                        <div className="relative">
                          <LockKeyhole size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="password" value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            className="cmu-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-7 pr-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all font-mono"
                            placeholder={isUpdating ? '(blank = keep)' : '••••••••'} />
                        </div>
                        {!isUpdating && (
                          <p className="cmu-pw-hint fz-caption text-slate-400 font-bold ml-0.5">Min 6 characters</p>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <label className="cmu-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                          <Shield size={10} className="cmu-label-icon" /> Confirm
                        </label>
                        <input type="password" value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          className="cmu-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all font-mono"
                          placeholder="••••••••" />
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <p className="fz-caption text-red-500 font-black ml-0.5">Passwords don't match</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cmu-card bg-white border-2 border-slate-200 rounded-lg p-2 shadow-md">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="space-y-0.5">
                      <label className="cmu-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                        <ShieldAlert size={10} className="cmu-label-icon" /> User Level
                      </label>
                      <select value={formData.userLevel} onChange={(e) => updateFormData('userLevel', e.target.value)}
                        className="cmu-select w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer">
                        {USER_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <label className="cmu-auth-toggle relative flex flex-col items-center justify-center p-1.5 bg-slate-50 rounded-lg border-2 border-slate-200 cursor-pointer active:scale-95 transition-all select-none">
                      <input type="checkbox" checked={formData.allowPassTransactions}
                        onChange={(e) => updateFormData('allowPassTransactions', e.target.checked)}
                        className="peer sr-only" />
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all mb-0.5 ${
                        formData.allowPassTransactions ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                        <Fingerprint size={14} />
                      </div>
                      <span className={`cmu-auth-label fz-caption font-black uppercase tracking-tight ${
                        formData.allowPassTransactions ? 'text-indigo-700' : 'text-slate-600'}`}>
                        Transaction Auth
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Right: Access Privilege Matrix ── */}
              <div className="lg:col-span-7 cmu-card bg-white border-2 border-slate-200 rounded-lg p-2 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 m-4 opacity-[0.03] pointer-events-none">
                  <ShieldCheck size={120} strokeWidth={1} />
                </div>

                <div className="flex items-center gap-1.5 mb-2">
                  <div className="cmu-card-icon bg-slate-50 p-1 rounded-md text-slate-600"><Settings2 size={12} /></div>
                  <div>
                    <h3 className="cmu-section-title fz-caption font-black text-slate-900 tracking-tight uppercase">Access Privilege Matrix</h3>
                    <p className="cmu-section-sub fz-caption text-slate-600 font-bold uppercase tracking-wider">
                      Click to select · Ctrl+Click multi-select · Arrow buttons to transfer
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">

                  {/* Available pool */}
                  <div className="col-span-5">
                    <PermList
                      items={formData.availablePermissions}
                      selected={selectedDefaultRights}
                      flyingOut={flyingToRight}
                      justArrived={arrivedLeft}
                      onToggle={toggleAvailable}
                      label="Available Rights"
                      count={`${formData.availablePermissions.length} POOL`}
                      side="left"
                    />
                  </div>

                  {/* Transfer buttons */}
                  <div className="col-span-2 flex flex-col items-center justify-center gap-1 pt-4">
                    <div className="cmu-transfer-panel bg-slate-50 p-1 rounded-lg border-2 border-slate-200 flex flex-col gap-1 shadow-sm">
                      <Tooltip title="Grant selected →" placement="right">
                        <button onClick={handleMoveSelectedRight}
                          disabled={selectedDefaultRights.length === 0 || isAnimating}
                          className="cmu-transfer-btn w-7 h-7 bg-white text-slate-600 border border-slate-200 rounded-md shadow-sm transition-all flex items-center justify-center active:scale-90 disabled:opacity-30">
                          <ChevronRight size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Grant all →" placement="right">
                        <button onClick={handleMoveAllRight}
                          disabled={formData.availablePermissions.length === 0 || isAnimating}
                          className="cmu-transfer-btn w-7 h-7 bg-white text-slate-600 border border-slate-200 rounded-md shadow-sm transition-all flex items-center justify-center active:scale-90 disabled:opacity-30">
                          <ChevronsRight size={14} />
                        </button>
                      </Tooltip>
                      <div className="cmu-transfer-divider h-px w-full bg-slate-300 my-0.5" />
                      <Tooltip title="← Revoke selected" placement="left">
                        <button onClick={handleMoveSelectedLeft}
                          disabled={selectedRightsAllot.length === 0 || isAnimating}
                          className="cmu-transfer-btn w-7 h-7 bg-white text-slate-600 border border-slate-200 rounded-md shadow-sm transition-all flex items-center justify-center active:scale-90 disabled:opacity-30">
                          <ChevronLeft size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip title="← Revoke all" placement="left">
                        <button onClick={handleMoveAllLeft}
                          disabled={formData.assignedPermissions.length === 0 || isAnimating}
                          className="cmu-transfer-btn w-7 h-7 bg-white text-slate-600 border border-slate-200 rounded-md shadow-sm transition-all flex items-center justify-center active:scale-90 disabled:opacity-30">
                          <ChevronsLeft size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Active privileges */}
                  <div className="col-span-5">
                    <PermList
                      items={formData.assignedPermissions}
                      selected={selectedRightsAllot}
                      flyingOut={flyingToLeft}
                      justArrived={arrivedRight}
                      onToggle={toggleAssigned}
                      label="Active Privileges"
                      count={`${formData.assignedPermissions.length} GRANTED`}
                      side="right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Info tiles ── */}
            <div className="cmu-card bg-white border-2 border-slate-200 rounded-lg p-2 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { icon: <ShieldCheck size={14} />, title: 'Access Control', body: 'User levels define scope. Administrators override globally; lower roles get targeted, least-privilege access.' },
                  { icon: <Fingerprint size={14} />, title: 'Transaction Verification', body: "Enabling 'Transaction Auth' lets the user bypass multi-step verification for financial record posting." },
                  { icon: <LockKeyhole size={14} />, title: 'Security Policy', body: 'Unique usernames and passwords of min 6 characters are required. All identity changes are logged for audit.' },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="cmu-info-tile flex gap-1.5">
                    <div className="cmu-info-icon bg-slate-50 p-1 rounded-md h-fit text-slate-600">{icon}</div>
                    <div className="space-y-0.5">
                      <p className="cmu-info-title fz-caption font-black text-slate-600 uppercase tracking-wider leading-none">{title}</p>
                      <p className="cmu-info-body fz-caption text-slate-600 leading-tight font-bold">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Lookup Modal ── */}
        <Modal open={isLookupVisible} onCancel={() => setIsLookupVisible(false)}
          footer={null} width={900} centered styles={{ body: { padding: 0 } }} destroyOnClose>
          <UserLookup isModal={true}
            onSelect={(user) => { loadUser(user); setIsLookupVisible(false); }}
            onClose={() => setIsLookupVisible(false)} />
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default CreateModifyUsers;
