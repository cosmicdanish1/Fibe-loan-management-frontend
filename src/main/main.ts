import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { randomUUID } from 'crypto';
import { initMainLogger } from './logger';

// Dev vs packaged — use Electron's built-in flag instead of the external
// `electron-is-dev` module (which isn't a production dep, so it's absent from
// the packaged app.asar and crashes the main process on launch).
// isPackaged is false when running from source (dev) and true in the installed app.
const isDev = !app.isPackaged;

initMainLogger();

// ===== APP RUN ID (session lifetime) =====
// A fresh id minted on every launch of the app. Renderers stamp their stored
// session with it at login and re-check it at startup: if the stored id doesn't
// match, the session belongs to a PREVIOUS run and is discarded, forcing a new
// login. This is what makes "close the app => logged out" hold.
//
// Why an id rather than clearing storage on quit: a crash or a force-kill never
// runs quit handlers, but it can't fake a matching id either — any new process
// gets a new id, so a stale session is always rejected.
//
// All windows of one run share this id (localStorage is per-origin, so child
// tool windows stay logged in alongside the dashboard).
const APP_RUN_ID = randomUUID();

// Synchronous on purpose: the renderer needs this while building its initial
// auth state, before any React render or async IPC could resolve.
ipcMain.on('get-app-run-id', (event) => {
  event.returnValue = APP_RUN_ID;
});

// The logon dialog reports a successful sign-in. The session itself already
// lives in localStorage, which the dashboard window shares (same origin), so
// nothing needs to be handed over here — we only swap the windows.
ipcMain.on('login-success', () => {
  console.log('[DEBUG] Login succeeded — opening dashboard');
  openDashboardAfterLogin();
});

// ===== SERVER CONFIG (LAN deployment) =====
// Priority: server-config.json (any location) → localhost fallback in dev → empty in prod
//
// We scan MULTIPLE paths so it works whether launched from IDE, bat file, or packaged .exe
// userData  = C:\Users\<name>\AppData\Roaming\electron-react-ts  (production + dev)
// cwd       = project root when launched from terminal / VS Code
// appPath   = Electron's app directory (inside asar in prod, project root in dev)
// __dirname = dist/main/ folder inside build output

const SERVER_CONFIG_FILENAME = 'server-config.json';
const SERVER_CONFIG_PATH = path.join(app.getPath('userData'), SERVER_CONFIG_FILENAME);

// Install-folder config — sits next to the .exe, e.g.
//   C:\Program Files\Fibe Loan Management\server-config.json
// The installer creates it (empty IP) and grants Users write permission, so
// this ONE visible file is where the IP lives: the app saves to it, and a
// technician can open/edit it directly if the server IP ever changes.
const INSTALL_CONFIG_PATH = path.join(path.dirname(app.getPath('exe')), SERVER_CONFIG_FILENAME);

interface ServerConfig {
  serverIP: string;
  /** Optional extra addresses (e.g. the server's second NIC) — tried in
   *  parallel alongside serverIP; whichever answers first wins. */
  serverIPs?: string[];
}

function readServerConfig(): ServerConfig | null {
  // BUG FIX: scan multiple candidate paths so dev-mode LAN testing works
  // regardless of how Electron was launched (terminal, bat, IDE, packaged)
  const candidates = [
    INSTALL_CONFIG_PATH,                                             // install folder (primary, production)
    SERVER_CONFIG_PATH,                                              // userData (fallback / legacy installs)
    path.join(process.cwd(), SERVER_CONFIG_FILENAME),               // project root (dev terminal)
    path.join(app.getAppPath(), SERVER_CONFIG_FILENAME),            // app.getAppPath() (dev)
    path.join(__dirname, SERVER_CONFIG_FILENAME),                   // dist/main/
    path.join(__dirname, '..', SERVER_CONFIG_FILENAME),             // dist/
    path.join(__dirname, '..', '..', SERVER_CONFIG_FILENAME),       // project root
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf-8');
        const parsed = JSON.parse(raw);
        // Empty serverIP ("") is the "not configured yet" sentinel written by
        // the installer — falsy, so this correctly falls through to null and
        // the app shows the first-launch Setup screen.
        if (parsed?.serverIP && typeof parsed.serverIP === 'string') {
          const serverIPs = Array.isArray(parsed.serverIPs)
            ? parsed.serverIPs.filter((ip: unknown): ip is string => typeof ip === 'string' && ip.trim() !== '')
            : undefined;
          return { serverIP: parsed.serverIP, serverIPs };
        }
      }
    } catch { /* try next */ }
  }
  return null;
}

/** Probe one address: does it answer on :3001? Resolves the address back so
 *  callers racing multiple candidates know which one won. */
