import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MemberBalanceTransfer from '../../../service/Transaction/MemberBalanceTransfer/page/MemberBalanceTransfer';
import useUpdateMemberBalance from '../../../service/Transaction/MemberBalanceTransfer/hooks/useUpdateMemberBalance';

// Mock the useUpdateMemberBalance hook
vi.mock('../../../../service/Transaction/MemberBalanceTransfer/hooks/useUpdateMemberBalance');

// Mock the lucide-react icons used in the component
vi.mock('lucide-react', () => ({
  ChevronDown: () => <span>ChevronDownIcon</span>,
  ChevronRight: () => <span>ChevronRightIcon</span>,
  MoreHorizontal: () => <span>MoreHorizontalIcon</span>,
  Save: () => <span>SaveIcon</span>,
  X: () => <span>CloseIcon</span>
}));

describe('MemberBalanceTransfer Component', () => {
  const mockSetSelectedWing = vi.fn();
  const mockToggleWingDropdown = vi.fn();
  const mockCloseWingDropdown = vi.fn();
  const mockUpdateBalance = vi.fn();
  const mockNavigateMember = vi.fn();
  const mockResetForm = vi.fn();

  const mockWings = [
    { id: 'wing1', name: 'Wing A - Administrative' },
    { id: 'wing2', name: 'Wing B - Operations' },
    { id: 'wing3', name: 'Wing C - Finance' }
  ];

  const defaultState = {
    selectedWing: null,
    isWingDropdownOpen: false,
    currentMember: 1,
    memberBalance: {
      shares: {
        openingBalance: '1000',
        installAmount: '100'
      },
      monthlyContribution: {
        openingBalance: '500',
        installAmount: '50'
      },
      compulsoryDeposit: {
        openingBalance: '2000',
        installAmount: '200',
        suspenseBalance: '0'
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useUpdateMemberBalance as jest.Mock).mockReturnValue({
      state: defaultState,
      actions: {
        setSelectedWing: mockSetSelectedWing,
        toggleWingDropdown: mockToggleWingDropdown,
        closeWingDropdown: mockCloseWingDropdown,
        updateBalance: mockUpdateBalance,
        navigateMember: mockNavigateMember,
        resetForm: mockResetForm
      },
      wings: mockWings
    });
  });

  it('renders the component with default state', () => {
    render(<MemberBalanceTransfer />);
    
    // Check title
    expect(screen.getByText('Update Member Balance')).toBeInTheDocument();
    
    // Check wing selector
    expect(screen.getByText('Select Wing...')).toBeInTheDocument();
    
    // Check member navigation
    expect(screen.getByText('Member No: 1')).toBeInTheDocument();
    
    // Check balance input fields
    expect(screen.getByLabelText('Opening Balance')).toHaveValue('1000');
    expect(screen.getByLabelText('Installment Amount')).toHaveValue('100');
  });

  it('toggles wing dropdown when wing selector is clicked', () => {
    render(<MemberBalanceTransfer />);
    
    const wingButton = screen.getByText('Select Wing...').closest('button');
    fireEvent.click(wingButton!);
    
    expect(mockToggleWingDropdown).toHaveBeenCalled();
  });

  it('calls setSelectedWing when a wing is selected', () => {
    // Set state to show dropdown
    (useUpdateMemberBalance as jest.Mock).mockReturnValue({
      ...useUpdateMemberBalance(),
      state: {
        ...defaultState,
        isWingDropdownOpen: true
      },
      wings: mockWings
    });
    
    render(<MemberBalanceTransfer />);
    
    const wingOption = screen.getByText('Wing A - Administrative');
    fireEvent.click(wingOption);
    
    expect(mockSetSelectedWing).toHaveBeenCalledWith(mockWings[0]);
  });

  it('updates balance when input values change', () => {
    render(<MemberBalanceTransfer />);
    
    const openingBalanceInput = screen.getByLabelText('Opening Balance');
    fireEvent.change(openingBalanceInput, { target: { value: '1500' } });
    
    expect(mockUpdateBalance).toHaveBeenCalledWith('shares', 'openingBalance', '1500');
  });

  it('navigates between members using navigation buttons', () => {
    render(<MemberBalanceTransfer />);
    
    const nextButton = screen.getByLabelText('Next');
    fireEvent.click(nextButton);
    
    expect(mockNavigateMember).toHaveBeenCalledWith('next');
    
    const prevButton = screen.getByLabelText('Previous');
    fireEvent.click(prevButton);
    
    expect(mockNavigateMember).toHaveBeenCalledWith('prev');
    
    const firstButton = screen.getByLabelText('First');
    fireEvent.click(firstButton);
    
    expect(mockNavigateMember).toHaveBeenCalledWith('first');
    
    const lastButton = screen.getByLabelText('Last');
    fireEvent.click(lastButton);
    
    expect(mockNavigateMember).toHaveBeenCalledWith('last');
  });

  it('displays the suspense balance field for compulsory deposits', () => {
    render(<MemberBalanceTransfer />);
    
    // Switch to Compulsory Deposit tab
    const compulsoryDepositTab = screen.getByText('Compulsory Deposit');
    fireEvent.click(compulsoryDepositTab);
    
    expect(screen.getByLabelText('Suspense Balance')).toBeInTheDocument();
  });

  it('resets the form when reset button is clicked', () => {
    render(<MemberBalanceTransfer />);
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    expect(mockResetForm).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { container } = render(<MemberBalanceTransfer />);
    expect(container).toMatchSnapshot();
  });
});

