import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Navbar from '../navigation/Navbar';
import SubNavbar from '../navigation/SubNavbar';

export interface AppSettings {
    backgroundType: 'image' | 'gradient' | 'solid';
    backgroundColor1: string;
    backgroundColor2: string;
    backgroundImage: string | null;
    textColor: string;
}

const defaultSettings: AppSettings = {
    backgroundType: 'solid',
    backgroundColor1: '#ffffff',
    backgroundColor2: '#000000',
    backgroundImage: null,
    textColor: '#1f2937'
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const interfaceMode = useSelector((s: RootState) => s.theme.interfaceMode);
    const isDark = interfaceMode === 'dark'
        || (interfaceMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Use a ref to track current settings to avoid stale closures
    const settingsRef = React.useRef<AppSettings>(defaultSettings);

    // Update the ref whenever settings change
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        // Load settings from localStorage
        const loadSettings = () => {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings(parsedSettings);
                settingsRef.current = parsedSettings;
            }
        };

        // Handle settings update from CustomEvent (same window)
        const handleSettingsUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<AppSettings>;
            if (customEvent.detail) {
                // Force update by creating a new object
                setSettings({ ...customEvent.detail });
                settingsRef.current = customEvent.detail;
            }
        };

        // Handle settings update from postMessage (cross-window)
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'settings-updated' && event.data?.settings) {
                // Force update by creating a new object
                setSettings({ ...event.data.settings });
                settingsRef.current = event.data.settings;
            }
        };

        // Handle settings update from main process (Electron IPC)
        const handleIpcSettingsUpdate = (_event: any, newSettings: AppSettings) => {
            // Force update by creating a new object
            setSettings({ ...newSettings });
            settingsRef.current = newSettings;
        };

        // Load initial settings
        loadSettings();

        // Set up event listeners
        window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);
        window.addEventListener('message', handleMessage);

        // Set up IPC listener if in Electron
        if (window.electronAPI?.onSettingsUpdate) {
            window.electronAPI.onSettingsUpdate(handleIpcSettingsUpdate);
        }

        // Clean up
        return () => {
            window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
            window.removeEventListener('message', handleMessage);

            // Clean up IPC listener
            if (window.electronAPI?.removeAllListeners) {
                window.electronAPI.removeAllListeners('settings-updated');
            }
        };
    }, []);

    // Generate background style based on settings
    const getBackgroundStyle = () => {
        // In dark mode the configured (light) canvas would leave the navbar/toolbar
        // sitting on a bright background, so force a dark canvas.
        if (isDark) return { backgroundColor: '#0f172a' };
        switch (settings.backgroundType) {
            case 'solid':
                return { backgroundColor: settings.backgroundColor1 };
            case 'gradient':
                return {
                    background: `linear-gradient(135deg, ${settings.backgroundColor1}, ${settings.backgroundColor2})`
                };
            case 'image':
                return settings.backgroundImage
                    ? {
                        backgroundImage: `url(${settings.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }
                    : {};
            default:
                return {};
        }
    };

    // Determine if Navbar should be shown
    // Show Navbar only on Dashboard (root path or /dashboard)
    const showNavbar = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <div
            className="relative flex flex-col min-h-screen font-sans overflow-hidden"
            style={getBackgroundStyle()}
        >
            {/* Top Navigation Bar - Only show on Dashboard */}
            {showNavbar && <Navbar />}

            {/* Sub Navigation Bar */}
            <SubNavbar />

            {/* Main Content Area - Render Outlet for child routes */}
            <div className="flex-grow flex flex-col overflow-auto">
                <Outlet context={{ settings }} />
            </div>

            {/* Watermark */}
            <div className="absolute bottom-4 right-4 text-sm font-medium pointer-events-none"
                style={{ color: settings.textColor, opacity: 0.7 }}>
                Paper White Technology
            </div>
        </div>
    )
}

export default MainLayout;
