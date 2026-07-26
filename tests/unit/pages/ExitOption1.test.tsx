import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';
import { motion } from 'framer-motion';
import ExitOption1 from '../../../service/Exit/ExitOption1/page/ExitOption1';

// Extend the Window interface to include our custom properties
declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

// Mock motion components to avoid animation delays in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ExitOption1 Component', () => {
  // Mock the window.electron and window.electronAPI objects
  const originalWindow = { ...window } as Window & typeof globalThis;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock window.electron and window.electronAPI
    Object.defineProperty(window, 'electron', {
      value: {
        ipcRenderer: {
          send: vi.fn(),
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
      },
      writable: true,
    });
    
    Object.defineProperty(window, 'electronAPI', {
      value: {
        quitApp: vi.fn(),
        forceQuitApp: vi.fn(),
      },
      writable: true,
    });
    
    // Mock timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore the original window object
    window.close = originalWindow.close;
    window.open = originalWindow.open as any;
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  
  test('renders the exit confirmation dialog', () => {
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Check if the confirmation dialog is rendered
    expect(screen.getByText('Are you sure you want to exit?')).toBeInTheDocument();
    expect(screen.getByText('All unsaved changes will be lost.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yes, exit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
  
  test('cancels exit when cancel button is clicked', () => {
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Check if navigate was called to go back
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
  
  test('starts exit process when exit button is clicked', () => {
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Click the exit button
    const exitButton = screen.getByRole('button', { name: /yes, exit/i });
    fireEvent.click(exitButton);
    
    // Check if the confirmation dialog is hidden
    expect(screen.queryByText('Are you sure you want to exit?')).not.toBeInTheDocument();
    
    // Check if the progress bar is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  test('completes exit process with electronAPI', async () => {
    // Set up mock for electronAPI
    (window as any).electronAPI = {
      quitApp: vi.fn(),
      forceQuitApp: vi.fn(),
    };
    
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Click the exit button
    const exitButton = screen.getByRole('button', { name: /yes, exit/i });
    fireEvent.click(exitButton);
    
    // Fast-forward timers to complete the progress
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Check if electronAPI.quitApp was called
    expect((window as any).electronAPI.quitApp).toHaveBeenCalled();
    
    // Fast-forward to trigger force quit
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Check if electronAPI.forceQuitApp was called
    expect((window as any).electronAPI.forceQuitApp).toHaveBeenCalled();
  });
  
  test('completes exit process with window.electron.ipcRenderer', async () => {
    // Remove electronAPI to test fallback
    delete (window as any).electronAPI;
    
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Click the exit button
    const exitButton = screen.getByRole('button', { name: /yes, exit/i });
    fireEvent.click(exitButton);
    
    // Fast-forward timers to complete the progress
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Check if ipcRenderer.send was called with 'app-quit'
    expect(window.electron?.ipcRenderer.send).toHaveBeenCalledWith('app-quit');
    
    // Fast-forward to trigger force quit
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Check if ipcRenderer.send was called with 'app-quit-force'
    expect(window.electron?.ipcRenderer.send).toHaveBeenCalledWith('app-quit-force');
  });
  
  test('completes exit process with window.close fallback', async () => {
    // Remove electron and electronAPI to test fallback
    delete (window as any).electron;
    delete (window as any).electronAPI;
    
    // Mock window.close
    const mockClose = vi.fn();
    window.close = mockClose;
    
    render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    
    // Click the exit button
    const exitButton = screen.getByRole('button', { name: /yes, exit/i });
    fireEvent.click(exitButton);
    
    // Fast-forward timers to complete the progress
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Check if window.close was called
    expect(mockClose).toHaveBeenCalled();
  });
  
  test('matches snapshot', () => {
    const { container } = render(
      <MemoryRouter>
        <ExitOption1 />
      </MemoryRouter>
    );
    expect(container).toMatchSnapshot();
  });
});