function probeServerIP(ip: string, timeoutMs = 2500): Promise<string | null> {
  return new Promise((resolve) => {
    const req = http.get(`http://${ip}:3001/api/v1/license/status`, (res) => {
      res.resume(); // discard body
      resolve(ip);
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
  });
}

/** Race every candidate in parallel; return the first one that answers. */
function raceServerIPs(ips: string[], timeoutMs = 2500): Promise<string | null> {
  return new Promise((resolve) => {
    if (ips.length === 0) { resolve(null); return; }
    let settled = false;
    let remaining = ips.length;
    ips.forEach((ip) => {
      probeServerIP(ip, timeoutMs).then((result) => {
        remaining--;
        if (settled) return;
        if (result) { settled = true; resolve(result); }
        else if (remaining === 0) { resolve(null); }
      });
    });
  });
}

/**
 * Turns a saved config into a live backend origin. Tries serverIP AND every
 * entry in serverIPs at once — LAN + WiFi, a second NIC on the server,
 * whatever's listed — and uses whichever answers first. If none answer right
 * now, still returns the primary serverIP so the app attempts a real
 * connection (and shows a normal network error) instead of silently
 * pretending to be unconfigured.
 */
async function resolveConfiguredOrigin(cfg: ServerConfig): Promise<string> {
  const candidates = Array.from(new Set(
    [cfg.serverIP, ...(cfg.serverIPs ?? [])]
      .map((ip) => (ip || '').trim())
      .filter(Boolean)
  ));
  if (candidates.length === 0) return `http://${cfg.serverIP}:3001`;
  const working = await raceServerIPs(candidates);
  return `http://${working ?? candidates[0]}:3001`;
}

/**
 * Quick non-blocking probe: can we reach localhost:3001 right now?
 * 1.5 s timeout — fast enough for startup, long enough on slow machines.
 * Used to auto-configure the server PC without showing the setup screen.
 */
function probeLocalhost(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/v1/license/status', (res) => {
      res.resume(); // discard body
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function getBackendOrigin(): Promise<string> {
  // Priority: explicit config (racing all listed IPs) → localhost fallback.
  const cfg = readServerConfig();
  if (cfg) return resolveConfiguredOrigin(cfg);
  // Always try localhost as fallback — on server PC the backend IS here;
  // on a client PC with no config this will simply time-out harmlessly.
  return 'http://localhost:3001';
}

// ===== LICENSE CHECK (once per app launch) =====
// Stored here in the main process so every renderer window shares the same result
let licenseResult: any = null;

function httpGetJson(url: string, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Backend returns double-wrapped: { data: { data: { status, ... } } }
          const unwrapped = parsed?.data?.data ?? parsed?.data ?? parsed;
          resolve(unwrapped);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
  });
}

async function fetchLicenseFromBackend(): Promise<any> {
  const origin = await getBackendOrigin();
  if (!origin) return null;
  // Must include the global API prefix (api/v1) used by NestJS
  return httpGetJson(`${origin}/api/v1/license/status`);
}

// Debug flag — verbose only in development builds
const DEBUG_LOGGING = isDev;

// Global references to windows
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
// Small logon dialog shown before the dashboard exists (see createLoginWindow).
let loginWindow: BrowserWindow | null = null;

// Type declarations for Electron modules
declare global {
  namespace Electron {
    interface Screen {
      getPrimaryDisplay(): { workAreaSize: { width: number; height: number } };
    }
  }
}

// Helper function to safely access mainWindow
function getMainWindow(): BrowserWindow {
  if (!mainWindow) {
    throw new Error('Main window is not initialized');
  }
  return mainWindow;
}

// Small logon dialog, shown before the dashboard exists — mirrors how the
// legacy society software starts: a compact credentials box, and only once it
// succeeds does the full application window appear.
//
// It loads the SAME renderer bundle at the #/login route, so the existing
// LoginPage/LoginForm and their styling are reused as-is.
function createLoginWindow(): void {
  // Already open — just focus it rather than stacking a second dialog.
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    // Snug around the form — the dialog IS the card, so there is no page
    // background or centering gutter to leave room for.
    width: 420,
    height: 540,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    // No OS chrome: the dark Windows title bar clashed with the dialog. The
    // renderer draws its own accent-coloured bar instead (see LoginPage), which
    // carries the title, the close button and the drag region.
    frame: false,
    backgroundColor: '#ffffff',
    title: 'Logon To Fibe Loan Management',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webgl: false,
      plugins: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      disableBlinkFeatures: 'Auxclick'
    },
    // Hidden until painted, so the user never sees a blank white box while the
    // renderer bundle loads.
    show: false,
    autoHideMenuBar: true,
    skipTaskbar: false,
  });

  applySecurityHeaders(loginWindow);

  if (isDev) {
    loginWindow.loadURL('http://localhost:5177/#/login')
      .catch(err => console.error('Failed to load login window from dev server:', err));
  } else {
    loginWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/login' })
      .catch(err => console.error('Failed to load login window:', err));
  }

  // Keep the dialog's own title. Electron otherwise adopts the document title,
  // which for the shared bundle is the generic app title.
  loginWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  loginWindow.once('ready-to-show', () => {
    loginWindow?.show();
    loginWindow?.focus();
    console.log('[DEBUG] Login window opened');
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

// Login succeeded: bring up the dashboard, THEN dismiss the dialog.
//
// Order matters. 'window-all-closed' quits the app, so closing the login window
// first would leave zero windows open for an instant and kill the app before
// the dashboard ever appeared.
function openDashboardAfterLogin(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  } else {
    createWindow();
  }

  const dialog = loginWindow;
  loginWindow = null;
  if (dialog && !dialog.isDestroyed()) {
    dialog.close();
  }
}

// CSP and hardening headers. Registered on the window's session, which every
// window shares — but the login window is created BEFORE the dashboard now, so
// this has to be callable for whichever window comes up first.
function applySecurityHeaders(win: BrowserWindow): void {
  const csp = [
    "default-src 'self'",
    // Script sources - allow unsafe-eval in dev for HMR
    "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : "") + " https://unpkg.com",
    // Style sources
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Font sources
    "font-src 'self' https://fonts.gstatic.com data:",
    // Image sources
    "img-src 'self' data: blob: https:",
    // Connect sources
    // BUG FIX: dev mode must also allow http://*:3001 so LAN IPs work when
    // a developer or client PC is connecting to a remote server in dev mode.
    isDev
      ? "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* http://*:3001"
      : "connect-src 'self' http://*:3001 http://localhost:3001",
    // Media sources
    "media-src 'self'",
    // Object sources
    "object-src 'none'",
    // Frame sources
    "frame-src 'self'",
    // Form actions
    "form-action 'self'",
    // Base URI
    "base-uri 'self'"
  ].join('; ');

  win.webContents.session.webRequest.onHeadersReceived(
    (details: Electron.OnHeadersReceivedListenerDetails,
      callback: (response: Electron.HeadersReceivedResponse) => void) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['SAMEORIGIN'],
          'X-XSS-Protection': ['1; mode=block']
        }
      });
    }
  );
}

function createWindow(): void {
  // Create the browser window with security-focused settings
  // FIXED: Only dashboard should be full screen, other windows should use normal sizes
  mainWindow = new BrowserWindow({
    width: 1400,  // Dashboard default size (will be maximized)
    height: 900,  // Dashboard default size (will be maximized)
    webPreferences: {
      // Security settings
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,

      // Performance settings
      webgl: false,
      plugins: false,
      experimentalFeatures: false,

      // Required settings
      preload: isDev
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.js'),

      // Additional security settings
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,

      // Disable features that could be exploited
      webviewTag: false,
      navigateOnDragDrop: false,

      // Enable additional security features
      disableBlinkFeatures: 'Auxclick'
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    // FIXED: Dashboard window management
    alwaysOnTop: false, // Dashboard should not be always on top
    skipTaskbar: false, // Keep in taskbar for easy access
  })

  // UPDATE STACK: Add main window to stack
  updateActiveWindow('/dashboard', mainWindow);

  // TRACK ACTIVE WINDOW: Update stack when main window gets focus
  mainWindow.on('focus', () => {
    updateActiveWindow('/dashboard', mainWindow!);
  });

  applySecurityHeaders(mainWindow);

  // Load the app
  const loadApp = () => {
    const window = getMainWindow();
    if (isDev) {
      // In development, load from Vite dev server
      window.loadURL('http://localhost:5177')
        .catch(err => {
          console.error('Failed to load dev server:', err);
        });

      // Open the DevTools in development mode
      window.webContents.on('did-frame-finish-load', () => {
        window.webContents.openDevTools();
      });
    } else {
      // In production, load from file
      window.loadFile(path.join(__dirname, '../renderer/index.html'))
        .catch(err => {
          console.error('Failed to load index.html:', err);
        });
    }
  };

  // Initial load
  loadApp();

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.maximize(); // Maximize the dashboard window
    mainWindow?.focus(); // Ensure main window has focus

    // FIXED: Dashboard should be maximized but not always on top
    // This allows other windows to appear above it when needed
    mainWindow?.setAlwaysOnTop(false);

    console.log('[DEBUG] Dashboard window opened in maximized mode');
  })

  // Handle window closed - CRITICAL: Dashboard is main window, closing it should quit entire app
  mainWindow.on('closed', () => {
    console.log('[DEBUG] Main dashboard window closed - shutting down entire application');

    // Close all other windows immediately
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (window && !window.isDestroyed()) {
        try {
          window.close();
        } catch (error) {
          console.error('[ERROR] Failed to close window:', error);
        }
      }
    });

    // Clear window registry
    windowRegistry.clear();

    // Set main window to null
    mainWindow = null;
    settingsWindow = null;

    // Force quit the application
    console.log('[DEBUG] Forcing application quit after main window closed');
    app.quit();
  })

  // Settings update handler (moved here to avoid duplication)
  ipcMain.on('update-settings', (_event, settings) => {
    // Broadcast to all windows
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (win.webContents && !win.isDestroyed()) {
        win.webContents.send('settings-updated', settings);
      }
    });

    // Also update the main window directly
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-updated', settings);
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Handle Squirrel.Windows install/uninstall events. This app ships via NSIS
// (electron-builder), not Squirrel, so the module is optional and not bundled —
// guard the require so its absence can't crash the packaged main process.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  /* electron-squirrel-startup not installed (NSIS build) — nothing to handle */
}

// IPC Handlers for application control
ipcMain.on('app-quit', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
  app.quit();
});

ipcMain.on('app-quit-force', () => {
  app.exit(0);
});

// ===== SERVER CONFIG IPC =====

