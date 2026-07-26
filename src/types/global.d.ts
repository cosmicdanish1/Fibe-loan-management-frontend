// Type definitions for the Electron API exposed via contextBridge
declare interface Window {
  electronAPI: {
    // Window management
    openLoanAppWindow: () => void;
    openNewWindow: (route: string) => void;
    
    // App control
    quitApp: () => void;
    forceQuitApp: () => void;
    
    // Allow dynamic method access
    [key: string]: any;
  };
}
