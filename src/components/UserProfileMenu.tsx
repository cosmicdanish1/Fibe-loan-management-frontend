import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/context/AuthContext';
import { NotificationBell } from './topbar/NotificationBell';

// ─── Component ────────────────────────────────────────────────────────────────

export const UserProfileMenu: React.FC = () => {
  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Close the profile dropdown on outside click ───────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    let ok = false;
    if ((window as any).electronAPI?.showMessageBox) {
      const res = await (window as any).electronAPI.showMessageBox({
        type: 'question', title: 'electron-react-ts',
        message: 'Confirm Logout', detail: 'Are you sure you want to logout?',
        buttons: ['Logout', 'Cancel'], defaultId: 1, cancelId: 1,
      });
      ok = res?.response === 0;
    } else {
      ok = window.confirm('Are you sure you want to logout?');
    }
    if (ok) logout();
  };

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3">

      {/* ────── NOTIFICATIONS ────── */}
      <NotificationBell />

      {/* ────── USER PROFILE DROPDOWN ────── */}
      <div className="relative" ref={profileRef} data-tour="profile-menu">
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {user.username?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <span className="font-medium text-sm hidden sm:block">{user.username}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[200]">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user.email ?? `${user.username}@trust.in`}</p>
              {user.role && <p className="text-xs text-blue-600 mt-1 font-medium">Role: {user.role}</p>}
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  if (window.electronAPI?.openNewWindow) {
                    window.electronAPI.openNewWindow('/my-profile');
                  } else {
                    window.location.hash = '#/my-profile';
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => { setProfileOpen(false); window.electronAPI?.openNewWindow?.('/change-password'); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" /> Change Password
              </button>
            </div>

            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileMenu;