// Returns the configured backend API base URL, or null if not yet configured.
//
// Resolution order:
//   1. server-config.json  — explicit config (client PCs after first run, or server PC if manually set)
//   2. Dev mode            — always localhost in dev
//   3. Localhost probe     — production with no config: if localhost:3001 answers we are ON the
//                            server PC, so use localhost silently (no setup screen needed)
//   4. null / unconfigured — client PC with no config → show ServerSetup screen
ipcMain.handle('get-server-url', async () => {
  const cfg = readServerConfig();
  if (cfg) {
    const origin = await resolveConfiguredOrigin(cfg);
    return { url: `${origin}/api/v1`, configured: true };
  }
  if (isDev) {
    return { url: 'http://localhost:3001/api/v1', configured: true };
  }
  // Production, no config file — are we on the server PC?
  const localhostUp = await probeLocalhost();
  if (localhostUp) {
    return { url: 'http://localhost:3001/api/v1', configured: true };
  }
  return { url: null, configured: false };
});

// Saves the server IP entered by the user on the setup screen
ipcMain.handle('save-server-config', (_event, serverIP: string) => {
  try {
    const trimmed = (serverIP || '').trim();
    if (!trimmed) return { success: false, error: 'IP address is required' };
    const payload = JSON.stringify({ serverIP: trimmed });
    // Primary: the visible install-folder file (installer grants Users write
    // access to it). Fall back to per-user data if that write fails.
    try {
      fs.writeFileSync(INSTALL_CONFIG_PATH, payload, 'utf-8');
    } catch {
      fs.writeFileSync(SERVER_CONFIG_PATH, payload, 'utf-8');
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: String(e?.message ?? e) };
  }
});

// Clears config (used from Settings → "Change Server" button)
ipcMain.handle('clear-server-config', () => {
  try {
    // Install-folder file: reset to empty instead of deleting (empty serverIP
    // is treated as "not configured", and the file stays visible/editable).
    try {
      if (fs.existsSync(INSTALL_CONFIG_PATH)) {
        fs.writeFileSync(INSTALL_CONFIG_PATH, JSON.stringify({ serverIP: '' }), 'utf-8');
      }
    } catch { /* not writable — fall through to userData cleanup */ }
    if (fs.existsSync(SERVER_CONFIG_PATH)) fs.unlinkSync(SERVER_CONFIG_PATH);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: String(e?.message ?? e) };
  }
});

// IPC Handlers for window management
// Removed duplicate 'open-loan-app-window' handler - now using unified window system below


// ===== OPTIMIZED WINDOW MANAGEMENT =====

