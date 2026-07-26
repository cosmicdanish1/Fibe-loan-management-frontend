import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ModifyMemberBalance from '../../../service/Masters/ModifyMemberBalance/page/ModifyMemberBalance';
import { useModifyMemberBalance } from '../../../service/Masters/ModifyMemberBalance/hooks/useModifyMemberBalance';

// Mock the useModifyMemberBalance hook
vi.mock('../../../../service/Masters/ModifyMemberBalance/hooks/useModifyMemberBalance');

const mockUseModifyMemberBalance = useModifyMemberBalance as jest.MockedFunction<typeof useModifyMemberBalance>;

describe('ModifyMemberBalance Component', () => {
  // Default mock data
  const defaultFormData = {
    shareAmount: '',
    savingAmount: '',
    rdAmount: '',
    fdAmount: '',
    suspense: '',
    deposit: {
      opening: '',
      current: ''
    },
    loan: {
      loan1: { opening: '', current: '' },
      loan2: { opening: '', current: '' },
      loan3: { opening: '', current: '' }
    },
    misc: {
      misc1: '',
      misc2: ''
    }
  };

  // Mock members data
  const mockMembers = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Robert Johnson' },
  ];

  // Mock functions
  const mockSetFormData = vi.fn();
  const mockSetWing = vi.fn();
  const mockSetSelectedMember = vi.fn();
  const mockSetSuspense = vi.fn();
  const mockSetShareAmount = vi.fn();
  const mockSetSavingAmount = vi.fn();
  const mockSetRdAmount = vi.fn();
  const mockSetFdAmount = vi.fn();
  const mockSave = vi.fn();
  const mockReset = vi.fn();
  const mockHandleChange = vi.fn();

  // Default mock implementation
  const defaultProps = {
    formData: defaultFormData,
    setFormData: mockSetFormData,
    wing: 'A',
    setWing: mockSetWing,
    members: mockMembers,
    selectedMember: mockMembers[0] || null, // Ensure it matches Member | null type
    setSelectedMember: mockSetSelectedMember,
    setSuspense: mockSetSuspense,
    setShareAmount: mockSetShareAmount,
    setSavingAmount: mockSetSavingAmount,
    setRdAmount: mockSetRdAmount,
    setFdAmount: mockSetFdAmount,
    handleChange: mockHandleChange,
    save: mockSave,
    reset: mockReset
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Set up the default mock implementation
    mockUseModifyMemberBalance.mockReturnValue(defaultProps);
  });

  test('renders the component with correct title', () => {
    render(<ModifyMemberBalance />);
    
    // Check if the main title is rendered
    expect(screen.getByText('Update Member Balance')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    render(<ModifyMemberBalance />);
    
    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  test('renders wing selection dropdown', () => {
    render(<ModifyMemberBalance />);
    
    // Check if wing selection is rendered
    const wingSelect = screen.getByLabelText('Select Wing');
    expect(wingSelect).toBeInTheDocument();
    expect(wingSelect).toHaveValue('A');
  });

  test('renders member navigation and selection', () => {
    render(<ModifyMemberBalance />);
    
    // Check member navigation buttons
    expect(screen.getByRole('button', { name: /<<|>>/i })).toBeInTheDocument();
    
    // Check member selection dropdown
    const memberSelect = screen.getByRole('combobox', { name: /member/i });
    expect(memberSelect).toBeInTheDocument();
    
    // Check if member options are rendered
    mockMembers.forEach(member => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    });
  });

  test('renders balance input fields', () => {
    render(<ModifyMemberBalance />);
    
    // Check main balance fields
    expect(screen.getByLabelText('Share Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Saving Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('RD Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('FD Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Suspense')).toBeInTheDocument();
    
    // Check deposit section
    expect(screen.getByText('Deposit')).toBeInTheDocument();
    expect(screen.getByLabelText('Opening')).toBeInTheDocument();
    expect(screen.getByLabelText('Current')).toBeInTheDocument();
    
    // Check loan section
    expect(screen.getByText('Loan 1')).toBeInTheDocument();
    expect(screen.getByText('Loan 2')).toBeInTheDocument();
    expect(screen.getByText('Loan 3')).toBeInTheDocument();
  });

  test('handles wing selection change', () => {
    render(<ModifyMemberBalance />);
    
    const wingSelect = screen.getByLabelText('Select Wing');
    fireEvent.change(wingSelect, { target: { value: 'B' } });
    
    expect(mockSetWing).toHaveBeenCalledWith('B');
  });

  test('handles member selection change', () => {
    render(<ModifyMemberBalance />);
    
    const memberSelect = screen.getByRole('combobox', { name: /member/i });
    fireEvent.change(memberSelect, { target: { value: '2' } });
    
    expect(mockSetSelectedMember).toHaveBeenCalledWith(mockMembers[1]);
  });

  test('handles save button click', () => {
    render(<ModifyMemberBalance />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockSave).toHaveBeenCalled();
  });

  test('handles reset button click', () => {
    render(<ModifyMemberBalance />);
    
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);
    
    expect(mockReset).toHaveBeenCalled();
  });

  test('matches snapshot', () => {
    const { container } = render(<ModifyMemberBalance />);
    expect(container).toMatchSnapshot();
  });
});

