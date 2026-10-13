import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

// Id of the current app launch, read synchronously here in preload so the
// renderer can use it while building its initial auth state (AuthContext runs
// this check at module load, before any async IPC could return).
//
// Guarded: if this ever threw, the exposeInMainWorld call below would never
// run and the renderer would lose the whole electronAPI bridge. Falling back to
// undefined only costs the close-app-logs-out behaviour, not the app.
let appRunId: string | undefined;
try {
  appRunId = ipcRenderer.sendSync('get-app-run-id');
} catch (error) {
  console.error('Failed to read app run id:', error);
}

// List of valid IPC channels
const validSendChannels = [
  'open-loan-app-window',
  'open-new-window',
  'open-window',
  'open-advanced-window',
  'app-quit',
  'app-quit-force',
  'message',
  'open-settings-window',
  'window-minimize',
  'window-maximize',
  'window-unmaximize',
  'window-close',
  'auth-logout',
  'login-success',
  'reset-window-states',
  'update-settings',
  'member-selected',
  'loan-sanctioned',
  'update-license-cache',
  'renderer-logs',
  'toolbar-register-state',
  'toolbar-trigger-save'
];

const validReceiveChannels = [
  'message',
  'settings-updated',
  'member-selected',
  'loan-sanctioned',
  'toolbar-state-changed',
  'toolbar-do-save',
  'updater:state'
];

const validInvokeChannels = [
  'get-app-version',
  'get-client-info',
  'open-external',
  'get-window-states',
  'print-content',
  'get-printers',
  'print-window-silent',
  'passbook-render-pdf',
  'passbook-print',
  'show-message-box',
  'get-license-status',
  'get-machine-id',
  'get-server-url',
  'save-server-config',
  'clear-server-config',
  'updater:get-state',
  'updater:check',
  'updater:download',
  'updater:install'
];

// Validate IPC channel names
const isValidChannel = (channel: string, validChannels: string[]): boolean => {
  return validChannels.includes(channel);
};

// Remembers the wrapper registered for each (channel, callback) so removeListener
// can detach the function that was actually passed to ipcRenderer.on.
const listenerWrappers = new Map<string, Map<(...args: any[]) => void, (...args: any[]) => void>>();
const rememberWrapper = (channel: string, callback: (...args: any[]) => void, wrapper: (...args: any[]) => void) => {
  let byCallback = listenerWrappers.get(channel);
  if (!byCallback) {
    byCallback = new Map();
    listenerWrappers.set(channel, byCallback);
  }
  byCallback.set(callback, wrapper);
};
const takeWrapper = (channel: string, callback: (...args: any[]) => void) => {
  const byCallback = listenerWrappers.get(channel);
  const wrapper = byCallback?.get(callback);
  byCallback?.delete(callback);
  return wrapper;
};

