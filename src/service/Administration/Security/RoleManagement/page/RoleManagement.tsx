// page/RoleManagement.tsx

import React from 'react';
import {
  MoreHorizontal,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldCheck,
  Building2,
  Search,
  ChevronRight,
  Lock,
  X,
} from 'lucide-react';
import { useDefaultRights } from '../hook/useDefaultRights';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { ConfigProvider, Tooltip } from 'antd';

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

const Pip: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-white' }) => (
  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded rm-pip">
    <span className="rm-pip-label fz-caption font-bold text-slate-400 uppercase tracking-tight leading-none">{label}</span>
    <span className={`fz-caption font-black ${color} leading-none`}>{value}</span>
  </div>
);

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

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 6 } }}>
      <style>{`
        .role-mgmt-page .rm-scroll::-webkit-scrollbar { width: 5px; }
        .role-mgmt-page .rm-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .role-mgmt-page .rm-scroll::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 3px; }
        .role-mgmt-page .rm-scroll::-webkit-scrollbar-thumb:hover { background: #4f46e5; }

        .role-mgmt-page .rm-section-head { background: #f8fafc; border-color: #e2e8f0; }
        .role-mgmt-page .rm-section-head:hover { background: #f1f5f9; }
        .role-mgmt-page .rm-bar-track { background: #e2e8f0; }
        .role-mgmt-page .rm-grid-cell:hover { background: #f8fafc; }
        .role-mgmt-page .rm-grid-cell.rm-sel { background: #eef2ff; }

        html.dark .role-mgmt-page { background: #000000 !important; }
        html.dark .role-mgmt-page .rm-controlbar { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-select { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-select option { background: #1c1c1e; color: #f5f5f7; }
        html.dark .role-mgmt-page .rm-icon-btn { background: #000000 !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-icon-btn:hover { background: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-search { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-search input { color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-search input::placeholder { color: #71717a !important; }
        html.dark .role-mgmt-page .rm-toggle-off { background: #000000 !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-toggle-on { background: #4f46e5 !important; border-color: #4f46e5 !important; color: #fff !important; }
        html.dark .role-mgmt-page .rm-pip { background: #000000 !important; }
        html.dark .role-mgmt-page .rm-pip-label { color: #71717a !important; }
        html.dark .role-mgmt-page .rm-divider { background: rgba(255,255,255,.07) !important; }

        html.dark .role-mgmt-page .rm-scroll { background: #000000 !important; }
        html.dark .role-mgmt-page .rm-section-head { background: #111c31 !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-section-head:hover { background: #16213a !important; }
        html.dark .role-mgmt-page .rm-section-name { color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-section-count-off { color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-bar-track { background: #000000 !important; }
        html.dark .role-mgmt-page .rm-mini-btn { background: #000000 !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-mini-btn:hover { background: #4f46e5 !important; color: #fff !important; border-color: #4f46e5 !important; }
        html.dark .role-mgmt-page .rm-mini-btn.rm-mini-danger:hover { background: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-grid-area { background: #000000 !important; }
        html.dark .role-mgmt-page .rm-grid-cell { background: #1a2436 !important; }
        html.dark .role-mgmt-page .rm-grid-cell:hover { background: #26344c !important; }
        html.dark .role-mgmt-page .rm-grid-cell.rm-sel { background: #1c2c4d !important; }
        html.dark .role-mgmt-page .rm-cb { border-color: rgba(255,255,255,.08) !important; background: rgba(255,255,255,.05) !important; }
        html.dark .role-mgmt-page .rm-grid-cell.rm-sel .rm-cb { background: #4f46e5 !important; border-color: #4f46e5 !important; }
        html.dark .role-mgmt-page .rm-cell-name { color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-grid-cell.rm-sel .rm-cell-name { color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-cell-accent { background: #4f46e5 !important; }
        html.dark .role-mgmt-page .rm-scroll::-webkit-scrollbar-track { background: #1c1c1e !important; }

        html.dark .role-mgmt-page .rm-modal { background: #1c1c1e !important; }
        html.dark .role-mgmt-page .rm-modal-border { border-color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-modal-icon { background: #312e81 !important; color: #818cf8 !important; }
        html.dark .role-mgmt-page .rm-modal h3 { color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-modal p { color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-modal label { color: #71717a !important; }
        html.dark .role-mgmt-page .rm-modal-input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .role-mgmt-page .rm-modal-input::placeholder { color: rgba(255,255,255,.08) !important; }
        html.dark .role-mgmt-page .rm-modal-cancel { background: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .role-mgmt-page .rm-modal-cancel:hover { background: rgba(255,255,255,.08) !important; }
      `}</style>

      <div className={`role-mgmt-page h-screen flex flex-col bg-slate-50 font-sans overflow-hidden ${className}`}>

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 p-1 rounded text-white"><ShieldCheck size={11} /></div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-tight leading-tight uppercase">Role Governance</h1>
              <div className="flex items-center gap-1 fz-caption font-bold text-indigo-300 uppercase tracking-wider leading-none" style={{ fontSize: '9px' }}>
                <Building2 size={7} /> Default Access Matrix
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetForm} className="px-1.5 h-5 text-slate-300 hover:text-white hover:bg-white/10 rounded fz-caption font-bold transition-all flex items-center gap-0.5 group">
              <RotateCcw size={9} className="group-hover:-rotate-90 transition-transform" /> Reset
            </button>
            <button onClick={handleSave} disabled={!selectedUserLevel}
              className="px-2 h-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded fz-caption font-black shadow transition-all flex items-center gap-0.5 active:scale-95 disabled:cursor-not-allowed uppercase">
              <Save size={9} /> Authorize
            </button>
            <button onClick={closeWindow} title="Close"
              className="ml-0.5 w-5 h-5 text-slate-400 hover:text-white hover:bg-red-500/80 rounded transition-all flex items-center justify-center">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Control Bar: level select + search + filters + stats + toggle buttons ── */}
        <div className="rm-controlbar bg-white border-b border-slate-200 px-2 py-1 flex items-center gap-2 shrink-0 flex-wrap">
          <Lock size={9} className="text-slate-400 shrink-0" />
          <select
            value={selectedUserLevel}
            onChange={(e) => updateUserLevel(e.target.value)}
            className="rm-select w-[210px] shrink-0 h-6 bg-slate-50 border border-slate-200 rounded px-1.5 fz-caption font-black text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400 transition-all cursor-pointer appearance-none"
          >
            {userLevels.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <Tooltip title="New Level" placement="top">
            <button onClick={() => setIsCreateModalOpen(true)}
              className="rm-icon-btn w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-500 rounded border border-slate-200 hover:bg-slate-100 transition-all shrink-0">
              <MoreHorizontal size={11} className="rotate-90" />
            </button>
          </Tooltip>

          <div className="rm-search flex items-center gap-1.5 flex-1 min-w-[160px] bg-slate-50 border border-slate-200 rounded h-6 px-2">
            <Search size={11} className="text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter rights by name…"
              className="flex-1 min-w-0 bg-transparent outline-none border-0 fz-caption font-semibold text-slate-800 placeholder:text-slate-400"
            />
            {isFiltering && (
              <span className="fz-caption font-black text-slate-400 uppercase tracking-tight shrink-0" style={{ fontSize: '9px' }}>
                {shownCount} shown
              </span>
            )}
          </div>

          <button
            onClick={toggleOnlyGranted}
            className={`h-6 px-2 rounded border fz-caption font-black transition-all shrink-0 ${
              onlyGranted ? 'rm-toggle-on bg-indigo-600 border-indigo-600 text-white' : 'rm-toggle-off bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Granted only
          </button>
          <button onClick={expandAll}
            className="rm-icon-btn h-6 px-2 bg-slate-50 text-slate-500 rounded border border-slate-200 hover:bg-slate-100 transition-all fz-caption font-black shrink-0">
            Expand
          </button>
          <button onClick={collapseAll}
            className="rm-icon-btn h-6 px-2 bg-slate-50 text-slate-500 rounded border border-slate-200 hover:bg-slate-100 transition-all fz-caption font-black shrink-0">
            Collapse
          </button>

          <div className="rm-divider w-px h-4 bg-slate-200 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Pip label="Total" value={total} color="text-slate-700" />
            <Pip label="On" value={selected} color="text-indigo-600" />
            <Pip label="Off" value={total - selected} color="text-slate-400" />
          </div>

          <div className="rm-divider w-px h-4 bg-slate-200 shrink-0" />

          <div className="flex gap-1 shrink-0">
            <Tooltip title="Select All" placement="top">
              <button onClick={() => toggleAllRights(true)}
                className="rm-icon-btn w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-500 rounded border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                <CheckSquare size={11} />
              </button>
            </Tooltip>
            <Tooltip title="Deselect All" placement="top">
              <button onClick={() => toggleAllRights(false)}
                className="rm-icon-btn w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-500 rounded border border-slate-200 hover:bg-slate-600 hover:text-white hover:border-slate-600 transition-all">
                <Square size={11} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ── Sections fill remaining space ── */}
        <div className="flex-1 overflow-auto rm-scroll">
          {sections.map(section => {
            const pct = section.total > 0 ? Math.round((section.on / section.total) * 100) : 0;
            return (
              <div key={section.name} className="border-b border-slate-200">
                <div
                  onClick={section.toggleOpen}
                  className="rm-section-head sticky top-0 z-[1] border-b border-slate-200 px-2.5 py-1.5 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <ChevronRight size={10} className="text-slate-400 shrink-0 transition-transform" style={{ transform: section.open ? 'rotate(90deg)' : 'none' }} />
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.on > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  <span className="rm-section-name fz-caption font-black text-slate-700 uppercase tracking-wide">{section.name}</span>
                  <span className="fz-caption font-black text-indigo-600">{section.on}</span>
                  <span className="rm-section-count-off fz-caption font-bold text-slate-400">/ {section.total}</span>
                  <div className="rm-bar-track w-[90px] h-1 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-1 ml-auto shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); section.grant(); }}
                      className="rm-mini-btn h-5 px-2 bg-slate-50 border border-slate-200 rounded fz-caption font-black text-slate-500 uppercase tracking-wide hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                      style={{ fontSize: '9px' }}
                    >
                      All
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); section.revoke(); }}
                      className="rm-mini-btn rm-mini-danger h-5 px-2 bg-slate-50 border border-slate-200 rounded fz-caption font-black text-slate-500 uppercase tracking-wide hover:bg-slate-500 hover:text-white transition-all"
                      style={{ fontSize: '9px' }}
                    >
                      None
                    </button>
                  </div>
                </div>

                {section.open && (
                  <div className="rm-grid-area grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-[1px] bg-slate-200">
                    {section.items.map(item => (
                      <div
                        key={item.id}
                        onClick={item.toggle}
                        className={`rm-grid-cell relative flex items-center gap-1 p-1 cursor-pointer transition-colors bg-white group ${item.isSelected ? 'rm-sel' : ''}`}
                      >
                        {item.isSelected && <div className="rm-cell-accent absolute left-0 top-0 w-0.5 h-full bg-indigo-500" />}
                        <div className={`rm-cb shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center transition-all ${
                          item.isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'
                        }`}>
                          {item.isSelected && <CheckSquare size={8} strokeWidth={3} className="text-white" />}
                        </div>
                        <span className={`rm-cell-name fz-caption font-bold leading-tight truncate transition-colors ${
                          item.isSelected ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'
                        }`}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isEmpty && (
            <div className="p-12 text-center text-slate-400 fz-body font-bold">
              No rights match &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bg-slate-800 px-2 py-0.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <ShieldCheck size={9} className="text-slate-500" />
            <p className="fz-caption text-slate-400 font-bold leading-none" style={{ fontSize: '9px' }}>
              Policy: <span className="text-white font-black">{selectedUserLevel ? (userLevels.find(l => l.value === selectedUserLevel)?.label || 'Selected') : 'None Selected'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="fz-caption text-slate-500 font-bold leading-none" style={{ fontSize: '9px' }}>
              GRANTED <span className="text-indigo-400 font-black">{selected}</span>
            </span>
            <span className="fz-caption text-slate-500 font-bold leading-none" style={{ fontSize: '9px' }}>
              TOTAL <span className="text-white font-black">{total}</span>
            </span>
          </div>
        </div>

      </div>

      {/* ── Create Role Modal ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="rm-modal bg-white rounded-xl shadow-2xl p-5 w-80 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="rm-modal-border flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="rm-modal-icon bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><ShieldCheck size={16} /></div>
              <div>
                <h3 className="fz-label font-black text-slate-800 uppercase tracking-tight">New Role Level</h3>
                <p className="fz-caption text-slate-400 font-bold">Add to control hierarchy</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="fz-caption font-black text-slate-400 uppercase tracking-widest">Designation</label>
              <input
                autoFocus
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
                placeholder="e.g. Senior Auditor"
                className="rm-modal-input w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 fz-caption font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setIsCreateModalOpen(false); setNewRoleName(''); }}
                className="rm-modal-cancel flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg fz-caption font-black uppercase tracking-wide transition-all">
                Cancel
              </button>
              <button onClick={handleCreateRole} disabled={!newRoleName.trim()}
                className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg fz-caption font-black uppercase tracking-wide transition-all">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfigProvider>
  );
};

export default RoleManagement;
