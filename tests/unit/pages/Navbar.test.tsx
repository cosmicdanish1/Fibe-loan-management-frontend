import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../../../components/navigation/Navbar';

// Mock the console.log to track menu item clicks
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Navbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all main menu items', () => {
    render(<Navbar />);
    
    // Check if all main menu items are rendered
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  test('opens and closes dropdown menu on menu item click', () => {
    render(<Navbar />);
    
    // Click on File menu
    const fileMenu = screen.getByText('File');
    fireEvent.click(fileMenu);
    
    // Check if dropdown is visible
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    
    // Click again to close
    fireEvent.click(fileMenu);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  test('handles menu item click with action', () => {
    render(<Navbar />);
    
    // Open File menu
    fireEvent.click(screen.getByText('File'));
    
    // Click on Save menu item
    fireEvent.click(screen.getByText('Save'));
    
    // Check if the correct action was logged
    expect(console.log).toHaveBeenCalledWith('[DEBUG] Menu item clicked: SAVE');
  });

  test('handles submenu items', () => {
    render(<Navbar />);
    
    // Open Administration menu
    fireEvent.click(screen.getByText('Administration'));
    
    // Check if submenu items are present
    expect(screen.getByText('Loan')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    
    // Click on Loan submenu
    fireEvent.click(screen.getByText('Loan'));
    
    // Check if submenu items are visible
    expect(screen.getByText('Loan Application')).toBeInTheDocument();
    expect(screen.getByText('Change Loan Surety')).toBeInTheDocument();
  });

  test('closes menu when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside-element">Outside Content</div>
        <Navbar />
      </div>
    );
    
    // Open File menu
    fireEvent.click(screen.getByText('File'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    
    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    
    // Menu should be closed
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
});