// ===== COMPREHENSIVE WINDOW CONFIGURATIONS =====
// All window configurations for the entire application
// Modify any window's size, type, and behavior here
const WINDOW_CONFIGS: Record<string, {
  title: string;
  frameless: boolean;
  width?: number;
  height?: number;
  modal?: boolean;
  resizable?: boolean;
  alwaysOnTop?: boolean;
  singleton?: boolean; // Only one instance allowed
}> = {

  // Common Components
  '/common/member-lookup': { title: 'Member Lookup', frameless: false, width: 900, height: 600, modal: true, alwaysOnTop: true }, // AGGRESSIVE FIX: Force modal and alwaysOnTop to ensure it appears above maximized dashboard

  // ===== ADMINISTRATION SECTION =====

  // Loan Management
  '/loan-application': { title: 'Loan Application', frameless: false, width: 1100, height: 800 },
  '/change-loan-surety': { title: 'Change Loan Surety', frameless: false, width: 900, height: 700 },
  '/interest-calculation-posting': { title: 'Interest Calculation / Posting', frameless: false, width: 1000, height: 750 },

  // Daily Operations
  '/day-end': { title: 'Day End', frameless: false, width: 800, height: 600 },
  '/interest-calculation': { title: 'Interest Calculation', frameless: false, width: 1000, height: 700 },
  '/deposit-loan-slab': { title: 'Deposit/Loan Slab', frameless: false, width: 900, height: 700 },
  '/head-addition-modification': { title: 'Head Addition / Modification', frameless: false, width: 900, height: 650 },
  '/head-opening-balance': { title: 'Head Opening Balance', frameless: false, width: 900, height: 650 },

  // Security Management
  '/user-management': { title: 'Create / Modify Users', frameless: false, width: 1000, height: 700, modal: true },
  '/role-management': { title: 'Configure UserLevel Default Rights', frameless: false, width: 900, height: 650, modal: true },
  '/change-password': { title: 'Change Password', frameless: false, width: 500, height: 400, modal: true, singleton: true },
  '/logout-user': { title: 'LogOut User', frameless: false, width: 600, height: 450, modal: true },

  // Financial Year Management
  '/financial-year/transfer-entries': { title: 'Transfer Entries For Closing', frameless: false, width: 1100, height: 800 },
  '/financial-year/closing': { title: 'Financial Year Closing', frameless: false, width: 1000, height: 750 },
  '/financial-year/balance-transfer': { title: 'Balance Transfer', frameless: false, width: 900, height: 700 },
  '/financial-year/pl-process': { title: 'P and L Year End Process', frameless: false, width: 1000, height: 750 },

  // Business Rules & Printing
  '/modify-business-rules': { title: 'Modify Business Rules', frameless: false, width: 1000, height: 700 },
  '/demand-print-order': { title: 'Demand Print Order', frameless: false, width: 800, height: 600 },

  // Certificate Setting and Printing
  '/certificate/parameter-setting': { title: 'Certificate Parameter Setting', frameless: false, width: 900, height: 650 },
  '/certificate/fd-printing': { title: 'Fixed Deposit Certificate Printing', frameless: false, width: 1000, height: 700 },
  '/certificate/share-printing': { title: 'Share Certificate Printing', frameless: false, width: 1000, height: 700 },
  '/certificate/passbook-parameter': { title: 'Passbook Parameter Setting', frameless: false, width: 900, height: 650 },

  // Member Statement Reports
  '/reports/member-statement/saving-statement': { title: 'Saving Statement', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/rd-statement': { title: 'RD Statement', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/fd-statement': { title: 'FD Statement', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/member-statement': { title: 'Member Statement', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/rd-statement-new': { title: 'RD Statement New', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/fd-statement-new': { title: 'FD Statement New', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/new-share-certificate': { title: 'New Share Certificate', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/interest-certificate': { title: 'Interest Certificate', frameless: false, width: 1000, height: 750 },
  '/reports/member-statement/loan-nil-certificate': { title: 'Loan Nil Certificate', frameless: false, width: 1000, height: 750 },

  // ===== MASTERS SECTION =====

  '/masters/member': { title: 'Member Master', frameless: false, width: 1200, height: 850 },
  '/masters/signature-scanning': { title: 'Signature Scanning', frameless: false, width: 1000, height: 700 },
  '/masters/rd-account/opening': { title: 'RD A/c Opening', frameless: false, width: 1000, height: 750 },
  '/masters/rd-account/pass': { title: 'Pass RD A/C', frameless: false, width: 900, height: 650 },
  '/masters/saving-account-opening': { title: 'Saving A/c Opening', frameless: false, width: 1000, height: 750 },
  '/masters/wing-office': { title: 'Wing / Office Master', frameless: false, width: 800, height: 600 },
  '/masters/modify-fd-account': { title: 'Modify FD A/cr', frameless: false, width: 900, height: 700 },
  '/masters/modify-member-balance': { title: 'Modify Member Balance', frameless: false, width: 800, height: 600 },
  '/masters/cast-category': { title: 'Cast Category', frameless: false, width: 700, height: 500 },
  '/masters/designation': { title: 'Designation Master', frameless: false, width: 700, height: 500 },
  '/masters/data-entry': { title: 'Data Entry', frameless: false, width: 900, height: 700 },
  '/masters/data-entry/option1': { title: 'Data Entry Option 1', frameless: false, width: 900, height: 700 },

  // ===== TRANSACTION SECTION =====

  // Receipt & Payment
  '/transaction/receipt-payment/payment-voucher-creation': { title: 'Payment Voucher Creation', frameless: false, width: 1000, height: 750 },
  '/transaction/receipt-payment/voucher-payment': { title: 'Voucher Payment', frameless: false, width: 900, height: 700 },
  '/transaction/receipt-payment/receipt': { title: 'Receipt', frameless: false, width: 900, height: 700 },
  '/transaction/receipt-payment/dividend-payment': { title: 'Dividend Payment', frameless: false, width: 1000, height: 750 },

  // Fixed Deposit
  '/transaction/fixed-deposit/receipt': { title: 'Fixed Deposit Receipt', frameless: false, width: 1000, height: 750 },
  '/transaction/fixed-deposit/interest-voucher-posting': { title: 'FD / Interest Voucher Posting', frameless: false, width: 1100, height: 800 },
  '/transaction/fixed-deposit/withdrawal-interest-payment': { title: 'FD Withdrawal / Int. Payment', frameless: false, width: 1100, height: 800 },

  // Other Transactions
  '/transaction/saving': { title: 'Saving [Receipt -- Payment]', frameless: false, width: 1000, height: 750 },
  '/transaction/journal-transfer': { title: 'Journal / Transfer Entry', frameless: false, width: 1000, height: 750 },
  '/transaction/loan-payment': { title: 'Loan Payment', frameless: false, width: 900, height: 700 },
  '/transaction/loan-repayment': { title: 'Loan Repayment', frameless: false, width: 1100, height: 750 },
  '/transaction/loan-sanction': { title: 'Loan Sanction', frameless: false, width: 1200, height: 800 },
  '/loan-sanction': { title: 'Loan Sanction', frameless: false, width: 1200, height: 800 },
  '/transaction/compulsory-deposit': { title: 'Compulsory Deposit Transaction', frameless: false, width: 1000, height: 750 },
  '/transaction/pass-transactions': { title: 'Pass Transactions', frameless: false, width: 1000, height: 750 },

  // Demand / Recovery List
  '/transaction/demand-recovery/import-demand-list': { title: 'Import Demand List', frameless: false, width: 1000, height: 750 },
  '/transaction/demand-recovery/generate': { title: 'Generate', frameless: false, width: 800, height: 600 },
  '/transaction/demand-recovery/updation-ledger-posting': { title: 'Updation / Ledger Posting', frameless: false, width: 1100, height: 800 },
  '/transaction/demand-recovery/print-members-demand-list': { title: 'Print Members Demand List', frameless: false, width: 1000, height: 750 },
  '/transaction/demand-recovery/change-member-office': { title: 'Change Member Office', frameless: false, width: 800, height: 600 },
  '/transaction/demand-recovery/modify-short-recovery': { title: 'Modify Short Recovery', frameless: false, width: 900, height: 700 },

  // ===== REPORTS SECTION =====

  // Daily Reports
  '/reports/daily/cash-book': { title: 'Cash-Book', frameless: false, width: 1300, height: 900 },
  '/reports/daily/day-book': { title: 'Day-Book', frameless: false, width: 1300, height: 900 },
  '/reports/daily/day-book-sb': { title: 'Day-Book [SB]', frameless: false, width: 1300, height: 900 },
  '/reports/daily/consolidation': { title: 'Consolidation Of Daily A/c', frameless: false, width: 1300, height: 900 },

  // General Reports
  '/reports/member-ledger': { title: 'Member Ledger Report', frameless: false, width: 1400, height: 950 },
  '/reports/general-ledger': { title: 'General Ledger', frameless: false, width: 1400, height: 950 },
  '/reports/member-detail-ledger': { title: 'Member Detail Ledger', frameless: false, width: 1300, height: 900 },
  '/reports/account-balance': { title: 'Account Balance', frameless: false, width: 1200, height: 850 },
  '/reports/surety-register': { title: 'Surety Register', frameless: false, width: 1300, height: 900 },
  '/reports/deposit-due-date-register': { title: 'Deposit Due Date Register', frameless: false, width: 1300, height: 900 },
  '/reports/pass-book-printing': { title: 'Pass Book Printing', frameless: false, width: 1000, height: 750 },

  // Monthly Reports
  '/reports/monthly/cash-book-monthly': { title: 'Cash Book Monthly', frameless: false, width: 1300, height: 900 },
  '/reports/monthly/detail-ledger': { title: 'Detail Ledger', frameless: false, width: 1300, height: 900 },
  '/reports/monthly/bank-detail-ledger': { title: 'Bank Detail Ledger', frameless: false, width: 1300, height: 900 },
  '/reports/monthly/defaulter-list': { title: 'Defaulter List', frameless: false, width: 1200, height: 850 },
  '/reports/monthly/new-loan-disbursed': { title: 'New Loan Disbursed', frameless: false, width: 1200, height: 850 },
  '/reports/monthly/member-loan-ledger': { title: 'Member Loan Ledger', frameless: false, width: 1300, height: 900 },

  // Print Vouchers
  '/reports/monthly/print-vouchers/receipt-payment': { title: 'Receipt/Payment Voucher', frameless: false, width: 1100, height: 800 },
  '/reports/monthly/print-vouchers/journal-transfer': { title: 'Journal/Transfer Voucher', frameless: false, width: 1100, height: 800 },

  // Yearly Reports
  '/reports/yearly/pl-balance-sheet': { title: 'P & L/ Balance Sheet', frameless: false, width: 1400, height: 950 },
  '/reports/yearly/voters-withdrawal-list': { title: 'Voters/Withdrawal List', frameless: false, width: 1300, height: 900 },

  // Interest List Reports
  '/reports/yearly/interest-list/dividend-report': { title: 'Dividend Report', frameless: false, width: 1300, height: 900 },
  '/reports/yearly/interest-list/dividend-paid': { title: 'Dividend Paid', frameless: false, width: 1300, height: 900 },
  '/reports/yearly/interest-list/cd-md-shrt': { title: 'Int. List CD/MD/SHRt', frameless: false, width: 1300, height: 900 },
  '/reports/yearly/interest-list/dividend-warrant': { title: 'Dividend Warrant', frameless: false, width: 1200, height: 850 },

  // Member Reports
  '/reports/yearly/member-loan-detail': { title: 'Member Loan Detail', frameless: false, width: 1300, height: 900 },
  '/reports/yearly/share-warrant-printing': { title: 'Share Warrent Printing', frameless: false, width: 1100, height: 800 },
  '/reports/yearly/annual-member-statement': { title: 'Annual Member Statement', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/yearly-member-statement': { title: 'Yearly Member Statement', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-ledger': { title: 'Member Ledger', frameless: false, width: 1300, height: 900 },
  '/reports/yearly/member-statement': { title: 'Member Statement', frameless: false, width: 1200, height: 850 },

  // Member Statement Sub-Reports
  '/reports/yearly/member-statement/saving-statement': { title: 'Saving Statement', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-statement/rd-statement': { title: 'RD Statement', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-statement/fd-statement': { title: 'FD Statement', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-statement/rd-statement-new': { title: 'RD Statement New', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-statement/fd-statement-new': { title: 'FD Statement New', frameless: false, width: 1200, height: 850 },
  '/reports/yearly/member-statement/new-share-certificate': { title: 'New Share Certificate', frameless: false, width: 1000, height: 750 },
  '/reports/yearly/member-statement/interest-certificate': { title: 'Interest Certificate', frameless: false, width: 1000, height: 750 },
  '/reports/yearly/member-statement/loan-nil-certificate': { title: 'Loan Nil Certificate', frameless: false, width: 1000, height: 750 },

  // Account Reports
  '/reports/account-reports/account-closing-register': { title: 'Account Closing Register', frameless: false, width: 1300, height: 900 },
  '/reports/account-reports/fixed-deposit-certificate': { title: 'Fixed Deposit Certificate', frameless: false, width: 1100, height: 800 },
  '/reports/account-reports/share-certificate': { title: 'Share Certificate', frameless: false, width: 1100, height: 800 },
  '/reports/account-reports/recurring-details': { title: 'Recurring Details', frameless: false, width: 1200, height: 850 },
  '/reports/account-reports/recovery-details': { title: 'Recovery Details', frameless: false, width: 1200, height: 850 },
  '/reports/account-reports/loan-contributions-register': { title: 'Loan Contributions Register', frameless: false, width: 1300, height: 900 },
  '/reports/account-reports/lien-account-information': { title: 'Lien Account Information', frameless: false, width: 1100, height: 800 },

  // ===== UTILITY SECTION =====

  // Premature Information
  '/utility/premature-information/rd': { title: 'Premature Information For RD A/c', frameless: false, width: 900, height: 700 },
  '/utility/premature-information/sb': { title: 'Premature Information For SB A/c', frameless: false, width: 900, height: 700 },

  // Utility Tools
  '/utility/calculator': { title: 'Loan Calculator', frameless: false, width: 1200, height: 800, resizable: true, alwaysOnTop: false, singleton: true },
  '/utility/find': { title: 'Find & Search', frameless: false, width: 1000, height: 700, resizable: true, alwaysOnTop: false, singleton: true },
  '/utility/member-balance': { title: 'Member Balance', frameless: false, width: 900, height: 700 },
  '/utility/emi-chart': { title: 'EMI Chart', frameless: false, width: 800, height: 600 },
  '/utility/database-backup': { title: 'Database BackUp', frameless: false, width: 1200, height: 900 },
  '/utility/update-saving-interest': { title: 'Update Saving Intt.', frameless: false, width: 800, height: 600 },
  '/utility/interest-receivable-received-statement': { title: 'Interest Receivable/Received Statement', frameless: false, width: 1200, height: 850 },

  // ===== HELP SECTION =====

  '/help/about': { title: 'About', frameless: false, width: 600, height: 500, modal: true, singleton: true },
  '/help/contents': { title: 'Contents', frameless: false, width: 800, height: 700, singleton: true },

  // ===== EXIT SECTION =====

  '/exit/option1': { title: 'Exit Option 1', frameless: false, width: 500, height: 400, modal: true },

  // ===== SPECIAL WINDOWS =====

  '/settings': { title: 'Settings', frameless: false, width: 900, height: 700, modal: true, singleton: true },

  // ===== ANALYTICS WINDOWS =====

  '/analytics-dashboard': { title: 'Analytics Dashboard', frameless: false, width: 1200, height: 850, resizable: true, singleton: true },
  '/analytics-realtime': { title: 'Real-time Analytics Dashboard', frameless: false, width: 1600, height: 1000, resizable: true, singleton: true },
};

// Constants
const DEV_SERVER_URL = 'http://localhost:5177';
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

// Window registry for all windows (singleton and duplicate prevention)
const windowRegistry = new Map<string, BrowserWindow>();

// ===== WINDOW STACK MANAGEMENT =====
// Stack to track active windows (Last element is the active/topmost window)
const windowStack: { route: string; window: BrowserWindow }[] = [];

// Promote window to top of active stack
const updateActiveWindow = (route: string, window: BrowserWindow) => {
  // Remove if exists
  const index = windowStack.findIndex(item => item.window === window);
  if (index !== -1) {
    windowStack.splice(index, 1);
  }
  // Push to top
  windowStack.push({ route, window });
  if (DEBUG_LOGGING) console.log('[DEBUG] Active Window Stack Updated:', windowStack.map(i => i.route));
};

// Remove window from active stack
const removeActiveWindow = (window: BrowserWindow) => {
  const index = windowStack.findIndex(item => item.window === window);
  if (index !== -1) {
    const removed = windowStack.splice(index, 1);
    const route = removed[0] ? removed[0].route : 'unknown';
    if (DEBUG_LOGGING) console.log(`[DEBUG] Window Removed from Stack (${route}). Remaining:`, windowStack.map(i => i.route));
  }
};

// ===== WINDOW STATE PERSISTENCE =====

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

interface WindowStates {
  [route: string]: WindowState;
}

// Path to store window states
const WINDOW_STATES_PATH = path.join(os.homedir(), '.loan-management-window-states.json');

// Path to store the daily license cache
const LICENSE_CACHE_PATH = path.join(os.homedir(), '.loan-management-license-cache.json');

interface LicenseCacheEntry {
  date: string;
  result: any;
}

/**
 * Returns { result, isToday } if a cache file exists regardless of age.
 * Callers use isToday to decide whether to skip the backend hit.
 */
function loadLicenseCache(): { result: any; isToday: boolean } | null {
  try {
    if (fs.existsSync(LICENSE_CACHE_PATH)) {
      const cache: LicenseCacheEntry = JSON.parse(fs.readFileSync(LICENSE_CACHE_PATH, 'utf8'));
      if (cache?.result) {
        const today = new Date().toISOString().slice(0, 10);
        return { result: cache.result, isToday: cache.date === today };
      }
    }
  } catch {}
  return null;
}

function saveLicenseDailyCache(result: any): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(LICENSE_CACHE_PATH, JSON.stringify({ date: today, result }, null, 2));
  } catch {}
}

// Load saved window states
const loadWindowStates = (): WindowStates => {
  try {
    if (fs.existsSync(WINDOW_STATES_PATH)) {
      const data = fs.readFileSync(WINDOW_STATES_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[ERROR] Failed to load window states:', error);
  }
  return {};
};

// Save window states
const saveWindowStates = (states: WindowStates): void => {
  try {
    fs.writeFileSync(WINDOW_STATES_PATH, JSON.stringify(states, null, 2));
    console.log('[DEBUG] Window states saved successfully');
  } catch (error) {
    console.error('[ERROR] Failed to save window states:', error);
  }
};

// Get current window state
const getWindowState = (window: BrowserWindow): WindowState => {
  const bounds = window.getBounds();
  return {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: window.isMaximized()
  };
};



// Save window state when window changes
// PERFORMANCE FIX: Debounce disk writes to prevent jitter during drag/resize
const setupWindowStateTracking = (window: BrowserWindow, route: string): void => {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (window.isDestroyed()) return;
      const states = loadWindowStates();
      states[route] = getWindowState(window);
      saveWindowStates(states);
    }, 500); // Only write to disk 500ms after the last resize/move event
  };

  // Save state on resize, move, and maximize/unmaximize (debounced)
  window.on('resize', debouncedSave);
  window.on('move', debouncedSave);
  window.on('maximize', debouncedSave);
  window.on('unmaximize', debouncedSave);
};

// Reset all window states
const resetWindowStates = (): void => {
  try {
    if (fs.existsSync(WINDOW_STATES_PATH)) {
      fs.unlinkSync(WINDOW_STATES_PATH);
      console.log('[DEBUG] Window states reset successfully');
    }
  } catch (error) {
    console.error('[ERROR] Failed to reset window states:', error);
  }
};

// Utility functions
const isValidRoute = (route: string): boolean => {
  return typeof route === 'string' && route.length > 0;
};

const normalizeRoute = (route: string): string => {
  return `/${route.replace(/^\/+/, '')}`;
};

const constructURL = (route: string): string => {
  const normalizedRoute = normalizeRoute(route);
  if (isDev) {
    // Force hash routing for consistency with HashRouter in renderer
    return `${DEV_SERVER_URL}/#${normalizedRoute}`;
  } else {
    const filePath = path.join(__dirname, '../renderer/index.html');
    return `file://${filePath}#${normalizedRoute}`;
  }
};

const getWindowConfig = (route: string) => {
  // Normalize route for lookup (trim spaces and trailing slashes)
  const normalizedKey = route.trim().replace(/\/$/, '');

  const config = WINDOW_CONFIGS[normalizedKey];
  if (config) {
    return config;
  }

  // Generate default configuration for unknown routes
  const routeParts = route.split('/');
  const title = routeParts.pop()?.replace(/-/g, ' ') || 'Window';

  return {
    title: `${title.charAt(0).toUpperCase()}${title.slice(1)}`,
    frameless: false,
    width: 1000,
    height: 800
  };
};

const setupWindowEventHandlers = (window: BrowserWindow, route: string) => {
  // Handle external links
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('app://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Error handling
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[ERROR] Failed to load window for route ${route}:`, {
      errorCode,
      errorDescription
    });
  });

  // Ready to show
  window.once('ready-to-show', () => {
    if (DEBUG_LOGGING) console.log(`[DEBUG] Window ready to show for route: ${route}`);

    window.show();
    window.focus();

    // z-index management for different window types
    const windowConfig = getWindowConfig(route);

    if (route.includes('member-lookup')) {
      window.setAlwaysOnTop(true);
      window.moveTop();
      window.focus();
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.setAlwaysOnTop(false);
          window.moveTop();
        }
      }, 500);
    } else if (windowConfig.modal) {
      window.moveTop();
      window.focus();
    } else {
      window.moveTop();
      window.focus();
    }

    if (DEBUG_LOGGING) console.log(`[DEBUG] Window shown for route: ${route}`);
  });

  // Cleanup on close
  window.on('closed', () => {
    windowRegistry.delete(route);
    if (DEBUG_LOGGING) console.log(`[DEBUG] Window closed for route: ${route}`);

    // FIXED: Improved focus management when child window closes
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Special handling for member lookup windows
      if (route.includes('member-lookup')) {
        // Find the parent window that opened the member lookup
        const allWindows = BrowserWindow.getAllWindows();
        const parentWindow = allWindows.find(w =>
          w !== mainWindow &&
          w !== window &&
          !w.isDestroyed() &&
          w.isVisible()
        );

        if (parentWindow) {
          // Focus the parent window first
          setTimeout(() => {
            if (!parentWindow.isDestroyed()) {
              parentWindow.show();
              parentWindow.focus();
              parentWindow.moveTop();
              if (DEBUG_LOGGING) console.log('[DEBUG] Parent window focused after member lookup closed');
            }
          }, 100);
        } else {
          // Fallback to main window
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
              mainWindow.focus();
              if (DEBUG_LOGGING) console.log('[DEBUG] Main window focused after member lookup closed (no parent found)');
            }
          }, 100);
        }
      } else {
        // For other windows, briefly focus main window then let user control
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            if (DEBUG_LOGGING) console.log('[DEBUG] Main window focused after child window closed');
          }
        }, 100);
      }
    }
  });
};

const createWindowWithConfig = (route: string, config: any): BrowserWindow => {
  if (DEBUG_LOGGING) console.log(`[DEBUG] Creating window for route: ${route} with config:`, config);

  // Load saved window states
  const savedStates = loadWindowStates();
  const savedState = savedStates[route];

  // For modal windows, ensure they appear in the center of the screen
  let windowX: number | undefined = savedState?.x;
  let windowY: number | undefined = savedState?.y;

  if (config.modal && (!windowX || !windowY)) {
    // Center modal windows on screen
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const windowWidth = config.width || 1000;
    const windowHeight = config.height || 800;

    windowX = Math.round((screenWidth - windowWidth) / 2);
    windowY = Math.round((screenHeight - windowHeight) / 2);
    if (DEBUG_LOGGING) console.log(`[DEBUG] Centering modal window at: ${windowX}, ${windowY}`);
  }

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    // Use saved dimensions or default config
    width: savedState?.width || config.width || 1000,
    height: savedState?.height || config.height || 800,
    ...(windowX !== undefined && { x: windowX }),
    ...(windowY !== undefined && { y: windowY }),
    show: false,
    frame: !config.frameless,
    titleBarStyle: config.frameless ? 'hidden' : 'default',
    title: config.title,
    resizable: config.resizable !== false, // Default to true unless explicitly false
    minimizable: true,
    maximizable: config.resizable !== false,
    modal: config.modal || false,
    alwaysOnTop: config.alwaysOnTop || false,
    autoHideMenuBar: true, // Hide the menu bar (File, Edit, View, Window, Help)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: PRELOAD_PATH
    }
  };

  if (DEBUG_LOGGING) console.log(`[DEBUG] Window options:`, windowOptions);

  // FIXED: Set parent for modal windows
  if (config.modal) {
    // For loan-application child windows, set loan-application as parent
    if (route.startsWith('/loan-application/')) {
      const loanAppWindow = windowRegistry.get('/loan-application');
      if (loanAppWindow && !loanAppWindow.isDestroyed()) {
        windowOptions.parent = loanAppWindow;
      }
    }
    // For member-balance child windows, set member-balance as parent
    else if (route.startsWith('/utility/member-balance/')) {
      const memberBalanceWindow = windowRegistry.get('/utility/member-balance');
      if (memberBalanceWindow && !memberBalanceWindow.isDestroyed()) {
        windowOptions.parent = memberBalanceWindow;
      }
    }
    // For other modals, set main window as parent
    else if (mainWindow && !mainWindow.isDestroyed()) {
      windowOptions.parent = mainWindow;
    }
  }

  // AGGRESSIVE FIX: Special handling for member lookup windows to ensure they appear above maximized dashboard
  if (route.includes('member-lookup')) {
    // Find the most recent non-main window to use as parent
    const allWindows = BrowserWindow.getAllWindows();
    const parentWindow = allWindows.find(w =>
      w !== mainWindow &&
      !w.isDestroyed() &&
      w.isVisible()
    );

    if (parentWindow) {
      windowOptions.parent = parentWindow;
      if (DEBUG_LOGGING) console.log(`[DEBUG] Setting parent window for member lookup to ensure proper z-index`);
    }

    // Force member lookup to be modal to ensure it appears on top
    windowOptions.modal = true;
    windowOptions.alwaysOnTop = true; // Will be disabled after showing
  }

  const newWindow = new BrowserWindow(windowOptions);

  // UPDATE STACK: Add new window to stack immediately
  updateActiveWindow(route, newWindow);

  // TRACK ACTIVE WINDOW: Update stack when window gets focus
  newWindow.on('focus', () => {
    updateActiveWindow(route, newWindow);
  });

  // Set the window title explicitly after creation
  newWindow.setTitle(config.title);

  // Remove the menu bar completely for all windows
  newWindow.setMenuBarVisibility(false);

  // ADDED: Setup window state tracking
  setupWindowStateTracking(newWindow, route);

  // Apply saved maximized state after window is ready
  if (savedState?.isMaximized) {
    newWindow.once('ready-to-show', () => {
      newWindow.maximize();
    });
  }

  // Setup event handlers
  setupWindowEventHandlers(newWindow, route);

  // Custom Closed Handler for Stack Management
  newWindow.on('closed', () => {
    removeActiveWindow(newWindow);
  });

  // Load URL
  const url = constructURL(route);
  if (DEBUG_LOGGING) console.log(`[DEBUG] Loading URL: ${url}`);

  newWindow.loadURL(url).then(() => {
    if (DEBUG_LOGGING) console.log(`[DEBUG] URL loaded successfully for route: ${route}`);
  }).catch(error => {
    console.error(`[ERROR] Failed to load URL for route ${route}:`, error);
  });

  // Set title after page loads (single handler instead of duplicate)
  newWindow.webContents.on('did-finish-load', () => {
    newWindow.setTitle(config.title);
  });

  newWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[ERROR] Failed to load page for route ${route}:`, {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  // Prevent React from overriding the window title
  newWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    newWindow.setTitle(config.title);
  });

  // Open DevTools in development
  if (isDev && !config.modal) {
    newWindow.webContents.openDevTools();
  }

  return newWindow;
};

// ===== UNIFIED IPC HANDLERS =====

// FIXED: Add handler to bring windows to front
ipcMain.on('bring-window-to-front', (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow && !senderWindow.isDestroyed()) {
    senderWindow.show();
    senderWindow.focus();
    senderWindow.moveTop();
    if (DEBUG_LOGGING) console.log('[DEBUG] Window brought to front via IPC');
  }
});

// FIXED: Add handler for member selection completed
ipcMain.on('member-selected-completed', (event) => {
  // Close member lookup window and focus parent
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow && !senderWindow.isDestroyed()) {
    // Find parent window
    const allWindows = BrowserWindow.getAllWindows();
    const parentWindow = allWindows.find(w =>
      w !== mainWindow &&
      w !== senderWindow &&
      !w.isDestroyed() &&
      w.isVisible()
    );

    // Close member lookup
    senderWindow.close();

    // FIXED: Improved focus management after member selection
    if (parentWindow) {
      setTimeout(() => {
        if (!parentWindow.isDestroyed()) {
          parentWindow.show();
          parentWindow.focus();
          parentWindow.moveTop();
          if (DEBUG_LOGGING) console.log('[DEBUG] Parent window focused after member selection');
        }
      }, 150); // Slightly longer delay for better focus management
    } else {
      // Fallback to main window if no parent found
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          if (DEBUG_LOGGING) console.log('[DEBUG] Main window focused after member selection (no parent found)');
        }
      }, 150);
    }
  }
});

