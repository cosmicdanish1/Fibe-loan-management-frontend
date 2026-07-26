// Global Electron API type declarations
declare global {
  interface Window {
    electronAPI?: {
      // Window management
      openLoanAppWindow: () => void;
      openNewWindow: (route: string) => void;
      openSettingsWindow: () => void;
      openWindow?: (options: {
        url: string;
        title: string;
        width: number;
        height: number;
        minWidth?: number;
        minHeight?: number;
        maximizable?: boolean;
        resizable?: boolean;
        webPreferences?: any;
      }) => void;

      // Application control
      quitApp: () => void;
      forceQuitApp: () => void;

      // Window controls for frameless windows
      minimizeWindow?: () => void;
      maximizeWindow?: () => void;
      unmaximizeWindow?: () => void;
      closeWindow?: () => void;
      authLogout?: () => void;

      // File system operations (for DatabaseBackup)
      getDrives?: () => Promise<DriveInfo[]>;
      getFolders?: (path: string) => Promise<FolderItem[]>;
      createBackup?: (sourcePath: string, destinationPath: string) => Promise<{ success: boolean; message: string; filePath?: string }>;
      selectFolder?: () => Promise<string | null>;
      checkPath?: (path: string) => Promise<{ exists: boolean; isDirectory: boolean }>;

      // Printing
      printContent?: (htmlContent: string) => Promise<void>;
      getPrinters?: () => Promise<Array<{ name: string; displayName?: string; isDefault?: boolean }>>;
      passbookRenderPdf?: (payload: { html: string; widthMm: number; heightMm: number }) => Promise<{ success: boolean; data?: string; error?: string }>;
      passbookPrint?: (payload: { html: string; widthMm: number; heightMm: number; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;

      // Native Dialogs
      showMessageBox?: (options: any) => Promise<any>;

      // License status (fetched once in main process on app launch)
      getLicenseStatus?: () => Promise<any>;

      // Settings
      onSettingsUpdate?: (callback: (settings: any) => void) => void;
      send?: (channel: string, ...args: any[]) => void;
      on?: (channel: string, callback: (...args: any[]) => void) => () => void;

      // Window state management
      resetWindowStates?: () => void;
      getWindowStates?: () => Promise<any>;

      // IPC Communication
      ipcRenderer?: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };

      // Generic methods
      [key: string]: any;
    };
  }
}

// Drive and folder interfaces for DatabaseBackup
interface DriveInfo {
  drive: string;
  label: string;
  type: string;
  available: boolean;
}

interface FolderItem {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FolderItem[];
  isExpanded?: boolean;
}

export { };
