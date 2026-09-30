import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { RootState } from '../../store';
import { setTheme } from '../../store/slices/themeSlice';
import { useAuth } from '../../auth/context/AuthContext';
import { apiService } from '../../services/api';
import { configureNotificationEffects } from '../../utils/notificationEffects';
import { applyTypographyOffsets, fzBaseForScale, normalizeTypographyOffsets, readTypographyOffsets, TYPOGRAPHY_STORAGE_KEY, TYPOGRAPHY_SYNC_CHANNEL } from '../../config/typographyPreferences';
import { FONT_OPTIONS, applyAppFont } from '../../config/fontOptions';

interface ThemeProviderProps {
    children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const dispatch = useDispatch();
    const theme = useSelector((state: RootState) => state.theme);
    const { isAuthenticated } = useAuth();
    const isFirstMount = React.useRef(true);
    const isDark = theme.interfaceMode === 'dark';

    // One-time carry-over: text size and font used to live only in localStorage.
    // Fold an existing choice into the theme state so nobody loses it.
    useEffect(() => {
        try {
            const legacySize = localStorage.getItem('lms-font-size');
            const legacyFont = localStorage.getItem('lms-font-family');
            const patch: Partial<typeof theme> = {};
            if (legacySize) patch.fontScale = legacySize === '12px' ? 0.9 : legacySize === '15px' ? 1.2 : 1.0;
            if (legacyFont && FONT_OPTIONS.some(f => f.value === legacyFont)) patch.fontFamily = legacyFont;
            if (Object.keys(patch).length) dispatch(setTheme(patch));
            localStorage.removeItem('lms-font-size');
            localStorage.removeItem('lms-font-family');
        } catch { /* storage unavailable */ }
    }, [dispatch]);

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
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Soft shadows (Settings → Appearance). Off removes them app-wide for speed.
        root.classList.toggle('no-shadows', theme.shadows === false);

        // Decorative header background style (Settings → Appearance).
        root.dataset.headerStyle = theme.headerStyle ?? 'waves';

        // Custom Properties for Density, Scale, Accent, and Radius
        root.style.setProperty('--accent-color', theme.accentColor);
        root.style.setProperty('--font-scale', theme.fontScale.toString());
        root.style.setProperty('--fz-base', `${fzBaseForScale(theme.fontScale)}px`);
        if (theme.fontFamily && FONT_OPTIONS.some(f => f.value === theme.fontFamily)) applyAppFont(theme.fontFamily);
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