// Main window creation handler
ipcMain.on('open-new-window', (_event, route: string) => {
  if (DEBUG_LOGGING) console.log(`[DEBUG] Opening new window for route: ${route}`);

  try {
    if (!isValidRoute(route)) {
      console.error('Invalid route provided to open-new-window');
      return;
    }

    const config = getWindowConfig(route);
    if (DEBUG_LOGGING) console.log(`[DEBUG] Window config for ${route}:`, config);

    // ===== MULTIPLE WINDOWS ALLOWED =====
    // FIXED: Allow multiple windows to be open simultaneously as requested by user
    // Only prevent duplicate windows of the same route

    if (DEBUG_LOGGING) console.log(`[DEBUG] Allowing multiple windows - checking for duplicates only`);

    // FIXED: Prevent duplicate windows for all windows (not just singletons)
    const existingWindow = windowRegistry.get(route);
    if (existingWindow && !existingWindow.isDestroyed()) {
      if (DEBUG_LOGGING) console.log(`[DEBUG] Window already exists for route: ${route}, focusing existing window`);
      existingWindow.focus();
      existingWindow.show();
      return;
    }

    const newWindow = createWindowWithConfig(route, config);

    // FIXED: Register all windows to prevent duplicates
    windowRegistry.set(route, newWindow);

    // If this is a Feature Window (non-modal), we want to ensure Main Window is accessible but maybe visually indicates it's "parent"
    // But for "Single Active Window" strictly, we just let it be.

    // When a Feature Window closes, ensure proper focus management
    if (!config.modal) {
      newWindow.on('closed', () => {
        // Special handling for member lookup
        if (route.includes('member-lookup')) {
          // Focus is handled by the member-selected-completed event
          return;
        }

        // For other windows, focus main window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      });
    }

  } catch (error) {
    console.error(`[ERROR] Failed to create window for route ${route}:`, error);
  }
});


// Generic window opener handler (for backward compatibility and new usage)
ipcMain.on('open-window', (_event, options: { route: string; title?: string; width?: number; height?: number; modal?: boolean; resizable?: boolean }) => {
  if (DEBUG_LOGGING) console.log(`[DEBUG] Opening window with options:`, options);

  if (!options || !options.route) {
    console.error('Invalid options provided to open-window');
    return;
  }

  // Use the unified window system
  ipcMain.emit('open-new-window', null as any, options.route);
});

// Advanced window opener handler for analytics and other special windows
ipcMain.on('open-advanced-window', (_event, options: {
  url: string;
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maximizable?: boolean;
  resizable?: boolean;
  webPreferences?: any;
}) => {
  if (DEBUG_LOGGING) console.log(`[DEBUG] Opening advanced window with options:`, options);

  if (!options || !options.url) {
    console.error('Invalid options provided to open-advanced-window');
    return;
  }

  // Extract route from URL
  const route = options.url.replace(/^\/+/, '/');

  // Check if window already exists
  const existingWindow = windowRegistry.get(route);
  if (existingWindow && !existingWindow.isDestroyed()) {
    if (DEBUG_LOGGING) console.log(`[DEBUG] Advanced window already exists for route: ${route}, focusing existing window`);
    existingWindow.focus();
    existingWindow.show();
    return;
  }

  // Create custom window configuration
  const customConfig = {
    title: options.title,
    frameless: false,
    width: options.width,
    height: options.height,
    resizable: options.resizable !== false,
    maximizable: options.maximizable !== false,
    singleton: true, // Analytics windows should be singleton
  };

  try {
    const newWindow = createWindowWithConfig(route, customConfig);
    windowRegistry.set(route, newWindow);

    // Set minimum size if provided
    if (options.minWidth && options.minHeight) {
      newWindow.setMinimumSize(options.minWidth, options.minHeight);
    }

    if (DEBUG_LOGGING) console.log(`[DEBUG] Advanced window created for route: ${route}`);
  } catch (error) {
    console.error(`[ERROR] Failed to create advanced window for route ${route}:`, error);
  }
});

// Specific handlers that use the unified system
ipcMain.on('open-loan-app-window', () => {
  ipcMain.emit('open-new-window', null as any, '/loan-application');
});

ipcMain.on('open-settings-window', () => {
  // Handle settings window specially since it has existing logic
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const config = getWindowConfig('/settings');
  settingsWindow = createWindowWithConfig('/settings', config);

  // Settings-specific cleanup
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
});

// Handle member selection from lookup window
ipcMain.on('member-selected', (_event, memberData) => {
  if (DEBUG_LOGGING) console.log('[DEBUG] Member selected:', memberData);

  // Broadcast to EVERY registered window
  windowRegistry.forEach((win, route) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('member-selected', memberData);
      if (DEBUG_LOGGING) console.log(`[DEBUG] Broadcasted member-selected to: ${route}`);
    }
  });

  // Also send to main window, just in case it's not in the registry
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('member-selected', memberData);
  }

  // Close all known lookup window types
  const lookupRoutes = [
    '/common/member-lookup',
    '/common/member-lookup',
    '/common/member-lookup'
  ];

  lookupRoutes.forEach(route => {
    const lookupWin = windowRegistry.get(route);
    if (lookupWin && !lookupWin.isDestroyed()) {
      lookupWin.close();
      if (DEBUG_LOGGING) console.log(`[DEBUG] Closed lookup window: ${route}`);
    }
  });
});