// Secure IPC bridge
const secureIpcRenderer = {
  send: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel, validSendChannels)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`Blocked attempt to send on channel: ${channel}`);
    }
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (isValidChannel(channel, validReceiveChannels)) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => callback(_event, ...args);
      ipcRenderer.on(channel, subscription);
      rememberWrapper(channel, callback, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
        listenerWrappers.get(channel)?.delete(callback);
      };
    }
    return () => { }; // Return empty cleanup function for invalid channels
  },
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    if (isValidChannel(channel, validReceiveChannels)) {
      const wrapper = takeWrapper(channel, callback);
      if (wrapper) ipcRenderer.removeListener(channel, wrapper as any);
    }
  },
  invoke: async (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel, validInvokeChannels)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`Blocked attempt to invoke on channel: ${channel}`);
    return null;
  },
  removeAllListeners: (channel: string) => {
    if (isValidChannel(channel, validReceiveChannels)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
};

// Expose a minimal, secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  openLoanAppWindow: () => secureIpcRenderer.send('open-loan-app-window'),
  openNewWindow: (route: string) => {
    if (typeof route === 'string') {
      secureIpcRenderer.send('open-new-window', route);
    }
  },

  // Advanced window opener for analytics and special windows
  openWindow: (options: {
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
    if (options && typeof options.url === 'string' && typeof options.title === 'string') {
      secureIpcRenderer.send('open-advanced-window', options);
    }
  },

  // Application control
  quitApp: () => secureIpcRenderer.send('app-quit'),
  forceQuitApp: () => secureIpcRenderer.send('app-quit-force'),

  // Messaging
  sendMessage: (message: string) => {
    if (typeof message === 'string') {
      secureIpcRenderer.send('message', message);
    }
  },

  onMessage: (callback: (message: string) => void) => {
    if (typeof callback === 'function') {
      return secureIpcRenderer.on('message', (_event, message) => {
        if (typeof message === 'string') {
          callback(message);
        }
      });
    }
    return () => { }; // Return empty cleanup function for invalid callbacks
  },

  // App info
  getAppVersion: () => secureIpcRenderer.invoke('get-app-version'),
  getClientInfo: () => secureIpcRenderer.invoke('get-client-info'),

  // App updates (see main/updater.ts)
  updater: {
    getState: () => secureIpcRenderer.invoke('updater:get-state'),
    check: () => secureIpcRenderer.invoke('updater:check'),
    download: () => secureIpcRenderer.invoke('updater:download'),
    install: (when: 'now' | 'on-quit') => secureIpcRenderer.invoke('updater:install', when),
    onState: (callback: (state: unknown) => void) =>
      secureIpcRenderer.on('updater:state', (_event, state) => callback(state)),
  },

  // Identifies THIS launch of the app. Changes every time the app restarts, so
  // a session stamped with an older id is treated as expired.
  appRunId,

  // External links
  openExternal: (url: string) => {
    try {
      const urlObj = new URL(url);
      if (['http:', 'https:'].includes(urlObj.protocol)) {
        return secureIpcRenderer.invoke('open-external', url);
      }
    } catch (e) {
      console.warn('Invalid URL provided to openExternal:', url);
    }
    return Promise.resolve(false);
  },

  // Settings
  openSettingsWindow: () => secureIpcRenderer.send('open-settings-window'),

  onSettingsUpdate: (callback: (settings: unknown) => void) => {
    if (typeof callback === 'function') {
      return secureIpcRenderer.on('settings-updated', (_event, settings) => {
        if (settings && typeof settings === 'object') {
          callback(settings);
        }
      });
    }
    return () => { }; // Return empty cleanup function for invalid callbacks
  },

  // Toolbar remote control — lets a tool window report its Save button's
  // label/enabled state to the Dashboard, and lets the Dashboard relay a
  // Save click back to whichever tool window last had focus.
  registerToolbarState: (state: { saveLabel?: string; saveEnabled?: boolean; hasSave: boolean }) => {
    if (state && typeof state === 'object') {
      secureIpcRenderer.send('toolbar-register-state', state);
    }
  },

  triggerToolbarSave: () => secureIpcRenderer.send('toolbar-trigger-save'),

  onToolbarStateChanged: (callback: (state: { saveLabel?: string; saveEnabled?: boolean; hasSave: boolean } | null) => void) => {
    if (typeof callback !== 'function') return () => { };
    return secureIpcRenderer.on('toolbar-state-changed', (_event, state) => {
      callback((state as any) ?? null);
    });
  },

  onToolbarDoSave: (callback: () => void) => {
    if (typeof callback !== 'function') return () => { };
    return secureIpcRenderer.on('toolbar-do-save', () => callback());
  },

  // Window control methods for frameless windows
  minimizeWindow: () => secureIpcRenderer.send('window-minimize'),
  maximizeWindow: () => secureIpcRenderer.send('window-maximize'),
  unmaximizeWindow: () => secureIpcRenderer.send('window-unmaximize'),
  closeWindow: () => secureIpcRenderer.send('window-close'),

  // Logout: quits the app. Login lives in its own dialog now, so there is no
  // login form on the dashboard to fall back to.
  authLogout: () => secureIpcRenderer.send('auth-logout'),

  // Sent from the logon dialog once credentials are accepted — the main
  // process then opens the dashboard and dismisses the dialog.
  loginSuccess: () => secureIpcRenderer.send('login-success'),

  // Window state management
  resetWindowStates: () => secureIpcRenderer.send('reset-window-states'),
  getWindowStates: () => secureIpcRenderer.invoke('get-window-states'),

  printContent: (htmlContent: string) => {
    if (typeof htmlContent === 'string') {
      return secureIpcRenderer.invoke('print-content', htmlContent);
    }
    return Promise.reject(new Error('Invalid HTML content provided'));
  },

  // Passbook printing — fixed physical page size, silent print to a chosen printer
  getPrinters: () => secureIpcRenderer.invoke('get-printers'),

  // Silently prints the calling window's own current content (governed by
  // its @media print CSS) to a chosen printer — skips Windows' native print
  // dialog, so its printer-driver-dependent preview bug never shows up.
  printWindowSilent: (options: { deviceName: string; copies?: number; landscape?: boolean }) => {
    if (options && typeof options.deviceName === 'string') {
      return secureIpcRenderer.invoke('print-window-silent', options);
    }
    return Promise.reject(new Error('printWindowSilent requires a deviceName'));
  },
  passbookRenderPdf: (payload: { html: string; widthMm: number; heightMm: number }) => {
    if (payload && typeof payload.html === 'string') {
      return secureIpcRenderer.invoke('passbook-render-pdf', payload);
    }
    return Promise.reject(new Error('Invalid passbook render payload'));
  },
  passbookPrint: (payload: { html: string; widthMm: number; heightMm: number; deviceName?: string }) => {
    if (payload && typeof payload.html === 'string') {
      return secureIpcRenderer.invoke('passbook-print', payload);
    }
    return Promise.reject(new Error('Invalid passbook print payload'));
  },

  // Native Dialogs
  showMessageBox: (options: any) => {
    return secureIpcRenderer.invoke('show-message-box', options);
  },

  // License status — fetched once per day; cached on disk in main process
  getLicenseStatus: (): Promise<any> => {
    return secureIpcRenderer.invoke('get-license-status');
  },

  // Server config — LAN deployment: get/save/clear the backend server IP
  getServerUrl: (): Promise<{ url: string | null; configured: boolean }> => {
    return secureIpcRenderer.invoke('get-server-url');
  },
  saveServerConfig: (serverIP: string): Promise<{ success: boolean; error?: string }> => {
    return secureIpcRenderer.invoke('save-server-config', serverIP);
  },
  clearServerConfig: (): Promise<{ success: boolean; error?: string }> => {
    return secureIpcRenderer.invoke('clear-server-config');
  },
  updateLicenseCache: (data: any) => {
    secureIpcRenderer.send('update-license-cache', data);
  },

  sendLogs: (logs: any[]) => {
    if (Array.isArray(logs)) {
      secureIpcRenderer.send('renderer-logs', logs);
    }
  },

  // Machine identifier (hashed in the main process, never raw)
  getMachineId: (): Promise<string | null> => secureIpcRenderer.invoke('get-machine-id'),

  // Generic invoke, restricted to the whitelisted invoke channels
  invoke: (channel: string, ...args: unknown[]) => secureIpcRenderer.invoke(channel, ...args),

  // Generic send method for settings and other features
  send: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel, validSendChannels)) {
      secureIpcRenderer.send(channel, ...args);
    } else {
      console.warn(`Blocked attempt to send on channel: ${channel}`);
    }
  },

  // Generic on method for listening to events
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (isValidChannel(channel, validReceiveChannels)) {
      return secureIpcRenderer.on(channel, callback);
    } else {
      console.warn(`Blocked attempt to listen on channel: ${channel}`);
      return () => { }; // Return empty cleanup function for invalid channels
    }
  },

  // Generic removeListener method for cleaning up event listeners
  removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
    if (isValidChannel(channel, validReceiveChannels)) {
      secureIpcRenderer.removeListener(channel, callback);
    } else {
      console.warn(`Blocked attempt to remove listener on channel: ${channel}`);
    }
  },

  // Expose ipcRenderer for component communication
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => {
      if (isValidChannel(channel, validSendChannels)) {
        secureIpcRenderer.send(channel, ...args);
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      if (isValidChannel(channel, validReceiveChannels)) {
        return secureIpcRenderer.on(channel, func);
      }
      return () => { };
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      secureIpcRenderer.removeListener(channel, func);
    },
    removeAllListeners: (channel: string) => {
      if (isValidChannel(channel, validReceiveChannels)) {
        secureIpcRenderer.removeAllListeners(channel);
      }
    }
  }
});

