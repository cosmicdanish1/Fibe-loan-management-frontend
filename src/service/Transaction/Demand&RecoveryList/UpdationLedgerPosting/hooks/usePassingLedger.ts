import { useState, useEffect } from 'react';
import { 
  PassingLedgerState, 
  PassingLedgerData, 
  LedgerRecord,
  UsePassingLedgerHook 
} from '../interfaces';

const usePassingLedger = (): UsePassingLedgerHook => {
  const [state, setState] = useState<PassingLedgerState>({
    formData: {
      month: 'AUG',
      year: '2025',
      branch: '',
      fromMember: '',
      toMember: '',
      modeOfReceipt: 'CASH',
      totalOfficeAmount: '',
      head: ''
    },
    records: [
      {
        id: '1',
        headName: 'Share Value',
        balance: '25,000.00',
        demandSend: '5,000.00',
        demandReceived: '4,500.00',
        shortRecovery: '500.00'
      },
      {
        id: '2',
        headName: 'Monthly Contribution',
        balance: '15,000.00',
        demandSend: '3,000.00',
        demandReceived: '3,000.00',
        shortRecovery: '0.00'
      },
      {
        id: '3',
        headName: 'Compulsory Deposit',
        balance: '35,000.00',
        demandSend: '7,000.00',
        demandReceived: '6,200.00',
        shortRecovery: '800.00'
      }
    ],
    dropdowns: {
      month: false,
      year: false,
      branch: false,
      head: false
    },
    selectedRecords: new Set()
  });

  const options = {
    months: [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ],
    years: [
      '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'
    ],
    branches: [
      'Main Branch',
      'North Branch',
      'South Branch',
      'East Branch',
      'West Branch',
      'Central Branch'
    ],
    heads: [
      'Share Value',
      'Monthly Contribution',
      'Compulsory Deposit',
      'Building Fund',
      'Reserve Fund',
      'Bad Debts Reserve',
      'Common Benefit Fund'
    ]
  };

  const updateField = (field: keyof PassingLedgerData, value: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value }
    }));
  };

  const setModeOfReceipt = (mode: 'CASH' | 'BANK' | 'OTHER') => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, modeOfReceipt: mode }
    }));
  };

  const toggleDropdown = (dropdown: keyof PassingLedgerState['dropdowns']) => {
    setState(prev => ({
      ...prev,
      dropdowns: {
        ...Object.keys(prev.dropdowns).reduce((acc, key) => ({
          ...acc,
          [key]: key === dropdown ? !prev.dropdowns[dropdown as keyof typeof prev.dropdowns] : false
        }), {} as PassingLedgerState['dropdowns'])
      }
    }));
  };

  const closeDropdown = (dropdown: keyof PassingLedgerState['dropdowns']) => {
    setState(prev => ({
      ...prev,
      dropdowns: { ...prev.dropdowns, [dropdown]: false }
    }));
  };

  const closeAllDropdowns = () => {
    setState(prev => ({
      ...prev,
      dropdowns: {
        month: false,
        year: false,
        branch: false,
        head: false
      }
    }));
  };

  const updateRecord = (id: string, field: keyof LedgerRecord, value: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(record =>
        record.id === id ? { ...record, [field]: value } : record
      )
    }));
  };

  const selectRecord = (id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedRecords);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { ...prev, selectedRecords: newSelected };
    });
  };

  const findMember = () => {
    alert(`Finding member from ${state.formData.fromMember} to ${state.formData.toMember}`);
  };

  const resetForm = () => {
    setState(prev => ({
      ...prev,
      formData: {
        month: 'AUG',
        year: '2025',
        branch: '',
        fromMember: '',
        toMember: '',
        modeOfReceipt: 'CASH',
        totalOfficeAmount: '',
        head: ''
      },
      selectedRecords: new Set()
    }));
  };

  const processPosting = () => {
    console.log('Processing posting with data:', state.formData);
    alert('Ledger posting processed successfully!');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        closeAllDropdowns();
      }
    };

    const hasOpenDropdown = Object.values(state.dropdowns).some(isOpen => isOpen);
    if (hasOpenDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.dropdowns]);

  return {
    state,
    actions: {
      updateField,
      setModeOfReceipt,
      toggleDropdown,
      closeDropdown,
      closeAllDropdowns,
      updateRecord,
      selectRecord,
      findMember,
      resetForm,
      processPosting
    },
    options
  };
};

export default usePassingLedger;
