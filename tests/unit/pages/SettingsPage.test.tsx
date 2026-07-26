import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../../../components/settings/SettingsPage';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock window.electronAPI
const mockElectronAPI = {
  send: vi.fn(),
  onSettingsUpdate: vi.fn(),
};

describe('SettingsPage Component', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });

    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
    });
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('renders with default settings', () => {
    render(<SettingsPage />);
    
    // Check if all sections are rendered
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Welcome Message')).toBeInTheDocument();
  });

  test('toggles theme between light and dark', async () => {
    render(<SettingsPage />);
    
    const themeToggle = screen.getByLabelText(/dark mode/i);
    fireEvent.click(themeToggle);
    
    // Check if theme was updated in localStorage
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.theme).toBe('dark');
  });

  test('toggles notifications', () => {
    render(<SettingsPage />);
    
    const notificationToggle = screen.getByLabelText(/enable notifications/i);
    fireEvent.click(notificationToggle);
    
    // Check if notifications were updated in localStorage
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.notifications).toBe(false);
  });

  test('changes background type', () => {
    render(<SettingsPage />);
    
    // Click on gradient background option
    const gradientButton = screen.getByLabelText(/gradient/i);
    fireEvent.click(gradientButton);
    
    // Check if background type was updated
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.backgroundType).toBe('gradient');
  });

  test('updates welcome text', () => {
    render(<SettingsPage />);
    
    const welcomeInput = screen.getByLabelText(/welcome message/i);
    const testMessage = 'New welcome message';
    fireEvent.change(welcomeInput, { target: { value: testMessage } });
    
    // Check if welcome text was updated
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.welcomeText).toBe(testMessage);
  });

  test('changes text color', () => {
    render(<SettingsPage />);
    
    const colorInput = screen.getByLabelText(/text color/i);
    const testColor = '#ff0000';
    fireEvent.change(colorInput, { target: { value: testColor } });
    
    // Check if text color was updated
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.textColor).toBe(testColor);
  });

  test('resets background settings', () => {
    // Set initial settings
    const initialSettings = {
      theme: 'dark',
      notifications: false,
      fontSize: 'large',
      backgroundType: 'gradient',
      backgroundColor1: '#000000',
      backgroundColor2: '#333333',
      backgroundImage: 'data:image/png;base64,test',
      welcomeText: 'Test',
      textColor: '#ffffff'
    };
    localStorage.setItem('appSettings', JSON.stringify(initialSettings));

    render(<SettingsPage />);
    
    // Click reset button
    const resetButton = screen.getByText(/reset background/i);
    fireEvent.click(resetButton);
    
    // Check if background was reset to default
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.backgroundType).toBe('solid');
    expect(savedSettings.backgroundColor1).toBe('#ffffff');
    expect(savedSettings.backgroundImage).toBeNull();
  });

  test('saves settings with animation', async () => {
    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = vi.fn();
    
    render(<SettingsPage />);
    
    // Click save button
    const saveButton = screen.getByText(/save settings/i);
    fireEvent.click(saveButton);
    
    // Check if save animation was triggered
    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    
    // Wait for animation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Check if save was successful
    expect(window.alert).toHaveBeenCalledWith('Settings saved successfully!');
    
    // Restore original alert
    window.alert = originalAlert;
  });

  test('handles file upload for background', () => {
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/png;base64,test',
      onload: vi.fn(),
    };
    
    global.FileReader = vi.fn(() => mockFileReader) as any;
    
    render(<SettingsPage />);
    
    // Create a mock file
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;
    
    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    
    // Trigger onload event
    mockFileReader.onload({ target: { result: 'data:image/png;base64,test' } });
    
    // Check if file was processed
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(savedSettings.backgroundType).toBe('image');
    expect(savedSettings.backgroundImage).toContain('data:image/png;base64');
  });
});