// Handle loan sanctioned event
ipcMain.on('loan-sanctioned', (_event, loanData) => {
  if (DEBUG_LOGGING) console.log('[DEBUG] Loan sanctioned:', loanData);

  // Broadcast to ALL registered windows
  windowRegistry.forEach((win, route) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('loan-sanctioned', loanData);
      if (DEBUG_LOGGING) console.log(`[DEBUG] Broadcasted loan-sanctioned to: ${route}`);
    }
  });

  // Also send to main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('loan-sanctioned', loanData);
  }
});

// Handle graceful quit
ipcMain.on('app-quit', () => {
  // Close all windows gracefully
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.close();
    }
  });

  // Give some time for cleanup
  setTimeout(() => {
    app.quit();
  }, 100);
});

// Handle force quit
ipcMain.on('app-quit-force', () => {
  // Force quit the application
  app.exit(0);
});

// ===== WINDOW STATE MANAGEMENT IPC HANDLERS =====

// Reset all window states
ipcMain.on('reset-window-states', () => {
  if (DEBUG_LOGGING) console.log('[DEBUG] Resetting all window states');
  resetWindowStates();

  // Close all open windows except main window to apply reset
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    if (win !== mainWindow && !win.isDestroyed()) {
      win.close();
    }
  });

  // Clear window registry
  windowRegistry.clear();
});

