import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { RootState } from '../../store';
import { setTheme } from '../../store/slices/themeSlice';
import { useAuth } from '../../auth/context/AuthContext';
import { apiService } from '../../services/api';
import { configureNotificationEffects } from '../../utils/notificationEffects';

interface ThemeProviderProps {
    children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const dispatch = useDispatch();
    const theme = useSelector((state: RootState) => state.theme);
    const { isAuthenticated } = useAuth();
    const isFirstMount = React.useRef(true);

    // 1. Fetch preferences on login (Only on first mount)
    useEffect(() => {
        const fetchPrefs = async () => {
            if (isAuthenticated && isFirstMount.current) {
                try {
                    console.log('[ThemeProvider] Fetching initial settings from DB...');
                    const prefRes = await apiService.getUserPreferences();

                    const newTheme: any = {};
                    if (prefRes.success && prefRes.data) {
                        Object.assign(newTheme, prefRes.data);
                    }

                    if (Object.keys(newTheme).length > 0) {
                        console.log('[ThemeProvider] Applying remote settings to local store:', newTheme);
                        dispatch(setTheme(newTheme));
                    }
                    isFirstMount.current = false;
                } catch (error) {
                    console.error('[ThemeProvider] Failed to fetch settings:', error);
                }
            }
        };
        fetchPrefs();
    }, [isAuthenticated, dispatch]);

    // 2. Apply CSS Variables to Document Root
    useEffect(() => {
        const root = document.documentElement;
        console.log('[ThemeProvider] Theme state updated, applying CSS variables:', theme.accentColor, theme.cornerRadius);

        // Interface Mode (Dark/Light)
        if (theme.interfaceMode === 'dark' || (theme.interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Custom Properties for Density, Scale, Accent, and Radius
        root.style.setProperty('--accent-color', theme.accentColor);
        root.style.setProperty('--font-scale', theme.fontScale.toString());
        root.style.setProperty('--ui-density', theme.density.toString());
        root.style.setProperty('--corner-radius', `${theme.cornerRadius}px`);

        // Apply Extended Preferences
        if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
        if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
        if (theme.backgroundColor1) root.style.setProperty('--bg-color-1', theme.backgroundColor1);
        if (theme.backgroundColor2) root.style.setProperty('--bg-color-2', theme.backgroundColor2);

        // Derived variables for scaling
        root.style.setProperty('--base-font-size', `${14 * theme.fontScale}px`);
        root.style.setProperty('--base-padding', `${1 * theme.density}rem`);
        root.style.setProperty('--base-gap', `${0.75 * theme.density}rem`);

        // ── Canvas appearance (Settings → Background) ────────────────────
        // Painted on <body> rather than inside MainLayout, because MainLayout
        // wraps only the /dashboard route — every tool window is a standalone
        // route and so never received the background at all. ThemeProvider
        // renders in every window, so this reaches all of them.
        const body = document.body;
        body.style.backgroundImage = '';
        body.style.backgroundSize = '';
        body.style.backgroundPosition = '';
        body.style.backgroundRepeat = '';

        const darkMode = theme.interfaceMode === 'dark'
            || (theme.interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (darkMode) {
            // A configured light canvas would leave the navbar and toolbars
            // sitting on a bright background, so dark mode keeps its own.
            body.style.backgroundColor = '#0f172a';
        } else if (theme.backgroundType === 'gradient') {
            body.style.backgroundColor = theme.backgroundColor1 || '#ffffff';
            body.style.backgroundImage =
                `linear-gradient(135deg, ${theme.backgroundColor1}, ${theme.backgroundColor2})`;
        } else if (theme.backgroundType === 'image' && theme.backgroundImage) {
            body.style.backgroundColor = theme.backgroundColor1 || '#ffffff';
            body.style.backgroundImage = `url(${theme.backgroundImage})`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundRepeat = 'no-repeat';
        } else {
            body.style.backgroundColor = theme.backgroundColor1 || '#ffffff';
        }

    }, [theme]);

    // 2a. Toast + sound behaviour (Settings → Notifications / Sound Effects).
    //     Runs in every window, so a tool window honours the settings too.
    useEffect(() => {
        configureNotificationEffects({
            notifications: theme.notifications !== false,
            soundEffects: theme.soundEffects === true,
        });
    }, [theme.notifications, theme.soundEffects]);

    // 2b. Header gradient (localStorage-backed, per-machine UI pref — same
    //     pattern as dashboard background / font size). Applied as a CSS var
    //     that overrides the app's hardcoded header gradient, and kept in sync
    //     across windows via BroadcastChannel.
    useEffect(() => {
        const DEFAULT_HEADER_GRADIENT = 'linear-gradient(to right, #0f172a, #312e81, #0f172a)';
        const apply = (value?: string) => {
            document.documentElement.style.setProperty('--header-gradient', value || DEFAULT_HEADER_GRADIENT);
        };
        apply(localStorage.getItem('lms-header-gradient') || undefined);

        const bc = new BroadcastChannel('lms_header_gradient');
        bc.onmessage = (event) => {
            if (event.data?.headerGradient) {
                localStorage.setItem('lms-header-gradient', event.data.headerGradient);
                apply(event.data.headerGradient);
            }
        };
        return () => bc.close();
    }, []);

    // 3. Listen for IPC and BroadcastChannel updates (Multi-window sync)
    useEffect(() => {
        console.log('[ThemeProvider] Initializing multi-channel sync listener...');

        // Electron IPC sync
        let removeIpcListener: (() => void) | undefined;
        if (window.electronAPI?.on) {
            removeIpcListener = window.electronAPI.on('settings-updated', (_event: any, newTheme: any) => {
                console.log('[ThemeProvider] IPC Sync Received:', newTheme);
                if (newTheme) dispatch(setTheme(newTheme));
            });
        }

        // Web BroadcastChannel sync (Secondary fallback)
        const bc = new BroadcastChannel('theme_sync');
        bc.onmessage = (event) => {
            console.log('[ThemeProvider] BroadcastChannel Sync Received:', event.data);
            if (event.data) dispatch(setTheme(event.data));
        };

        return () => {
            console.log('[ThemeProvider] Cleaning up sync listeners...');
            if (removeIpcListener) removeIpcListener();
            bc.close();
        };
    }, [dispatch]);

    // 4. Dynamic Ant Design Configuration
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.interfaceMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: theme.accentColor,
                    borderRadius: theme.cornerRadius,
                    fontSize: 14 * theme.fontScale,
                    fontFamily: theme.fontFamily || "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    motionDurationFast: '0ms',
                    motionDurationMid: '0ms',
                    motionDurationSlow: '0ms',
                },
            }}
        >
            <div
                className="theme-transition-wrapper h-full w-full"
                style={{
                    fontSize: 'var(--base-font-size)',
                    '--accent-color': theme.accentColor,
                    '--corner-radius': `${theme.cornerRadius}px`,
                    '--accent-bg': `${theme.accentColor}10`,
                } as React.CSSProperties}
            >
                {children}
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
        :root {
          --accent-color: ${theme.accentColor};
          --accent-glow: ${theme.accentColor}33;
          --corner-radius: ${theme.cornerRadius}px;
          --font-family: ${theme.fontFamily || 'Inter, sans-serif'};
        }
        
