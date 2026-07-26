import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../../pages/dashboard/Dashboard';
import { vi } from 'vitest';

// Mock child components
vi.mock('../../../components/navigation/Navbar', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-navbar">Mock Navbar</div>,
}));

vi.mock('../../../components/navigation/SubNavbar', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-subnavbar">Mock SubNavbar</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

// Mock window.electronAPI
const mockElectronAPI = {
  onSettingsUpdate: vi.fn(),
  removeAllListeners: vi.fn(),
};

describe('Dashboard Component', () => {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  const originalLocalStorage = window.localStorage;
  const originalElectronAPI = (window as any).electronAPI;

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
    });
  });

  beforeEach(() => {
    // Clear all mocks and reset localStorage
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterAll(() => {
    // Restore original implementations
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    (window as any).electronAPI = originalElectronAPI;
  });

  test('renders with default settings', () => {
    render(<Dashboard />);
    
    // Check if child components are rendered
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-subnavbar')).toBeInTheDocument();
    
    // Check if welcome message is displayed with default text
    expect(screen.getByText('Welcome to the Loan Management System')).toBeInTheDocument();
  });

  test('loads settings from localStorage on mount', () => {
    const savedSettings = {
      backgroundType: 'gradient',
      backgroundColor1: '#000000',
      backgroundColor2: '#333333',
      backgroundImage: null,
      welcomeText: 'Custom Welcome',
      textColor: '#ffffff'
    };
    
    localStorageMock.getItem.mockImplementation((key) => 
      key === 'appSettings' ? JSON.stringify(savedSettings) : null
    );
    
    render(<Dashboard />);
    
    // Check if custom welcome message is displayed
    expect(screen.getByText('Custom Welcome')).toBeInTheDocument();
  });

  test('handles settings update from CustomEvent', () => {
    render(<Dashboard />);
    
    const newSettings = {
      backgroundType: 'gradient',
      backgroundColor1: '#123456',
      backgroundColor2: '#789abc',
      backgroundImage: null,
      welcomeText: 'Updated Welcome',
      textColor: '#000000'
    };
    
    // Simulate settings update via CustomEvent
    const event = new CustomEvent('settings-updated', { detail: newSettings });
    window.dispatchEvent(event);
    
    // Check if the welcome text was updated
    expect(screen.getByText('Updated Welcome')).toBeInTheDocument();
  });

  test('handles settings update from postMessage', () => {
    render(<Dashboard />);
    
    const newSettings = {
      backgroundType: 'solid',
      backgroundColor1: '#654321',
      backgroundColor2: '#fedcba',
      backgroundImage: null,
      welcomeText: 'Message Welcome',
      textColor: '#333333'
    };
    
    // Simulate settings update via postMessage
    const message = {
      data: {
        type: 'settings-updated',
        settings: newSettings
      }
    };
    
    // Manually call the message event listener
    const messageHandler = (window.addEventListener as jest.Mock).mock.calls
      .find(([event]) => event === 'message')![1];
    messageHandler({ data: message.data });
    
    // Check if the welcome text was updated
    expect(screen.getByText('Message Welcome')).toBeInTheDocument();
  });

  test('cleans up event listeners on unmount', () => {
    const { unmount } = render(<Dashboard />);
    
    // Unmount the component
    unmount();
    
    // Check if removeEventListener was called for each event
    expect(window.removeEventListener).toHaveBeenCalledWith('settings-updated', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    
    // Check if electronAPI listeners were cleaned up
    expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('settings-updated');
  });
});

