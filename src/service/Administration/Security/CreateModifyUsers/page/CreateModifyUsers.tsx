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
  ShieldAlert,
  Fingerprint,
  UserCheck,
  Settings2,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  Camera,
  Mail,
} from 'lucide-react';
import { useUserManagement } from '../hook/useUserManagement';
import type { UserLevel } from '../interface/types';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import PasswordInput from '../../../../../components/shared/PasswordInput';
import UserLookup from '@/components/shared/UserLookup/UserLookup';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../../../../i18n';

interface CreateModifyUsersProps {
  className?: string;
}

const USER_LEVELS: { value: UserLevel | ''; label: string }[] = [
  { value: '',               label: tLabel('Select Level')   },
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
// ── Animated Permission List ──────────────────────────────────────────────────
// Friendly names for rights whose raw key is not self-explanatory.
const PERM_LABELS: Record<string, { label: string; hint: string }> = {
  manage_two_factor: { label: tLabel('Manage Two-Factor (other users)'), hint: tLabel('May require 2FA for other users, reset their authenticator and unlock them in the Two-Factor & Approvals window. Cannot touch administrator accounts.') },
  approve_actions: { label: tLabel('Approver (OTP)'), hint: tLabel('May give the authenticator code that authorises sensitive actions (loan closure, pass, reverse). They must also set up their authenticator in My Profile.') },
};

interface PermListProps {
  items: string[];
  selected: string[];
  flyingOut: string[];    // items currently animating out of this panel
  justArrived: string[];  // items that just landed in this panel
  onToggle: (item: string, ctrlKey: boolean) => void;
  label: string;
  count: string;
  side: 'left' | 'right';
  /** Drag and drop: called when a drag of these items starts / ends / is dropped on this list. */
  onDragStartItems: (items: string[], side: 'left' | 'right') => void;
  onDragEndItems: () => void;
  onDropHere: (side: 'left' | 'right') => void;
  /** True while some drag from the OTHER list is in flight (highlights this list as a target). */
  dropReady: boolean;
}

const PermList: React.FC<PermListProps> = ({
  items, selected, flyingOut, justArrived, onToggle, label, count, side,
  onDragStartItems, onDragEndItems, onDropHere, dropReady,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [draggingItems, setDraggingItems] = useState<string[]>([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="aw-label" style={{ marginBottom: 0 }}>{label}</span>
        <span className={`aw-pill ${side === 'right' ? '' : 'tone-muted'}`}>{count}</span>
      </div>
      <div
        ref={scrollRef}
        className={`aw-perm-list ${side === 'right' ? 'is-accent' : ''} ${dropReady ? 'is-drop-ready' : ''} ${isOver && dropReady ? 'is-drop-target' : ''}`}
        onDragOver={(e) => { if (dropReady) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
        onDragEnter={(e) => { if (dropReady) { e.preventDefault(); setIsOver(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false); }}
        onDrop={(e) => { e.preventDefault(); setIsOver(false); if (dropReady) onDropHere(side); }}
      >
        {items.length === 0 && (
          <div className="aw-empty" style={{ height: '100%', justifyContent: 'center' }}>
            <ShieldCheck size={26} />
            <span className="aw-meta">{side === 'right' ? t('No privileges yet') : t('Empty')}</span>
          </div>
        )}
        {items.map((item) => {
          const isSelected = selected.includes(item);
          const isExiting  = flyingOut.includes(item);
          const isEntering = justArrived.includes(item);

          return (
            <div
              key={item}
              draggable
              title={PERM_LABELS[item]?.hint}
              onClick={(e) => onToggle(item, e.ctrlKey || e.metaKey)}
              onDragStart={(e) => {
                // Dragging a selected right takes the whole selection with it; otherwise just this one.
                const carried = selected.includes(item) ? selected : [item];
                setDraggingItems(carried);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', carried.join(', '));
                onDragStartItems(carried, side);
              }}
              onDragEnd={() => { setDraggingItems([]); setIsOver(false); onDragEndItems(); }}
              className={[
                'aw-perm-item',
                draggingItems.includes(item) ? 'is-dragging' : '',
                isSelected ? 'is-selected' : '',
                isExiting   ? (side === 'left' ? 'is-fly-right' : 'is-fly-left') : '',
                isEntering  ? (side === 'right' ? 'is-arrive-right' : 'is-arrive-left') : '',
              ].filter(Boolean).join(' ')}
            >
              {PERM_LABELS[item]?.label ?? item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CreateModifyUsers: React.FC<CreateModifyUsersProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    formData,
    selectedDefaultRights,
    selectedRightsAllot,
    setSelectedDefaultRights,
    setSelectedRightsAllot,
    updateFormData,
    moveRights,
    moveAllRights,
    moveSpecificRights,
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
  // Drag and drop between the two lists (the arrow buttons keep working)
  const dragRef = useRef<{ items: string[]; from: 'left' | 'right' } | null>(null);
  const [dragFrom, setDragFrom] = useState<'left' | 'right' | null>(null);

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

  const handleDragStart = (items: string[], from: 'left' | 'right') => { dragRef.current = { items, from }; setDragFrom(from); };
  const handleDragEnd = () => { dragRef.current = null; setDragFrom(null); };
  const handleDropOn = (target: 'left' | 'right') => {
    const d = dragRef.current;
    dragRef.current = null; setDragFrom(null);
    if (!d || d.from === target || d.items.length === 0 || isAnimating) return;
    // Left list = Available Rights, right list = Active Privileges
    const dir = target === 'right' ? 'right' : 'left';
    const from = d.from === 'left' ? 'default' : 'allot';
    (d.from === 'left' ? setSelectedDefaultRights : setSelectedRightsAllot)(d.items);
    animateMove(dir, d.items, () => moveSpecificRights(from, d.items));
  };

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

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: isUpdating ? 'UPDATE' : 'SAVE',
    saveEnabled: !isSaving,
  });

  const statusTone = { success: 'aw-alert-success', info: 'aw-alert-info', warning: 'aw-alert-warning', error: 'aw-alert-danger' } as const;
  const openAvatarPicker = () => document.getElementById('user-avatar-upload')?.click();

  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{isUpdating ? t('Modify User') : t('Create User')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Fingerprint size={12} /> {t('User Access Management')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={() => setIsLookupVisible(true)} className="aw-btn aw-btn-secondary">
            <Search size={13} /> {t('Search')}
          </button>
          <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> {t('Reset')}
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="aw-btn aw-btn-primary">
            {isSaving ? <Loader2 size={13} className="aw-spin" /> : <Save size={13} />}
            {isUpdating ? t('Update') : t('Save')}
          </button>
          <button type="button" onClick={handleClose} className="aw-btn aw-btn-ghost">
            <X size={13} /> {t('Close')}
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {statusMessage && (
            <div className={`aw-alert aw-fade-in ${statusTone[statusMessage.type]}`} style={{ marginBottom: 0, alignItems: 'center' }} role="status">
              {STATUS_ICONS[statusMessage.type]}
              <span style={{ flex: 1 }}>{statusMessage.text}</span>
              <button type="button" onClick={clearStatus} className="aw-icon-btn is-sm" aria-label={t('Dismiss')} style={{ color: 'inherit' }}>
                <X size={13} />
              </button>
            </div>
          )}

          <div className="aw-split aw-split-wide" style={{ height: 'auto', gridTemplateColumns: 'minmax(280px, 5fr) minmax(0, 7fr)' }}>

            {/* ── Left: identity + level ── */}
            <div className="aw-side" style={{ overflow: 'visible' }}>
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><UserCheck size={14} /></span>
                  <h2 className="aw-card-title">{t('Identity Profile')}</h2>
                </div>
                <div className="aw-stack">
                  {/* Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 'var(--aw-gap)', borderBottom: '1px solid var(--aw-border)' }}>
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
                    <button type="button" onClick={openAvatarPicker} className="aw-avatar" aria-label={t('Change photo')} data-tip={t('Change photo')} data-tip-pos="bottom">
                      {formData.avatar ? (
                        <img src={formData.avatar} alt={t('Avatar')} />
                      ) : (
                        <span>{formData.username?.[0] || <User size={20} />}</span>
                      )}
                      <i className="aw-avatar-badge"><Camera size={10} /></i>
                    </button>
                    <div>
                      <p className="aw-strong" style={{ textTransform: 'uppercase' }}>{formData.username || t('New User')}</p>
                      <p className="aw-meta">{t('Click photo to change')}</p>
                    </div>
                  </div>

                  <div>
                    <label className="aw-label" htmlFor="cmu-username">{t('User Name')}</label>
                    <div className="aw-input-wrap has-icon has-action">
                      <User size={13} />
                      <input id="cmu-username" type="text" value={formData.username}
                        onChange={(e) => updateFormData('username', e.target.value)}
                        className="aw-input" placeholder={t('e.g. admin_pro_01')} />
                      <button
                        type="button"
                        className="aw-input-action"
                        onClick={() => formData.username ? fetchUser() : setIsLookupVisible(true)}
                        aria-label={t('Find user')}
                        data-tip={t('Find user')}
                        data-tip-pos="top-end"
                      >
                        <Search size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="aw-label" htmlFor="cmu-email">
                      {t('Email')} <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{t('(optional)')}</span>
                    </label>
                    <div className="aw-input-wrap has-icon">
                      <Mail size={13} />
                      <input id="cmu-email" type="email" value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        className="aw-input" placeholder={t('leave blank to auto-generate')} />
                    </div>
                  </div>

                  <div className="aw-two">
                    <div>
                      <label className="aw-label" htmlFor="cmu-pw">{t('Password')}</label>
                      <PasswordInput withIcon id="cmu-pw" value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className="aw-input" placeholder={isUpdating ? t('(blank = keep)') : '••••••••'} />
                      {!isUpdating && <p className="aw-meta" style={{ marginTop: 4 }}>{t('Min 6 characters')}</p>}
                    </div>
                    <div>
                      <label className="aw-label" htmlFor="cmu-pw2">{t('Confirm')}</label>
                      <PasswordInput id="cmu-pw2" value={formData.confirmPassword}
                        onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                        className={`aw-input ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'is-invalid' : ''}`}
                        placeholder="••••••••" />
                      {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-danger)', fontWeight: 700 }}>{t("Passwords don't match")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><ShieldAlert size={14} /></span>
                  <h2 className="aw-card-title">{t('Level & Authority')}</h2>
                </div>
                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="cmu-level">{t('User Level')}</label>
                    <Select
                      id="cmu-level"
                      className="aw-select"
                      popupClassName="aw-select-popup"
                      value={formData.userLevel || undefined}
                      onChange={(v) => updateFormData('userLevel', v ?? '')}
                      placeholder={t('Select Level')}
                      options={USER_LEVELS.filter(l => l.value !== '').map(l => ({ value: l.value, label: l.label }))}
                    />
                  </div>
                  <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Fingerprint size={16} style={{ color: formData.allowPassTransactions ? 'var(--aw-accent)' : 'var(--aw-muted)' }} />
                      <span>
                        <span className="aw-strong" style={{ display: 'block' }}>{t('Transaction Auth')}</span>
                        <span className="aw-meta">{t('Allow this user to pass transactions')}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.allowPassTransactions}
                      aria-label={t('Transaction Auth')}
                      onClick={() => updateFormData('allowPassTransactions', !formData.allowPassTransactions)}
                      className={`aw-switch ${formData.allowPassTransactions ? 'is-on' : ''}`}
                    />
                  </div>
                  <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={16} style={{ color: formData.isActive ? 'var(--aw-accent)' : 'var(--aw-muted)' }} />
                      <span>
                        <span className="aw-strong" style={{ display: 'block' }}>{t('Account Active')}</span>
                        <span className="aw-meta">{t('Inactive users cannot log in')}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.isActive}
                      aria-label={t('Account Active')}
                      onClick={() => updateFormData('isActive', !formData.isActive)}
                      className={`aw-switch ${formData.isActive ? 'is-on' : ''}`}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right: access privilege matrix ── */}
            <section className="aw-card" style={{ minWidth: 0 }}>
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings2 size={14} /></span>
                <div>
                  <h2 className="aw-card-title">{t('Access Privilege Matrix')}</h2>
                  <p className="aw-meta">{t('Click to select · Ctrl+Click multi-select · Drag and drop or use the arrow buttons to transfer')}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) auto minmax(0, 5fr)', gap: 'var(--aw-gap)', alignItems: 'stretch' }}>
                <PermList
                  items={formData.availablePermissions}
                  selected={selectedDefaultRights}
                  flyingOut={flyingToRight}
                  justArrived={arrivedLeft}
                  onToggle={toggleAvailable}
                  label={t('Available Rights')}
                  count={`${formData.availablePermissions.length} pool`}
                  side="left"
                  onDragStartItems={handleDragStart}
                  onDragEndItems={handleDragEnd}
                  onDropHere={handleDropOn}
                  dropReady={dragFrom === 'right'}
                />

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <button type="button" onClick={handleMoveSelectedRight}
                    disabled={selectedDefaultRights.length === 0 || isAnimating}
                    className="aw-icon-btn" aria-label={t('Grant selected')} data-tip={t('Grant selected')} data-tip-pos="top-start">
                    <ChevronRight size={15} />
                  </button>
                  <button type="button" onClick={handleMoveAllRight}
                    disabled={formData.availablePermissions.length === 0 || isAnimating}
                    className="aw-icon-btn" aria-label={t('Grant all')} data-tip={t('Grant all')} data-tip-pos="top-start">
                    <ChevronsRight size={15} />
                  </button>
                  <div style={{ height: 1, background: 'var(--aw-border)' }} />
                  <button type="button" onClick={handleMoveSelectedLeft}
                    disabled={selectedRightsAllot.length === 0 || isAnimating}
                    className="aw-icon-btn" aria-label={t('Revoke selected')} data-tip={t('Revoke selected')} data-tip-pos="top-start">
                    <ChevronLeft size={15} />
                  </button>
                  <button type="button" onClick={handleMoveAllLeft}
                    disabled={formData.assignedPermissions.length === 0 || isAnimating}
                    className="aw-icon-btn" aria-label={t('Revoke all')} data-tip={t('Revoke all')} data-tip-pos="top-start">
                    <ChevronsLeft size={15} />
                  </button>
                </div>

                <PermList
                  items={formData.assignedPermissions}
                  selected={selectedRightsAllot}
                  flyingOut={flyingToLeft}
                  justArrived={arrivedRight}
                  onToggle={toggleAssigned}
                  label={t('Active Privileges')}
                  count={`${formData.assignedPermissions.length} granted`}
                  side="right"
                  onDragStartItems={handleDragStart}
                  onDragEndItems={handleDragEnd}
                  onDropHere={handleDropOn}
                  dropReady={dragFrom === 'left'}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Lookup dialog ── */}
      <AwDialog open={isLookupVisible} title={t('User Lookup')} icon={<Search size={14} />} onClose={() => setIsLookupVisible(false)} maxWidth="56rem" flush>
        <UserLookup isModal={true}
          onSelect={(user) => { loadUser(user); setIsLookupVisible(false); }}
          onClose={() => setIsLookupVisible(false)} />
      </AwDialog>
    </div>
  );
};

export default CreateModifyUsers;
