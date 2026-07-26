// hooks/useFinancialYearDialog.ts
import { useState, useCallback, useEffect } from 'react';
import type { FinancialYearDialogState } from '../interface/financialYearTypes';

export const useFinancialYearDialog = (initialOpen: boolean = false) => {
  const [state, setState] = useState<FinancialYearDialogState>({
    isOpen: initialOpen,
    code: '',
    isLoading: false
  });

  const openDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true, code: '' }));
  }, []);

  const closeDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, code: '', isLoading: false }));
  }, []);

  const updateCode = useCallback((code: string) => {
    setState(prev => ({ ...prev, code }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const handleSubmit = useCallback(async (onSubmit?: (code: string) => void) => {
    if (!state.code.trim()) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (onSubmit) {
        await onSubmit(state.code);
      }
      console.log('Financial Year Code submitted:', state.code);
      closeDialog();
    } catch (error) {
      console.error('Error submitting code:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.code, closeDialog]);

  const handleCancel = useCallback((onCancel?: () => void) => {
    if (onCancel) {
      onCancel();
    }
    closeDialog();
  }, [closeDialog]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.isOpen) {
        closeDialog();
      }
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [state.isOpen, closeDialog]);

  return {
    state,
    openDialog,
    closeDialog,
    updateCode,
    setLoading,
    handleSubmit,
    handleCancel
  };
};
