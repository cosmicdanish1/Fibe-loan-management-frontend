import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Navbar from '../navigation/Navbar';
import SubNavbar from '../navigation/SubNavbar';

const MainLayout: React.FC = () => {
    const location = useLocation();
    // Canvas appearance comes from the Redux theme, which redux-persist already
    // stores and which theme_sync / the settings-updated IPC already mirror to
    // every window.
    //
    // This previously kept its own copy in component state, seeded from
    // localStorage['appSettings'] - a key nothing in the codebase ever wrote. So
    // the background applied when saved (via the IPC listener) and then silently
    // reverted to plain white on the next launch.
    const textColor = useSelector((s: RootState) => s.theme.textColor);

    // Determine if Navbar should be shown
    // Show Navbar only on Dashboard (root path or /dashboard)
    const showNavbar = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        // Transparent: the canvas is painted on <body> by ThemeProvider, which
        // runs in every window, so tool windows get it too rather than the
        // dashboard alone.
        <div
            className="relative flex flex-col min-h-screen font-sans overflow-hidden"
            style={{ background: 'transparent' }}
        >
            {/* Top Navigation Bar - Only show on Dashboard */}
            {showNavbar && <Navbar />}

            {/* Sub Navigation Bar */}
            <SubNavbar />

            {/* Main Content Area - Render Outlet for child routes */}
            <div className="flex-grow flex flex-col overflow-auto">
                <Outlet />
            </div>

            {/* Watermark */}
            <div className="absolute bottom-4 right-4 text-sm font-medium pointer-events-none"
                style={{ color: textColor, opacity: 0.7 }}>
                Paper White Technology
            </div>
        </div>
    )
}

export default MainLayout;