        html {
          font-size: calc(100% * ${theme.fontScale});
          font-family: var(--font-family);
        }

        body {
          font-family: var(--font-family);
          color: ${theme.textColor || 'inherit'};
        }

        /* ── Layout density ───────────────────────────────────────────────
           Settings → Layout Density had no effect anywhere: it only defined
           .density-pad / .density-gap and the --base-padding / --base-gap
           variables, and not a single component ever used them.

           It now scales the Tailwind spacing utilities the screens actually
           use. Comfortable is 1.0, which reproduces Tailwind's own values
           exactly, so this is a no-op until Compact (0.8) is selected.

           No !important, so a component that sets padding inline still wins. */
        .p-0\\.5  { padding: calc(0.125rem * var(--ui-density, 1)); }
        .p-1      { padding: calc(0.25rem  * var(--ui-density, 1)); }
        .p-1\\.5  { padding: calc(0.375rem * var(--ui-density, 1)); }
        .p-2      { padding: calc(0.5rem   * var(--ui-density, 1)); }
        .p-3      { padding: calc(0.75rem  * var(--ui-density, 1)); }
        .p-4      { padding: calc(1rem     * var(--ui-density, 1)); }

        .px-0\\.5 { padding-left: calc(0.125rem * var(--ui-density, 1)); padding-right: calc(0.125rem * var(--ui-density, 1)); }
        .px-1     { padding-left: calc(0.25rem  * var(--ui-density, 1)); padding-right: calc(0.25rem  * var(--ui-density, 1)); }
        .px-1\\.5 { padding-left: calc(0.375rem * var(--ui-density, 1)); padding-right: calc(0.375rem * var(--ui-density, 1)); }
        .px-2     { padding-left: calc(0.5rem   * var(--ui-density, 1)); padding-right: calc(0.5rem   * var(--ui-density, 1)); }
        .px-3     { padding-left: calc(0.75rem  * var(--ui-density, 1)); padding-right: calc(0.75rem  * var(--ui-density, 1)); }
        .px-4     { padding-left: calc(1rem     * var(--ui-density, 1)); padding-right: calc(1rem     * var(--ui-density, 1)); }