// Get current window states (for settings display)
ipcMain.handle('get-window-states', () => {
  return loadWindowStates();
});

// Print content handler
ipcMain.handle('print-content', async (_event, htmlContent: string) => {
  try {
    // Create a new hidden window for printing
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need to disable sandbox for printing
      },
    });

    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Wait for content to load
    await new Promise<void>(resolve => {
      printWindow.webContents.once('dom-ready', () => resolve());
    });

    // Print the content with correct options
    return new Promise<{ success: boolean }>((resolve, reject) => {
      printWindow.webContents.print({
        silent: false,
        printBackground: true
      }, (success, failureReason) => {
        printWindow.close();
        if (success) {
          resolve({ success: true });
        } else {
          reject(new Error(failureReason));
        }
      });
    });
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
});

// ─── Passbook printing (Epson PLQ-35) ────────────────────────────────────────
// The passbook page is a fixed physical size (6in × 4in) fed wide-edge-first,
// so page dimensions are set explicitly on the print job itself — orientation
// must never be left to the driver defaults or the Windows print dialog.

const loadPassbookPrintWindow = async (htmlContent: string): Promise<BrowserWindow> => {
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  // Let layout and fonts settle before rasterizing
  await new Promise<void>(resolve => setTimeout(resolve, 150));
  return printWindow;
};

ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  const printers = await win.webContents.getPrintersAsync();
  return printers.map(p => ({
    name: p.name,
    displayName: p.displayName,
    isDefault: (p as unknown as { isDefault?: boolean }).isDefault === true,
  }));
});

