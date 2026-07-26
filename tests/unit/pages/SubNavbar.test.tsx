import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubNavbar from '../../../components/navigation/SubNavbar';

// Mock window.electronAPI
const mockElectronAPI = {
  openSettingsWindow: jest.fn()
};

describe('SubNavbar Component', () => {
  const mockHandlers = {
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    onRefresh: jest.fn(),
    onPrint: jest.fn(),
    onFind: jest.fn(),
    onExit: jest.fn(),
    onSettings: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock for window.electronAPI
    (window as any).electronAPI = mockElectronAPI;
  });

  test('renders all navigation items', () => {
    render(<SubNavbar {...mockHandlers} />);
    
    // Check if all navigation items are rendered
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('calls handler functions when buttons are clicked', () => {
    render(<SubNavbar {...mockHandlers} />);
    
    // Test each button click
    fireEvent.click(screen.getByText('Save'));
    expect(mockHandlers.onSave).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Delete'));
    expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Refresh'));
    expect(mockHandlers.onRefresh).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Print'));
    expect(mockHandlers.onPrint).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Find'));
    expect(mockHandlers.onFind).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByText('Exit'));
    expect(mockHandlers.onExit).toHaveBeenCalledTimes(1);
  });

  test('calls default settings handler when no onSettings prop is provided', () => {
    // Render without passing onSettings prop
    render(<SubNavbar />);
    
    // Click on Settings button
    fireEvent.click(screen.getByText('Settings'));
    
    // Should call the default openSettingsWindow function
    expect(mockElectronAPI.openSettingsWindow).toHaveBeenCalledTimes(1);
  });

  test('uses custom settings handler when provided', () => {
    const customSettingsHandler = jest.fn();
    render(<SubNavbar onSettings={customSettingsHandler} />);
    
    // Click on Settings button
    fireEvent.click(screen.getByText('Settings'));
    
    // Should call the custom handler, not the default one
    expect(customSettingsHandler).toHaveBeenCalledTimes(1);
    expect(mockElectronAPI.openSettingsWindow).not.toHaveBeenCalled();
  });

  test('disables buttons when no handler is provided', () => {
    // Render with no handlers
    const { container } = render(<SubNavbar />);
    
    // All buttons except Settings should be disabled
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.textContent?.includes('Settings')) {
        expect(button).not.toHaveClass('cursor-not-allowed');
      } else {
        expect(button).toHaveClass('cursor-not-allowed');
      }
    });
  });

  test('handles development mode when electronAPI is not available', () => {
    // Remove electronAPI mock to simulate development mode
    delete (window as any).electronAPI;
    
    // Mock window.open
    const mockOpen = jest.fn();
    const originalOpen = window.open;
    window.open = mockOpen;
    
    // Spy on console.log
    const consoleSpy = jest.spyOn(console, 'log');
    
    render(<SubNavbar />);
    
    // Click on Settings button
    fireEvent.click(screen.getByText('Settings'));
    
    // Should log development message
    expect(consoleSpy).toHaveBeenCalledWith('Opening settings in development mode...');
    
    // Should open new window with correct parameters
    expect(mockOpen).toHaveBeenCalledWith(
      '/settings',
      'Settings',
      expect.stringContaining('width=800,height=600')
    );
    
    // Restore window.open
    window.open = originalOpen;
    consoleSpy.mockRestore();
  });
});