        if (isDark) {
            // A configured light canvas would leave the navbar and toolbars
            // sitting on a bright background, so dark mode keeps its own.
            // "Fiscal ledger" navy palette — see the html.dark block below.
            body.style.backgroundColor = '#0E1116';
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

    }, [theme, isDark]);

    // 2a. Toast + sound behaviour (Settings → Notifications / Sound Effects).
    //     Runs in every window, so a tool window honours the settings too.
    useEffect(() => {
        configureNotificationEffects({
            notifications: theme.notifications !== false,
            soundEffects: theme.soundEffects === true,
        });
    }, [theme.notifications, theme.soundEffects]);

    // Advanced typography is local to the desktop installation and syncs
    // across its windows. Only screens using the semantic tokens opt in.
    useEffect(() => {
        applyTypographyOffsets(readTypographyOffsets());
        const bc = new BroadcastChannel(TYPOGRAPHY_SYNC_CHANNEL);
        bc.onmessage = (event) => {
            const offsets = normalizeTypographyOffsets(event.data);
            localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(offsets));
            applyTypographyOffsets(offsets);
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
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    // Dark mode is the "fiscal ledger" theme: navy surfaces with a
                    // fixed emerald accent, independent of Settings → Accent Color
                    // (which still drives light mode).
                    colorPrimary: isDark ? '#10B981' : theme.accentColor,
                    borderRadius: theme.cornerRadius,
                    fontSize: 14 * theme.fontScale,
                    fontFamily: theme.fontFamily || "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    motionDurationFast: '0ms',
                    motionDurationMid: '0ms',
                    motionDurationSlow: '0ms',
                    ...(isDark ? {
                        colorBgBase: '#0E1116',
                        colorBgContainer: '#151A21',
                        colorBgElevated: '#151A21',
                        colorBgLayout: '#0E1116',
                        colorBgSpotlight: '#1C2530',
                        colorBorder: '#232B36',
                        colorBorderSecondary: '#1C2530',
                        colorText: '#E6E9EF',
                        colorTextSecondary: '#8B95A5',
                        colorTextTertiary: '#8B95A5',
                        colorFillSecondary: '#1C2530',
                        colorFillTertiary: '#1C2530',
                    } : {}),
                },
            }}
        >
            <div
                className="theme-transition-wrapper h-full w-full"
                style={{
                    fontSize: 'var(--base-font-size)',
                    '--accent-color': isDark ? '#10B981' : theme.accentColor,
                    '--corner-radius': `${theme.cornerRadius}px`,
                    '--accent-bg': isDark ? '#10B98110' : `${theme.accentColor}10`,
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

        /* Dark mode locks the accent to the fiscal-ledger emerald, overriding
           whatever Settings → Accent Color has picked (that setting still
           drives light mode via the :root block above). !important beats the
           inline --accent-color/--accent-glow set on <html> by ThemeProvider's
           JS effect, since both target the same element. */
        html.dark {
          --accent-color: #10B981 !important;
          --accent-glow: #10B98133 !important;
        }
        html.dark .theme-transition-wrapper {
          --accent-bg: #10B98110 !important;
        }
        
        html {
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
           header styling is intentionally left untouched. */
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

        /* ── Dark mode baseline: "fiscal ledger" theme ─────────────────────
           Dark-navy surfaces (#0E1116 base / #151A21 elevated / #1C2530
           hover-secondary) with an emerald accent, replacing the previous
           slate/indigo dark palette. antd components are themed via
           darkAlgorithm + the token overrides above; this layer darkens the
           Tailwind-styled containers (canvases, cards, text, borders) so the
           Interface Mode → Dark toggle visibly takes effect across all screens.
           Dark slate headers (bg-slate-900) are left untouched — they already
           read as "navy" against the new palette. */
        html.dark body { background-color: #0E1116; color: #E6E9EF; }
        html.dark .bg-white { background-color: #151A21 !important; }
        html.dark .bg-slate-50,
        html.dark .bg-slate-50\\/50,
        html.dark .bg-\\[\\#f5f6fa\\],
        html.dark .bg-\\[\\#f8fafc\\] { background-color: #0E1116 !important; }
        html.dark .bg-slate-100 { background-color: #1C2530 !important; }
        html.dark .text-slate-900,
        html.dark .text-slate-800,
        html.dark .text-slate-700 { color: #E6E9EF !important; }
        html.dark .text-slate-600,
        html.dark .text-slate-500,
        html.dark .text-slate-400 { color: #8B95A5 !important; }
        html.dark .border-slate-200,
        html.dark .border-slate-100 { border-color: #232B36 !important; }

        /* gray-* variants (the top menu bar / toolbar use text-gray / bg-gray) */
        html.dark .bg-gray-50, html.dark .bg-gray-100 { background-color: #0E1116 !important; }
        html.dark .bg-gray-200 { background-color: #1C2530 !important; }
        html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-gray-700 { color: #E6E9EF !important; }
        html.dark .text-gray-600, html.dark .text-gray-500, html.dark .text-gray-400 { color: #8B95A5 !important; }
        html.dark .border-gray-200, html.dark .border-gray-100 { border-color: #232B36 !important; }
        html.dark .hover\\:bg-gray-50:hover, html.dark .hover\\:bg-gray-100:hover, html.dark .hover\\:bg-gray-200:hover { background-color: #1C2530 !important; }
        html.dark .hover\\:bg-blue-50:hover { background-color: #0F2A21 !important; }

        /* antd surfaces — these screens use local ConfigProviders that override
           the dark algorithm, and some hardcode light table backgrounds. These
           global rules out-specify those so antd components go dark too. */
        html.dark .ant-table,
        html.dark .ant-table-tbody > tr > td,
        html.dark .ant-table-summary > tr > td,
        html.dark .ant-table-cell { background: #151A21 !important; color: #E6E9EF !important; border-color: #232B36 !important; }
        html.dark .ant-table-thead > tr > th { background: #0E1116 !important; color: #8B95A5 !important; border-color: #232B36 !important; }
        html.dark .ant-table-tbody > tr:hover > td { background: #1C2530 !important; }
        html.dark .ant-table-summary > tr > td { background: #0E1116 !important; }
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
        html.dark .ant-picker-panel { background-color: #151A21 !important; color: #E6E9EF !important; border-color: #232B36 !important; }
        html.dark .ant-input,
        html.dark .ant-input-number-input,
        html.dark .ant-select-selection-item,
        html.dark .ant-picker-input > input,
        html.dark .ant-modal-title,
        html.dark .ant-picker-cell { color: #E6E9EF !important; }
        html.dark .ant-select-item { color: #8B95A5 !important; }
        html.dark .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background-color: #1C2530 !important; }
        html.dark .ant-empty-description { color: #8B95A5 !important; }

        /* SubNavbar / AnalyticsWidgets use Tailwind's native dark: variant
           (compiled to ".dark .dark\\:…") with the old slate-800/700 palette
           directly, instead of the plain slate-* classes overridden above. */
        .dark .dark\\:bg-slate-800 { background-color: #151A21 !important; }
        .dark .dark\\:bg-slate-700,
        .dark .dark\\:hover\\:bg-slate-700:hover { background-color: #1C2530 !important; }
        .dark .dark\\:border-slate-700 { border-color: #232B36 !important; }
        .dark .dark\\:text-slate-200,
        .dark .dark\\:hover\\:text-white:hover { color: #E6E9EF !important; }
        .dark .dark\\:text-slate-400,
        .dark .dark\\:text-slate-500 { color: #8B95A5 !important; }

        .theme-transition-wrapper {
          /* transitions removed for instant theme application */
        }
      `}} />
        </ConfigProvider>
    );
};

export default ThemeProvider;
