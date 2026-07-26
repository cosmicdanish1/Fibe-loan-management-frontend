import React from 'react';
import { useLocation } from 'react-router-dom';
import { Save, X, Trash2, RefreshCw, Printer, Search, LogOut, type LucideIcon } from 'lucide-react';

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

  const handleGlobalExit = () => {
    // Accurate check using Router location
    const currentPath = location.pathname;
    const isDashboard = currentPath === '/' || currentPath === '/dashboard';

    // Fallback hash check just in case Router isn't mounted or using hash unexpectedly
    const isHashDashboard = window.location.hash === '#/' || window.location.hash === '#/dashboard';

    console.log('[DEBUG] Global Exit Triggered. Path:', currentPath, 'Hash:', window.location.hash);

    if (isDashboard || isHashDashboard) {
      console.log('[DEBUG] On Dashboard. Attempting to close latest child window via IPC.');
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
      console.log('Window close requested (Web Mode)');
      window.close();
    }
  };

  const navItems: NavItem[] = [
    { icon: Save, label: 'Save', onClick: onSave },
    { icon: X, label: 'Cancel', onClick: onCancel },
    { icon: Trash2, label: 'Delete', onClick: onDelete },
    { icon: RefreshCw, label: 'Refresh', onClick: onRefresh },
    { icon: Printer, label: 'Print', onClick: onPrint },
    { icon: Search, label: 'Find', onClick: onFind },
    { icon: LogOut, label: 'Exit', onClick: onExit || handleGlobalExit },
  ].map(item => ({
    ...item,
    onClick: item.onClick || (() => { })
  }));

  return (
    <div className=" border-b px-4 py-2 shadow-md">
      <div className="flex items-center space-x-1">
        {navItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              onClick={item.onClick}
              type="button"
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${item.onClick
                ? 'text-gray-700 hover:bg-gray-200 hover:text-gray-900 cursor-pointer'
                : 'text-gray-400 cursor-not-allowed'
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
