// page/RoleManagement.tsx

import React from 'react';
import {
  Plus,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  Check,
  ShieldCheck,
  Building2,
  Search,
  ChevronRight,
  X,
} from 'lucide-react';
import { useDefaultRights } from '../hook/useDefaultRights';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';

interface RoleManagementProps {
  className?: string;
}

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail = '',
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const RoleManagement: React.FC<RoleManagementProps> = ({ className = '' }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState('');

  const {
    selectedUserLevel, updateUserLevel,
    saveDefaultRights, resetForm, getSelectedRightsCount, getTotalRightsCount, createRole,
    userLevels: dynamicUserLevels,
    query, setQuery, onlyGranted, toggleOnlyGranted,
    sections, isEmpty, expandAll, collapseAll, toggleAllRights,
  } = useDefaultRights();

  const roleLabelMap: Record<string, string> = {
    'SYSTEM': 'System Admin', 'ADMINISTRATOR': 'Administrator',
    'MANAGER': 'Manager', 'BRANCH MANAGER': 'Branch Manager',
    'OFFICER': 'Officer', 'PASSING OFFICER': 'Passing Officer',
    'CLERK': 'Clerk', 'AUDITOR': 'Auditor', 'CASHIER': 'Cashier',
    'ACCOUNTANT': 'Accountant', 'LOAN OFFICER': 'Loan Officer',
    'DATA OPERATOR': 'Data Operator', 'USER': 'User',
  };

  const userLevels = [
    { value: '', label: '— Select User Level —' },
    ...dynamicUserLevels.map(l => ({
      value: l.value,
      label: roleLabelMap[l.label.toUpperCase()] || l.label
    }))
  ];

  const total = getTotalRightsCount();
  const selected = getSelectedRightsCount();
  const shownCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const isFiltering = !!query.trim() || onlyGranted;

  const handleSave = async () => {
    if (!selectedUserLevel) {
      await showDialog('warning', 'Action Required', 'Please select a user level before authorizing rights.', '');
      return;
    }
    saveDefaultRights();
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    await createRole(newRoleName);
    setNewRoleName('');
    setIsCreateModalOpen(false);
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Authorize',
    saveEnabled: !!selectedUserLevel,
  });

  const selectedLabel = selectedUserLevel ? (userLevels.find(l => l.value === selectedUserLevel)?.label || 'Selected') : 'None Selected';

  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Role Governance</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={12} /> Default Access Matrix
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={!selectedUserLevel} className="aw-btn aw-btn-primary">
            <Save size={13} /> Authorize
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {/* ── Control bar ── */}
          <section className="aw-card">
            <div className="aw-inline" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
              <div style={{ width: 240 }}>
                <label className="aw-label" htmlFor="rm-level">User Level</label>
                <div className="aw-inline">
                  <Select
                    id="rm-level"
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    style={{ flex: 1, minWidth: 0 }}
                    value={selectedUserLevel || undefined}
                    onChange={(v) => updateUserLevel(v ?? '')}
                    placeholder="— Select User Level —"
                    options={userLevels.filter(l => l.value !== '')}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="aw-icon-btn"
                    aria-label="New level"
                    data-tip="New level"
                    data-tip-pos="top"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="aw-label" htmlFor="rm-search">Filter</label>
                <div className="aw-input-wrap has-icon">
                  <Search size={13} />
                  <input
                    id="rm-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter rights by name…"
                    className="aw-input"
                  />
                </div>
              </div>

              <div className="aw-inline" style={{ gap: 6 }}>
                <button type="button" onClick={toggleOnlyGranted} aria-pressed={onlyGranted} className="aw-chip">
                  Granted only
                </button>
                <button type="button" onClick={expandAll} className="aw-btn aw-btn-secondary aw-btn-sm">Expand</button>
                <button type="button" onClick={collapseAll} className="aw-btn aw-btn-secondary aw-btn-sm">Collapse</button>
                <button type="button" onClick={() => toggleAllRights(true)} className="aw-icon-btn" aria-label="Select all" data-tip="Select all" data-tip-pos="top-end">
                  <CheckSquare size={14} />
                </button>
                <button type="button" onClick={() => toggleAllRights(false)} className="aw-icon-btn" aria-label="Deselect all" data-tip="Deselect all" data-tip-pos="top-end">
                  <Square size={14} />
                </button>
              </div>
            </div>

            <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="aw-pill tone-muted">Total {total}</span>
              <span className="aw-pill">On {selected}</span>
              <span className="aw-pill tone-muted">Off {total - selected}</span>
              {isFiltering && <span className="aw-meta">{shownCount} shown</span>}
            </div>
          </section>

          {/* ── Sections ── */}
          {sections.map(section => {
            const pct = section.total > 0 ? Math.round((section.on / section.total) * 100) : 0;
            return (
              <section key={section.name} className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={section.open}
                  onClick={section.toggleOpen}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); section.toggleOpen(); } }}
                  className="aw-right-head"
                >
                  <ChevronRight size={14} style={{ transform: section.open ? 'rotate(90deg)' : 'none', transition: 'transform .26s cubic-bezier(.32, .72, 0, 1)' }} />
                  <span className="aw-card-title">{section.name}</span>
                  <span className="aw-strong" style={{ color: 'var(--aw-accent)' }}>{section.on}</span>
                  <span className="aw-meta">/ {section.total}</span>
                  <span className="aw-bar-track"><span style={{ width: `${pct}%` }} /></span>
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); section.grant(); }} className="aw-btn aw-btn-secondary aw-btn-sm">All</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); section.revoke(); }} className="aw-btn aw-btn-secondary aw-btn-sm">None</button>
                  </span>
                </div>

                {section.open && (
                  <div className="aw-right-grid aw-fade-in">
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        role="checkbox"
                        aria-checked={item.isSelected}
                        onClick={item.toggle}
                        className="aw-right-cell"
                      >
                        <span className="aw-right-box">{item.isSelected && <Check size={11} strokeWidth={3} />}</span>
                        <span className="aw-right-name">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {isEmpty && (
            <div className="aw-empty" style={{ padding: 40 }}>
              <Search size={26} />
              <strong className="aw-strong">No rights match “{query}”.</strong>
            </div>
          )}
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={12} /> Policy: <strong style={{ color: 'var(--aw-text)' }}>{selectedLabel}</strong>
        </span>
        <span>Granted <strong style={{ color: 'var(--aw-accent)' }}>{selected}</strong> · Total <strong style={{ color: 'var(--aw-text)' }}>{total}</strong></span>
      </div>

      {/* ── Create role dialog ── */}
      <AwDialog
        open={isCreateModalOpen}
        title="New Role Level"
        icon={<ShieldCheck size={14} />}
        onClose={() => { setIsCreateModalOpen(false); setNewRoleName(''); }}
        maxWidth="24rem"
        compact
      >
        <div className="aw-stack">
          <p className="aw-meta">Add to control hierarchy</p>
          <div>
            <label className="aw-label" htmlFor="rm-new">Designation</label>
            <input
              id="rm-new"
              autoFocus
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
              placeholder="e.g. Senior Auditor"
              className="aw-input"
            />
          </div>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setIsCreateModalOpen(false); setNewRoleName(''); }} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={handleCreateRole} disabled={!newRoleName.trim()} className="aw-btn aw-btn-primary">Create</button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default RoleManagement;
