import { useState, useCallback } from 'react';

export interface CarryForwardBalancesState {
  startDate: string;
  endDate: string;
  isProcessing: boolean;
  isWindowOpen: boolean;
}

export const useCarryForwardBalances = (
  initialStartDate: string = '01-Apr-2024',
  initialEndDate: string = '31-Mar-2025'
) => {
  const [state, setState] = useState<CarryForwardBalancesState>({
    startDate: initialStartDate,
    endDate: initialEndDate,
    isProcessing: false,
    isWindowOpen: true
  });

  const updateStartDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, startDate: date }));
  }, []);

  const updateEndDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, endDate: date }));
  }, []);

  const toggleWindow = useCallback(() => {
    setState(prev => ({ ...prev, isWindowOpen: !prev.isWindowOpen }));
  }, []);

  const startProcessing = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: true }));
  }, []);

  const stopProcessing = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: false }));
  }, []);

  const isValidRange = useCallback(() => {
    if (!state.startDate || !state.endDate) return false;
    return new Date(state.startDate) < new Date(state.endDate);
  }, [state.startDate, state.endDate]);

  return {
    state,
    updateStartDate,
    updateEndDate,
    toggleWindow,
    startProcessing,
    stopProcessing,
    isValidRange: isValidRange()
  };
};

export default useCarryForwardBalances;
