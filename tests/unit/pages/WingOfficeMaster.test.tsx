// src/tests/unit/pages/WingOfficeMaster.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import WingOfficeMaster from '../../../service/Masters/WingOfficeMaster/page/WingOfficeMaster';
import { useWingMaster } from '../../../service/Masters/WingOfficeMaster/hook/useWingMaster';
import { useOfficeMaster } from '../../../service/Masters/WingOfficeMaster/hook/useOfficeMaster';

// Mock the child components and hooks
vi.mock('../../../../service/Masters/WingOfficeMaster/components/WingMaster', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="wing-master">Wing Master Component</div>
  };
});

vi.mock('../../../../service/Masters/WingOfficeMaster/components/OfficeMaster', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="office-master">Office Master Component</div>
  };
});

vi.mock('../../../../service/Masters/WingOfficeMaster/hook/useWingMaster');
vi.mock('../../../../service/Masters/WingOfficeMaster/hook/useOfficeMaster');

describe('WingOfficeMaster Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementations
    (useWingMaster as jest.Mock).mockReturnValue({
      data: { wingCode: '', name: '', state: '1' },
      updateWingCode: vi.fn(),
      updateName: vi.fn(),
      updateState: vi.fn(),
      handleOK: vi.fn(),
      handleCancel: vi.fn()
    });

    (useOfficeMaster as jest.Mock).mockReturnValue({
      data: {
        branchNo: '',
        name: '',
        divisionRO: '',
        address: '',
        city: ''
      },
      updateBranchNo: vi.fn(),
      updateName: vi.fn(),
      updateDivisionRO: vi.fn(),
      updateAddress: vi.fn(),
      updateCity: vi.fn()
    });
  });

  test('renders Office Master by default', () => {
    render(<WingOfficeMaster />);
    
    // Should show Office Master title by default
    expect(screen.getByText('Office Master')).toBeInTheDocument();
    expect(screen.getByTestId('office-master')).toBeInTheDocument();
    expect(screen.queryByTestId('wing-master')).not.toBeInTheDocument();
  });

  test('toggles between Office Master and Wing Master when toggle button is clicked', () => {
    render(<WingOfficeMaster />);
    
    // Initial state - Office Master should be visible
    expect(screen.getByText('Office Master')).toBeInTheDocument();
    expect(screen.getByTestId('office-master')).toBeInTheDocument();
    
    // Click the toggle button
    const toggleButton = screen.getByRole('button', { name: '...' });
    fireEvent.click(toggleButton);
    
    // After toggle - Wing Master should be visible
    expect(screen.getByText('Wing Master')).toBeInTheDocument();
    expect(screen.getByTestId('wing-master')).toBeInTheDocument();
    expect(screen.queryByTestId('office-master')).not.toBeInTheDocument();
    
    // Toggle back to Office Master
    fireEvent.click(toggleButton);
    expect(screen.getByText('Office Master')).toBeInTheDocument();
    expect(screen.getByTestId('office-master')).toBeInTheDocument();
    expect(screen.queryByTestId('wing-master')).not.toBeInTheDocument();
  });

  test('matches snapshot in Office Master view', () => {
    const { container } = render(<WingOfficeMaster />);
    expect(container).toMatchSnapshot();
  });

  test('matches snapshot in Wing Master view', () => {
    const { container } = render(<WingOfficeMaster />);
    
    // Toggle to Wing Master view
    const toggleButton = screen.getByRole('button', { name: '...' });
    fireEvent.click(toggleButton);
    
    expect(container).toMatchSnapshot();
  });
});

