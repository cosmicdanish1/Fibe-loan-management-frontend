import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Save, X, Trash2, RefreshCw, Printer, Search, LogOut, type LucideIcon } from 'lucide-react';

interface RemoteToolbarState {
  saveLabel?: string;
  saveEnabled?: boolean;
  hasSave: boolean;
}

interface SubNavbarProps {
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onPrint?: () => void;
  onFind?: () => void;
  onExit?: () => void;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  onClick: (() => void) | undefined;
  /** Whether this action genuinely does something right now — drives the
   * enabled/disabled look. Kept separate from onClick so a button never
   * *looks* clickable while silently doing nothing. */
  enabled: boolean;
}

const SubNavbar: React.FC<SubNavbarProps> = ({
  onSave,
  onCancel,
  onDelete,
  onRefresh,
  onPrint,
  onFind,
  onExit,
}) => {
  const location = useLocation();
  // Whichever tool window last had focus reports its Save state here via the
  // main process (see main.ts "TOOLBAR REMOTE CONTROL") — this window (the
  // Dashboard) can't read that window's state directly, they're separate
  // Electron processes.
  const [remoteState, setRemoteState] = useState<RemoteToolbarState | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onToolbarStateChanged) return;
    return api.onToolbarStateChanged((state: RemoteToolbarState | null) => setRemoteState(state));
  }, []);

  const handleTriggerSave = () => {
    (window as any).electronAPI?.triggerToolbarSave?.();
  };

  const handleGlobalExit = () => {
    // Accurate check using Router location
    const currentPath = location.pathname;
    const isDashboard = currentPath === '/' || currentPath === '/dashboard';

    // Fallback hash check just in case Router isn't mounted or using hash unexpectedly
    const isHashDashboard = window.location.hash === '#/' || window.location.hash === '#/dashboard';

    if (isDashboard || isHashDashboard) {
      // Send command to backend to close the latest active child window
      if ((window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.send('close-latest-window');
      }
      return;
    }

    // Try standard API which maps to 'window-close' in preload
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
    // Fallback to legacy channel via preload bypass if API missing
    else if ((window as any).electron?.ipcRenderer) {
      // Correct channel name is 'window-close' based on preload configuration
      (window as any).electron.ipcRenderer.send('window-close');
    }
    else {
      window.close();
    }
  };

  const handleFind = () => {
    // Same destination as the global F2 shortcut (renderer/App.tsx).
    if (window.electronAPI?.openNewWindow) {
      window.electronAPI.openNewWindow('/utility/find');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // No page has registered its own print — fall back to the browser/Electron
  // print dialog for whatever is currently on screen, rather than doing
  // nothing.
  const handlePrint = () => {
    window.print();
  };

  // No page has registered its own Cancel — closing the window is the
  // sensible universal fallback for "back out of this without saving" in a
  // single-purpose tool window (same underlying action as Exit).
  const handleCancel = () => {
    handleGlobalExit();
  };

  // Legacy windows call their primary action Save/Sanction/Post/whatever the
  // screen needs — mirror whichever tool window last had focus instead of
  // hardcoding "Save". No tool window has focused yet (or none is open) ⇒
  // remoteState is null ⇒ stays disabled.
  const hasSaveHandler = !!onSave || !!remoteState?.hasSave;
  const saveLabel = remoteState?.saveLabel ?? 'Save';
  const saveEnabled = hasSaveHandler && (remoteState?.saveEnabled ?? true);

  const navItems: NavItem[] = [
    // Delete stays disabled — no cross-window wiring for it yet.
    { icon: Save, label: saveLabel, onClick: onSave ?? handleTriggerSave, enabled: saveEnabled },
    { icon: X, label: 'Cancel', onClick: onCancel ?? handleCancel, enabled: true },
    { icon: Trash2, label: 'Delete', onClick: onDelete, enabled: !!onDelete },
    { icon: RefreshCw, label: 'Refresh', onClick: onRefresh ?? handleRefresh, enabled: true },
    { icon: Printer, label: 'Print', onClick: onPrint ?? handlePrint, enabled: true },
    { icon: Search, label: 'Find', onClick: onFind ?? handleFind, enabled: true },
    { icon: LogOut, label: 'Exit', onClick: onExit ?? handleGlobalExit, enabled: true },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 shadow-md">
      <div className="flex items-center space-x-1">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              onClick={item.enabled ? item.onClick : undefined}
              disabled={!item.enabled}
              type="button"
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${item.enabled
                ? 'text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white cursor-pointer'
                : 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                }`}
            >
              <IconComponent size={16} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubNavbar;
