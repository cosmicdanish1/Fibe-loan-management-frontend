import { useState, useEffect } from 'react';
import { IncomeHead, CompulsoryDepositState, UseCompulsoryDepositHook } from '../interfaces';

const useCompulsoryDeposit = (): UseCompulsoryDepositHook => {
  const [state, setState] = useState<CompulsoryDepositState>({
    amount: '',
    selectedIncomeHead: null,
    isDropdownOpen: false
  });

  const incomeHeads: IncomeHead[] = [
    { code: 'L1001', label: 'SHARE VALUE', description: 'Share Value' },
    { code: 'L1002', label: 'FAMILY RELIEF SEHCEME(FRS 1)', description: 'Family Relief Scheme (FRS 1)' },
    { code: 'L1003', label: 'MEMBER GROUP ACCIDENTAL INSUR', description: 'Member Group Accidental Insurance' },
    { code: 'L1004', label: 'COMPULSORY DEPOSIT', description: 'Compulsory Deposit' },
    { code: 'L1006', label: 'RESERVE FUND', description: 'Reserve Fund' },
    { code: 'L1007', label: 'BUILDING FUND', description: 'Building Fund' },
    { code: 'L1008', label: 'BAD DEBTS RESERVE', description: 'Bad Debts Reserve' },
    { code: 'L1009', label: 'COMMAN BENEFIT FUND', description: 'Common Benefit Fund' }
  ];

  const actions = {
    setAmount: (amount: string) => {
      setState(prev => ({ ...prev, amount }));
    },
    
    setSelectedIncomeHead: (head: IncomeHead | null) => {
      setState(prev => ({ 
        ...prev, 
        selectedIncomeHead: head, 
        isDropdownOpen: false 
      }));
    },
    
    toggleDropdown: () => {
      setState(prev => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }));
    },
    
    closeDropdown: () => {
      setState(prev => ({ ...prev, isDropdownOpen: false }));
    },
    
    resetForm: () => {
      setState({
        amount: '',
        selectedIncomeHead: null,
        isDropdownOpen: false
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        actions.closeDropdown();
      }
    };

    if (state.isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isDropdownOpen]);

  return {
    state,
    actions,
    incomeHeads
  };
};

export default useCompulsoryDeposit;