// For backward compatibility
declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

// Expose ipcRenderer for legacy code (window.electron) — restricted to the
// channels the renderer actually uses.
const legacySendChannels = ['window-close', 'close-latest-window', 'app-quit', 'app-quit-force'];
const legacyReceiveChannels = ['member-selected'];
const legacyWrappers = new Map<string, Map<(...args: any[]) => void, (...args: any[]) => void>>();
const rememberLegacyWrapper = (channel: string, func: (...args: any[]) => void, wrapper: (...args: any[]) => void) => {
  let byFunc = legacyWrappers.get(channel);
  if (!byFunc) {
    byFunc = new Map();
    legacyWrappers.set(channel, byFunc);
  }
  byFunc.set(func, wrapper);
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => {
          if (legacySendChannels.includes(channel)) {
            ipcRenderer.send(channel, ...args);
          } else {
            console.warn(`Blocked attempt to send on channel: ${channel}`);
          }
        },
        on: (channel: string, func: (...args: unknown[]) => void) => {
          if (!legacyReceiveChannels.includes(channel)) {
            console.warn(`Blocked attempt to listen on channel: ${channel}`);
            return;
          }
          const wrapper = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => func(...args);
          ipcRenderer.on(channel, wrapper);
          rememberLegacyWrapper(channel, func, wrapper);
        },
        removeListener: (channel: string, func: (...args: unknown[]) => void) => {
          if (!legacyReceiveChannels.includes(channel)) return;
          const wrapper = legacyWrappers.get(channel)?.get(func);
          if (wrapper) {
            ipcRenderer.removeListener(channel, wrapper);
            legacyWrappers.get(channel)?.delete(func);
          }
        },
        removeAllListeners: (channel: string) => {
          if (legacyReceiveChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to expose electron API:', error);
  }
}

// Remove all listeners when the window is closed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ipcRenderer.removeAllListeners('message')
  })
}
