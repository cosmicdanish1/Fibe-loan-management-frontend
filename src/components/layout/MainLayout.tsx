import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Navbar from '../navigation/Navbar';
import SubNavbar from '../navigation/SubNavbar';
import UpdateNotice from '../UpdateNotice';
import { apiService } from '../../services/api';
import OnboardingHost from '../../features/onboarding/OnboardingHost';

const MainLayout: React.FC = () => {
    const location = useLocation();

    // "Who is online": tell the server this PC's app is still open, once a minute. It lives here
    // (not in every window) because MainLayout exists only in the main window, so there is one
    // signal per PC. Failures are ignored: a missed beat just means the next one catches up.
    useEffect(() => {
        const beat = () => { apiService.post('/auth/heartbeat').catch(() => undefined); };
        beat();
        const timer = window.setInterval(beat, 60_000);
        return () => window.clearInterval(timer);
    }, []);
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
            className="relative flex flex-col h-screen font-sans overflow-hidden"
            style={{ background: 'transparent' }}
        >
            {/* Top Navigation Bar + Sub Navigation Bar — pinned together so
                neither scrolls out of view when the page content underneath
                scrolls. The layout is exactly one window tall (h-screen) and
                only the content area below scrolls; with min-h-screen the whole
                page grew past the window and overflow-hidden here disabled
                sticky, so the bars scrolled away with it. */}
            <div className="sticky top-0 z-40 shrink-0">
                {showNavbar && <Navbar />}
                <SubNavbar />
            </div>

            {/* Main Content Area - Render Outlet for child routes */}
            <div className="flex-1 min-h-0 flex flex-col overflow-auto">
                <Outlet />
            </div>

            {/* New-version notice: dashboard window only, not every tool window */}
            {showNavbar && <UpdateNotice />}

            {/* First-login walkthrough: dashboard window only */}
            {showNavbar && <OnboardingHost />}

            {/* Watermark */}
            <div className="absolute bottom-4 right-4 text-sm font-medium pointer-events-none"
                style={{ color: textColor, opacity: 0.7 }}>
                Paper White Technology
            </div>
        </div>
    )
}

export default MainLayout;
