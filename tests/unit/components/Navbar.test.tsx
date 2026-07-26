import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../../components/navigation/Navbar';

// Mock any dependencies or context providers if needed
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Navbar Component', () => {
  test('renders navbar with menu items', () => {
    render(<Navbar />);
    
    // Check if main menu items are rendered
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Masters')).toBeInTheDocument();
  });

  test('opens File dropdown when clicked', () => {
    render(<Navbar />);
    
    // Click on File menu
    fireEvent.click(screen.getByText('File'));
    
    // Check if dropdown items are visible
    expect(screen.getByText('Save')).toBeVisible();
    expect(screen.getByText('Cancel')).toBeVisible();
    expect(screen.getByText('Exit')).toBeVisible();
  });

  test('opens Administration dropdown when clicked', () => {
    render(<Navbar />);
    
    // Click on Administration menu
    fireEvent.click(screen.getByText('Administration'));
    
    // Check if dropdown items are visible
    expect(screen.getByText('DayEnd')).toBeVisible();
    expect(screen.getByText('Interest Calculation')).toBeVisible();
  });

  test('opens Masters dropdown when clicked', () => {
    render(<Navbar />);
    
    // Click on Masters menu
    fireEvent.click(screen.getByText('Masters'));
    
    // Check if dropdown items are visible
    expect(screen.getByText('Member Master')).toBeVisible();
    expect(screen.getByText('Signature Scanning')).toBeVisible();
  });
});