        .py-0\\.5 { padding-top: calc(0.125rem * var(--ui-density, 1)); padding-bottom: calc(0.125rem * var(--ui-density, 1)); }
        .py-1     { padding-top: calc(0.25rem  * var(--ui-density, 1)); padding-bottom: calc(0.25rem  * var(--ui-density, 1)); }
        .py-1\\.5 { padding-top: calc(0.375rem * var(--ui-density, 1)); padding-bottom: calc(0.375rem * var(--ui-density, 1)); }
        .py-2     { padding-top: calc(0.5rem   * var(--ui-density, 1)); padding-bottom: calc(0.5rem   * var(--ui-density, 1)); }
        .py-3     { padding-top: calc(0.75rem  * var(--ui-density, 1)); padding-bottom: calc(0.75rem  * var(--ui-density, 1)); }
        .py-4     { padding-top: calc(1rem     * var(--ui-density, 1)); padding-bottom: calc(1rem     * var(--ui-density, 1)); }

        .gap-0\\.5 { gap: calc(0.125rem * var(--ui-density, 1)); }
        .gap-1     { gap: calc(0.25rem  * var(--ui-density, 1)); }
        .gap-1\\.5 { gap: calc(0.375rem * var(--ui-density, 1)); }
        .gap-2     { gap: calc(0.5rem   * var(--ui-density, 1)); }
        .gap-3     { gap: calc(0.75rem  * var(--ui-density, 1)); }
        .gap-4     { gap: calc(1rem     * var(--ui-density, 1)); }

