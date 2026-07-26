// hooks/useCarryForwardBalances.ts
import { useState, useCallback} from 'react';
import type { CarryForwardBalancesState, DateRange } from '../interface/carryForwardTypes';

export const useCarryForwardBalances = (
  initialStartDate: string = '01-Apr-2024',
  initialEndDate: string = '31-Mar-2025'
) => {
  const [state, setState] = useState<CarryForwardBalancesState>({
    startDate: initialStartDate,
    endDate: initialEndDate,
    isProcessing: false,
    isWindowOpen: false
  });

  const openWindow = useCallback(() => {
    setState(prev => ({ ...prev, isWindowOpen: true }));
  }, []);

  const closeWindow = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isWindowOpen: false, 
      isProcessing: false 
    }));
  }, []);

  const updateStartDate = useCallback((startDate: string) => {
    setState(prev => ({ ...prev, startDate }));
  }, []);

  const updateEndDate = useCallback((endDate: string) => {
    setState(prev => ({ ...prev, endDate }));
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  const processCarryForward = useCallback(async (onProcess?: (dateRange: DateRange) => void) => {
    if (!state.startDate || !state.endDate) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const dateRange: DateRange = {
        startDate: state.startDate,
        endDate: state.endDate
      };

      if (onProcess) {
        await onProcess(dateRange);
      }

      console.log('Carry Forward Balances processed:', dateRange);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error processing carry forward:', error);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.startDate, state.endDate]);

  const resetDates = useCallback(() => {
    setState(prev => ({
      ...prev,
      startDate: initialStartDate,
      endDate: initialEndDate
    }));
  }, [initialStartDate, initialEndDate]);

  const validateDateRange = useCallback(() => {
    if (!state.startDate || !state.endDate) return false;
    
    const start = new Date(state.startDate.split('-').reverse().join('-'));
    const end = new Date(state.endDate.split('-').reverse().join('-'));
    
    return start < end;
  }, [state.startDate, state.endDate]);

  return {
    state,
    openWindow,
    closeWindow,
    updateStartDate,
    updateEndDate,
    setProcessing,
    processCarryForward,
    resetDates,
    validateDateRange,
    isValidRange: validateDateRange()
  };
};
