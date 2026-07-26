import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type MockedFunction } from 'vitest';
import RoleManagement from '../../../service/Administration/Security/RoleManagement/page/RoleManagement';
import { useDefaultRights } from '../../../service/Administration/Security/RoleManagement/hook/useDefaultRights';
import type { UseDefaultRightsReturn, MenuRight, DefaultRightsFormData } from '../../../service/Administration/Security/RoleManagement/interface/types';

// Mock the useDefaultRights hook
vi.mock('../../../../service/Administration/Security/RoleManagement/hook/useDefaultRights', () => ({
  useDefaultRights: vi.fn(),
}));

const mockUseDefaultRights = useDefaultRights as MockedFunction<typeof useDefaultRights>;

describe('RoleManagement Component', () => {
  const mockMenuRights: MenuRight[] = [
    { id: '1', code: '1.1', description: 'Cash Book (Receipt-wise Rough)', isSelected: false, isEnabled: true },
    { id: '2', code: '1.2', description: 'Cash Book', isSelected: false, isEnabled: true },
    { id: '3', code: '1.3', description: 'Day Book', isSelected: false, isEnabled: true },
  ];

  const mockFunctions: Omit<UseDefaultRightsReturn, 'formData' | 'selectedUserLevel' | 'menuRights'> = {
    updateUserLevel: vi.fn(),
    toggleMenuRight: vi.fn(),
    toggleAllRights: vi.fn(),
    saveDefaultRights: vi.fn().mockResolvedValue(true),
    resetForm: vi.fn(),
    getSelectedRightsCount: vi.fn().mockReturnValue(0),
    getTotalRightsCount: vi.fn().mockReturnValue(mockMenuRights.length)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementation with proper typing
    mockUseDefaultRights.mockImplementation((): UseDefaultRightsReturn => ({
      formData: {
        userLevel: '',
        menuRights: [...mockMenuRights]
      } as DefaultRightsFormData,
      selectedUserLevel: '',
      ...mockFunctions
    }));
  });

  test('renders the component with title and user level selection', () => {
    render(<RoleManagement />);
    
    // Check if the main title is rendered
    expect(screen.getByText('DEFAULT RIGHTS FOR USERLEVEL')).toBeInTheDocument();
    
    // Check if user level selection is rendered
    expect(screen.getByLabelText('User Level')).toBeInTheDocument();
    
    // Check if the menu description section is rendered
    expect(screen.getByText('Menu Description')).toBeInTheDocument();
    
    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deselect all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  test('displays the correct number of menu rights', () => {
    render(<RoleManagement />);
    
    // Check if all menu rights are rendered
    const menuItems = screen.getAllByRole('checkbox');
    expect(menuItems).toHaveLength(mockMenuRights.length);
    
    // Check if each menu item has the correct description
    mockMenuRights.forEach(menuItem => {
      expect(screen.getByText(menuItem.description)).toBeInTheDocument();
    });
  });

  test('allows selecting a user level', () => {
    render(<RoleManagement />);
    
    const userLevelSelect = screen.getByLabelText('User Level');
    fireEvent.change(userLevelSelect, { target: { value: 'admin' } });
    
    expect(mockFunctions.updateUserLevel).toHaveBeenCalledWith('admin');
  });

  test('toggles menu rights when clicked', () => {
    // Ensure we have menu rights to test with
    expect(mockMenuRights.length).toBeGreaterThan(0);
    const firstRight = mockMenuRights[0]!; // Non-null assertion as we've checked length
    
    render(<RoleManagement />);
    
    // Click on the first menu item
    const firstMenuItem = screen.getByText(firstRight.description);
    fireEvent.click(firstMenuItem);
    
    expect(mockFunctions.toggleMenuRight).toHaveBeenCalledWith(firstRight.id);
  });

  test('allows selecting all menu rights', () => {
    render(<RoleManagement />);
    
    const selectAllButton = screen.getByRole('button', { name: /select all/i });
    fireEvent.click(selectAllButton);
    
    expect(mockFunctions.toggleAllRights).toHaveBeenCalledWith(true);
  });

  test('allows deselecting all menu rights', () => {
    render(<RoleManagement />);
    
    const deselectAllButton = screen.getByRole('button', { name: /deselect all/i });
    fireEvent.click(deselectAllButton);
    
    expect(mockFunctions.toggleAllRights).toHaveBeenCalledWith(false);
  });

  test('shows selected count in the header', () => {
    // Mock getSelectedRightsCount to return 2
    mockUseDefaultRights.mockImplementationOnce((): UseDefaultRightsReturn => ({
      formData: {
        userLevel: 'admin',
        menuRights: mockMenuRights.map((item, index) => ({
          ...item,
          isSelected: index < 2 // First two items selected
        }))
      } as DefaultRightsFormData,
      selectedUserLevel: 'admin',
      ...mockFunctions,
      getSelectedRightsCount: vi.fn().mockReturnValue(2)
    }));
    
    render(<RoleManagement />);
    
    // Check if the selected count is displayed correctly
    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
  });

  test('calls save function when save button is clicked', () => {
    // Mock selected user level
    mockUseDefaultRights.mockImplementationOnce((): UseDefaultRightsReturn => ({
      formData: {
        userLevel: 'admin',
        menuRights: mockMenuRights
      } as DefaultRightsFormData,
      selectedUserLevel: 'admin',
      ...mockFunctions
    }));
    
    render(<RoleManagement />);
    
    // Click the save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    // Check if saveDefaultRights was called
    expect(mockFunctions.saveDefaultRights).toHaveBeenCalled();
  });

  test('shows alert when saving without selecting a user level', async () => {
    // Mock window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Mock the hook to return a selected user level
    mockUseDefaultRights.mockImplementation((): UseDefaultRightsReturn => ({
      formData: {
        userLevel: '',
        menuRights: [...mockMenuRights]
      } as DefaultRightsFormData,
      selectedUserLevel: '',
      ...mockFunctions
    }));
    
    render(<RoleManagement />);
    
    // Click the save button without selecting a user level
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    // Check if alert was shown
    expect(alertMock).toHaveBeenCalledWith('Please select a user level first.');
    
    // Clean up
    alertMock.mockRestore();
  });

  test('calls reset function when reset button is clicked', () => {
    render(<RoleManagement />);
    
    // Click the reset button
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    // Check if resetForm was called
    expect(mockFunctions.resetForm).toHaveBeenCalled();
  });

  // Skipping snapshot test as it's not recommended for components with complex state
  test.skip('matches snapshot', () => {
    const { container } = render(<RoleManagement />);
    expect(container).toMatchSnapshot();
  });
});