        .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(0.25rem * var(--ui-density, 1)); }
        .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(0.5rem  * var(--ui-density, 1)); }
        .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(0.75rem * var(--ui-density, 1)); }
        
        .ant-btn, .ant-input, .ant-select-selector, .ant-picker, .ant-modal-content {
          border-radius: ${theme.cornerRadius}px !important;
          font-family: var(--font-family) !important;
        }

        /* ── Accent color everywhere ──────────────────────────────────────
           Indigo is the app's de-facto accent (buttons / highlights / active
           states are hardcoded as indigo-*). Remap those utilities to the
           chosen accent so the Settings → Accent Color picker drives the whole
           UI. Solid shades use the accent directly; light tints/derived shades
           are mixed against white so they track the accent too. Dark slate
           gradients in headers are intentionally left untouched. */
        .bg-indigo-600, .bg-indigo-500,
        .hover\\:bg-indigo-500:hover, .hover\\:bg-indigo-600:hover {
          background-color: var(--accent-color) !important;
        }
        .text-indigo-600, .text-indigo-500, .text-indigo-700,
        .hover\\:text-indigo-600:hover, .group:hover .group-hover\\:text-indigo-300 {
          color: var(--accent-color) !important;
        }
        .border-indigo-400, .border-indigo-500, .border-indigo-600 {
          border-color: var(--accent-color) !important;
        }
        .ring-indigo-100, .ring-indigo-200, .ring-indigo-500 {
          --tw-ring-color: var(--accent-color) !important;
        }
        /* Themeable header gradient — the dark app header bar follows the
           Settings → Header Gradient choice.

           Matched on the dark starting colour rather than the full three-class
           combo: most windows use "from-slate-900 via-indigo-900 to-slate-900",
           but ~11 headers use other middle shades (amber, rose, emerald, blue,
           slate) and were silently left out of the theme before.

           Deliberately NOT matched: banners that start on a saturated colour
           (from-red-600, from-rose-500, from-amber-600/50). Those are alert and
           warning strips, not header bars — recolouring them would destroy the
           status signal they carry. */
        .bg-gradient-to-r.from-slate-900,
        .bg-gradient-to-r.from-slate-800 {
          background-image: var(--header-gradient, linear-gradient(to right, #0f172a, #312e81, #0f172a)) !important;
        }

        /* ── Corner radius ────────────────────────────────────────────────
           Settings → Corner Radius reached only antd controls. Every card and
           panel uses Tailwind's rounded-* utilities, which are fixed values —
           so the slider rounded the inputs but not the boxes around them.

           The multipliers reproduce Tailwind's own scale exactly at the
           default 8px, so this is a pixel-for-pixel no-op until the slider is
           actually moved.

           Deliberately NOT !important: 153 components set borderRadius inline,
           including six 50% circles, and those shapes must still win. Ordering
           alone beats the utility class, since this block is injected after
           the stylesheet.

           rounded-full is left out entirely — pills and avatars stay round. */
        .rounded-sm  { border-radius: calc(var(--corner-radius) * 0.25); }
        .rounded     { border-radius: calc(var(--corner-radius) * 0.5); }
        .rounded-md  { border-radius: calc(var(--corner-radius) * 0.75); }
        .rounded-lg  { border-radius: var(--corner-radius); }
        .rounded-xl  { border-radius: calc(var(--corner-radius) * 1.5); }
        .rounded-2xl { border-radius: calc(var(--corner-radius) * 2); }
        .rounded-3xl { border-radius: calc(var(--corner-radius) * 3); }

        .bg-indigo-50  { background-color: color-mix(in srgb, var(--accent-color) 10%, white) !important; }
        .bg-indigo-100 { background-color: color-mix(in srgb, var(--accent-color) 18%, white) !important; }
        .border-indigo-100, .border-indigo-200 { border-color: color-mix(in srgb, var(--accent-color) 25%, white) !important; }
        .text-indigo-300, .text-indigo-400 { color: color-mix(in srgb, var(--accent-color) 65%, white) !important; }

        /* ── Dark mode baseline ───────────────────────────────────────────
           antd components are themed via darkAlgorithm; this layer darkens the
           Tailwind-styled containers (canvases, cards, text, borders) so the
           Interface Mode → Dark toggle visibly takes effect across all screens.
           Dark slate headers (bg-slate-900) already look correct in dark mode. */
        html.dark body { background-color: #0f172a; color: #e2e8f0; }
        html.dark .bg-white { background-color: #1e293b !important; }
        html.dark .bg-slate-50,
        html.dark .bg-slate-50\\/50,
        html.dark .bg-\\[\\#f5f6fa\\],
        html.dark .bg-\\[\\#f8fafc\\] { background-color: #0f172a !important; }
        html.dark .bg-slate-100 { background-color: #334155 !important; }
        html.dark .text-slate-900,
        html.dark .text-slate-800,
        html.dark .text-slate-700 { color: #e2e8f0 !important; }
        html.dark .text-slate-600,
        html.dark .text-slate-500,
        html.dark .text-slate-400 { color: #94a3b8 !important; }
        html.dark .border-slate-200,
        html.dark .border-slate-100 { border-color: #334155 !important; }

        /* gray-* variants (the top menu bar / toolbar use text-gray / bg-gray) */
        html.dark .bg-gray-50, html.dark .bg-gray-100 { background-color: #0f172a !important; }
        html.dark .bg-gray-200 { background-color: #334155 !important; }
        html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-gray-700 { color: #e2e8f0 !important; }
        html.dark .text-gray-600, html.dark .text-gray-500, html.dark .text-gray-400 { color: #94a3b8 !important; }
        html.dark .border-gray-200, html.dark .border-gray-100 { border-color: #334155 !important; }
        html.dark .hover\\:bg-gray-50:hover, html.dark .hover\\:bg-gray-100:hover, html.dark .hover\\:bg-gray-200:hover { background-color: #334155 !important; }
        html.dark .hover\\:bg-blue-50:hover { background-color: #1e3a5f !important; }

        /* antd surfaces — these screens use local ConfigProviders that override
           the dark algorithm, and some hardcode light table backgrounds. These
           global rules out-specify those so antd components go dark too. */
        html.dark .ant-table,
        html.dark .ant-table-tbody > tr > td,
        html.dark .ant-table-summary > tr > td,
        html.dark .ant-table-cell { background: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .ant-table-thead > tr > th { background: #0f172a !important; color: #cbd5e1 !important; border-color: #334155 !important; }
        html.dark .ant-table-tbody > tr:hover > td { background: #334155 !important; }
        html.dark .ant-table-summary > tr > td { background: #0f172a !important; }
        html.dark .ant-input,
        html.dark .ant-input-affix-wrapper,
        html.dark .ant-input-number,
        html.dark .ant-input-number-input,
        html.dark .ant-select-selector,
        html.dark .ant-picker,
        html.dark .ant-modal-content,
        html.dark .ant-modal-header,
        html.dark .ant-select-dropdown,
        html.dark .ant-picker-panel-container,
        html.dark .ant-picker-panel { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .ant-input,
        html.dark .ant-input-number-input,
        html.dark .ant-select-selection-item,
        html.dark .ant-picker-input > input,
        html.dark .ant-modal-title,
        html.dark .ant-picker-cell { color: #e2e8f0 !important; }
        html.dark .ant-select-item { color: #cbd5e1 !important; }
        html.dark .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background-color: #334155 !important; }
        html.dark .ant-empty-description { color: #94a3b8 !important; }

        .theme-transition-wrapper {
          /* transitions removed for instant theme application */
        }
      `}} />
        </ConfigProvider>
    );
};

export default ThemeProvider;
