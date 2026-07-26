// useAccountEntries.ts
import { useState, useCallback, useReducer } from 'react';
import type { AccountEntry, AccountState, AccountActions } from '../type/types';

// Action types for reducer
type AccountActionType = 
  | { type: 'ADD_ENTRY'; payload: AccountEntry }
  | { type: 'DELETE_ENTRY'; payload: number }
  | { type: 'MODIFY_ENTRY'; payload: { index: number; entry: AccountEntry } }
  | { type: 'SELECT_ENTRY'; payload: AccountEntry | null }
  | { type: 'CLEAR_ENTRIES' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: AccountState = {
  entries: [],
  selectedEntry: null,
  isLoading: false,
  error: null,
};

// Reducer function
const accountReducer = (state: AccountState, action: AccountActionType): AccountState => {
  switch (action.type) {
    case 'ADD_ENTRY':
      return {
        ...state,
        entries: [...state.entries, action.payload],
        error: null,
      };
    
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter((_, index) => index !== action.payload),
        selectedEntry: state.selectedEntry && state.entries[action.payload] === state.selectedEntry 
          ? null 
          : state.selectedEntry,
        error: null,
      };
    
    case 'MODIFY_ENTRY':
      return {
        ...state,
        entries: state.entries.map((entry, index) => 
          index === action.payload.index ? action.payload.entry : entry
        ),
        selectedEntry: state.selectedEntry && state.entries[action.payload.index] === state.selectedEntry
          ? action.payload.entry
          : state.selectedEntry,
        error: null,
      };
    
    case 'SELECT_ENTRY':
      return {
        ...state,
        selectedEntry: action.payload,
      };
    
    case 'CLEAR_ENTRIES':
      return {
        ...state,
        entries: [],
        selectedEntry: null,
        error: null,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    default:
      return state;
  }
};

// Main hook
export const useAccountEntries = (initialEntries: AccountEntry[] = []): AccountState & AccountActions => {
  const [state, dispatch] = useReducer(accountReducer, {
    ...initialState,
    entries: initialEntries,
  });

  const addEntry = useCallback((entry: AccountEntry) => {
    dispatch({ type: 'ADD_ENTRY', payload: entry });
  }, []);

  const deleteEntry = useCallback((index: number) => {
    if (index >= 0 && index < state.entries.length) {
      dispatch({ type: 'DELETE_ENTRY', payload: index });
    }
  }, [state.entries.length]);

  const modifyEntry = useCallback((index: number, updatedEntry: AccountEntry) => {
    if (index >= 0 && index < state.entries.length) {
      dispatch({ type: 'MODIFY_ENTRY', payload: { index, entry: updatedEntry } });
    }
  }, [state.entries.length]);

  const selectEntry = useCallback((entry: AccountEntry | null) => {
    dispatch({ type: 'SELECT_ENTRY', payload: entry });
  }, []);

  const clearEntries = useCallback(() => {
    dispatch({ type: 'CLEAR_ENTRIES' });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  return {
    ...state,
    addEntry,
    deleteEntry,
    modifyEntry,
    selectEntry,
    clearEntries,
    setLoading,
    setError,
  };
};

// Additional utility hooks
export const useAccountValidation = () => {
  const validateEntry = useCallback((entry: AccountEntry): string[] => {
    const errors: string[] = [];
    
    if (!entry.code || entry.code.trim() === '') {
      errors.push('Account code is required');
    }
    
    if (!entry.headName || entry.headName.trim() === '') {
      errors.push('Head name is required');
    }
    
    if (isNaN(entry.opening)) {
      errors.push('Opening balance must be a valid number');
    }
    
    if (isNaN(entry.debit)) {
      errors.push('Debit amount must be a valid number');
    }
    
    if (isNaN(entry.credit)) {
      errors.push('Credit amount must be a valid number');
    }
    
    return errors;
  }, []);

  return { validateEntry };
};

export const useAccountCalculations = () => {
  const calculateBalance = useCallback((opening: number, debit: number, credit: number): number => {
    return opening + debit - credit;
  }, []);

  const calculateTotals = useCallback((entries: AccountEntry[]) => {
    return entries.reduce(
      (totals, entry) => ({
        totalOpening: totals.totalOpening + entry.opening,
        totalDebit: totals.totalDebit + entry.debit,
        totalCredit: totals.totalCredit + entry.credit,
        totalBalance: totals.totalBalance + entry.balance,
      }),
      { totalOpening: 0, totalDebit: 0, totalCredit: 0, totalBalance: 0 }
    );
  }, []);

  return { calculateBalance, calculateTotals };
};