ipcMain.handle('passbook-render-pdf', async (_event, payload: { html: string; widthMm: number; heightMm: number }) => {
  let printWindow: BrowserWindow | null = null;
  try {
    printWindow = await loadPassbookPrintWindow(payload.html);
    const pdf = await printWindow.webContents.printToPDF({
      pageSize: { width: payload.widthMm / 25.4, height: payload.heightMm / 25.4 }, // inches
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      landscape: false,
      printBackground: true,
    });
    return { success: true, data: pdf.toString('base64') };
  } catch (error) {
    console.error('Passbook PDF render error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    printWindow?.close();
  }
});

ipcMain.handle('passbook-print', async (_event, payload: { html: string; widthMm: number; heightMm: number; deviceName?: string }) => {
  let printWindow: BrowserWindow;
  try {
    printWindow = await loadPassbookPrintWindow(payload.html);
  } catch (error) {
    console.error('Passbook print load error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  const printOptions: Electron.WebContentsPrintOptions = {
    silent: !!payload.deviceName,
    printBackground: false,
    landscape: false,
    margins: { marginType: 'none' },
    pageSize: { width: Math.round(payload.widthMm * 1000), height: Math.round(payload.heightMm * 1000) }, // microns
  };
  if (payload.deviceName) printOptions.deviceName = payload.deviceName;
  return new Promise<{ success: boolean; error?: string }>(resolve => {
    printWindow.webContents.print(printOptions, (success, failureReason) => {
      printWindow.close();
      resolve(success ? { success: true } : { success: false, error: failureReason });
    });
  });
});

// Message Box Handler
ipcMain.handle('show-message-box', async (event, options: Electron.MessageBoxOptions) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return await dialog.showMessageBox(win, options);
  }
  return await dialog.showMessageBox(options);
});

// Window control handlers for frameless windows
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
  }
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-unmaximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.unmaximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (DEBUG_LOGGING) console.log('[DEBUG] IPC window-close received. Current Stack Size:', windowStack.length);
    win.close();
    // The 'closed' event listener added in createWindowWithConfig/createWindow will handle removal from stack
  }
});

// Auth logout: quit the application outright.
//
// Since login now happens in its own dialog before the dashboard is built, the
// dashboard has no login form to fall back to — there is nowhere to "return
// to" after signing out. Quitting is also what makes the next launch land on
// the logon dialog, which is the behaviour the society software has always had.
ipcMain.on('auth-logout', () => {
  if (DEBUG_LOGGING) console.log('[DEBUG] IPC auth-logout received — quitting application');
  app.quit();
});

// FIXED: Handler to close the latest active window (excluding dashboard)
// This allows the "Exit" button on the dashboard to close active child windows
ipcMain.on('close-latest-window', () => {
  if (DEBUG_LOGGING) {
    console.log('[DEBUG] IPC close-latest-window received.');
    console.log('[DEBUG] Current Window Stack Routes:', JSON.stringify(windowStack.map(w => w?.route), null, 2));
  }

  // Iterate backwards through the stack to find the first non-main window
  for (let i = windowStack.length - 1; i >= 0; i--) {
    const item = windowStack[i];
    // Check if window is valid and NOT the main window
    if (item && item.window && item.window !== mainWindow && !item.window.isDestroyed()) {
      if (DEBUG_LOGGING) console.log(`[DEBUG] Closing latest child window: ${item.route}`);
      item.window.close();
      return;
    }
  }

  if (DEBUG_LOGGING) console.log('[DEBUG] No child windows found to close.');
});

// IPC handler: renderer windows ask for the cached license result
ipcMain.handle('get-license-status', () => {
  return licenseResult;
});

// IPC handler: renderer updates the cache after activation
ipcMain.on('update-license-cache', (_event, data) => {
  licenseResult = data;
  if (data) saveLicenseDailyCache(data);
});

// Receive renderer logs via IPC and write to renderer.log file
ipcMain.on('renderer-logs', (_event, entries) => {
  if (!Array.isArray(entries)) return;
  const logDir = path.join(app.getPath('userData'), 'logs');
  try { if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); } catch { /* ok */ }
  const logFile = path.join(logDir, 'renderer.log');
  const lines = entries
    .map((e: any) => `[${e.timestamp}] [${e.level}] [${e.route}] ${e.message}${e.data ? ' ' + JSON.stringify(e.data) : ''}`)
    .join('\n') + '\n';
  fs.appendFile(logFile, lines, () => { /* fire and forget */ });
});

app.whenReady().then(async () => {
  const cached = loadLicenseCache();

  if (cached?.isToday) {
    // Cache is from today — use it directly, skip backend hit
    licenseResult = cached.result;
    console.log('[License] Using today\'s cached status:', licenseResult?.status);
  } else {
    // Stale or missing cache — try backend; fall back to last known good so
    // the user is never wrongly shown the activation screen just because the
    // backend is slow to start.
    if (cached?.result) {
      licenseResult = cached.result; // optimistic fallback
      console.log('[License] Using stale cache as startup fallback:', licenseResult?.status);
    }
    console.log('[License] Refreshing license status from backend...');
    const fresh = await fetchLicenseFromBackend();
    if (fresh) {
      licenseResult = fresh;
      saveLicenseDailyCache(fresh);
      console.log('[License] License refreshed:', licenseResult?.status);
    } else {
      console.log('[License] Backend unreachable — retaining fallback status:', licenseResult?.status ?? 'none');
    }
  }

  // Start at the logon dialog — the dashboard is only built once credentials
  // check out (see the 'login-success' handler).
  createLoginWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open. Which window
    // depends on whether the user has logged in yet this run.
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  settingsWindow = null
})

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('new-window', (event: any, navigationUrl: string) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})
