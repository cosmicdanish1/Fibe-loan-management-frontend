// hooks/useDayend.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { DayendData, UseDayendReturn } from '../interface/dayend';
import { apiService } from '../../../../services/api';
import { localISODate } from '../../../../utils/dates';

// Helper function to get current date in YYYY-MM-DD format
const getCurrentDate = (): string => {
  const date = new Date();
  return localISODate(date); // en-CA gives YYYY-MM-DD format
};

// Initial state for dayend data
const initialDayendData: DayendData = {
  date: getCurrentDate(),
  openingBalance: 0,
  totalCredit: 0,
  totalDebit: 0,
  closingBalance: 0,
};

export const useDayend = (): UseDayendReturn => {
  const [dayendData, setDayendData] = useState<DayendData>(initialDayendData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Format currency amount
  const formatAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Format date for display
  const formatDate = useCallback((date: string): string => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  // Fetch dayend data from backend
  const fetchDayendData = useCallback(async (): Promise<DayendData> => {
    try {
      console.log('📤 FRONTEND: Fetching day-end data from backend...');

      // Call the backend API to get day-end summary (apiService sends accessToken + refreshes on 401)
      const response = await apiService.get('/admin/day-end/summary');

      if (!response.success) {
        console.error('❌ FRONTEND: Failed to fetch day-end data:', response.message);
        throw new Error(response.message || 'Failed to fetch day-end data');
      }

      const result = response.data;
      console.log('✅ FRONTEND: Day-end data received:', result);

      // Transform backend response to match our DayendData interface
      const raw = (result && result.data) || result || {};
      const data: DayendData = {
        date: raw.date || getCurrentDate(),
        openingBalance: Number(raw.openingBalance || 0),
        totalCredit: Number(raw.totalCredit || 0),
        totalDebit: Number(raw.totalDebit || 0),
        closingBalance: Number(raw.closingBalance || 0),
        paymentVouchers: Number(raw.paymentVouchers ?? 0),
        receiptVouchers: Number(raw.receiptVouchers ?? 0),
        journalVouchers: Number(raw.journalVouchers ?? 0),
        dayendFlag: raw.dayendFlag || 'N',
        noWorkingDateSet: Boolean(raw.noWorkingDateSet),
      };

      return data;
    } catch (err) {
      console.error('❌ FRONTEND: Error in fetchDayendData:', err);
      throw err;
    }
  }, []);

  // Refresh dayend data
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDayendData();
      setDayendData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dayend data';
      setError(errorMessage);
      console.error('Error fetching dayend data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchDayendData]);

  // Create the genesis getworkingdate row — see backend DayEndService.initializeWorkingDate
  const initializeWorkingDate = useCallback(async (workingDate: string): Promise<void> => {
    setIsInitializing(true);
    try {
      const response = await apiService.post('/admin/day-end/initialize', { workingDate });
      if (!response.success) {
        throw new Error(response.message || 'Failed to initialize working date');
      }
      await refreshData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize working date';
      setError(errorMessage);
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Initialization Failed',
          message: 'Could not set the initial working date',
          detail: errorMessage,
          buttons: ['OK'],
        });
      }
    } finally {
      setIsInitializing(false);
    }
  }, [refreshData]);

  // Poll for day-end process completion (non-blocking)
  const pollForCompletion = useCallback((processId: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxAttempts = 60;
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        // Hook unmounted: stop polling
        if (!mountedRef.current) {
          clearInterval(interval);
          reject(new Error('Day-end status polling cancelled'));
          return;
        }
        try {
          const response = await apiService.get(`/admin/day-end/processes/${processId}`);

          if (response.success && response.data) {
            const data = response.data;
            // FIX BUG 2: DayEndStatus enum values are lowercase ('completed', 'failed').
            // Compare case-insensitively to be safe against any future casing changes.
            const status = (data.status || data.data?.status || '').toLowerCase();
            console.log(`📊 Poll attempt ${attempts}: status = ${status}`);

            if (status === 'completed') {
              clearInterval(interval);
              resolve('completed');
            } else if (status === 'failed') {
              clearInterval(interval);
              reject(new Error(data.errorMessage || data.data?.errorMessage || 'Day-end process failed'));
            }
          }
        } catch (pollErr) {
          console.warn('Poll error (retrying):', pollErr);
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Day-end process timed out after 3 minutes'));
        }
      }, 3000);
    });
  }, []);

  // Process dayend
  const processDayend = useCallback(async (nextWorkingDate?: string): Promise<void> => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('📤 FRONTEND: Initiating day-end process...');

      const response = await apiService.post('/admin/day-end/initiate', {
        processDate: dayendData.date,
        nextWorkingDate,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to process day-end');
      }

      const result = response.data || {};
      const processId = result.id || result.data?.id;
      console.log(`✅ Day-end initiated. Process ID: ${processId}, Status: ${result.status}`);

      // If already completed (sync), skip polling
      // FIX BUG 2: enum value is lowercase 'completed', not 'COMPLETED'
      if ((result.status || '').toLowerCase() === 'completed') {
        await refreshData();
        if (window.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'Day-End Processing',
            message: '✅ Day-End Closed Successfully!',
            detail: `Date: ${dayendData.date}\nStatus: COMPLETED\n\nSystem date advanced to next business day.`,
            buttons: ['OK']
          });
        }
        return;
      }

      // Poll for completion (async process)
      console.log('⏳ Polling for day-end completion...');
      await pollForCompletion(processId);

      // Success
      await refreshData();
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: 'Day-End Processing',
          message: '✅ Day-End Closed Successfully!',
          detail: `Date: ${dayendData.date}\nStatus: COMPLETED\n\nSystem date advanced to next business day.`,
          buttons: ['OK']
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process dayend';
      setError(errorMessage);
      console.error('❌ FRONTEND: Error processing dayend:', err);

      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Day-End Processing Error',
          message: 'Failed to Close Day-End',
          detail: errorMessage,
          buttons: ['OK']
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [dayendData.date, refreshData]);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    dayendData,
    isProcessing,
    isLoading,
    error,
    processDayend,
    refreshData,
    formatAmount,
    formatDate,
    initializeWorkingDate,
    isInitializing,
  };
};

// Hook for dayend calculations
export const useDayendCalculations = (data: DayendData) => {
  return useMemo(() => {
    const calculatedClosingBalance = data.openingBalance + data.totalCredit - data.totalDebit;
    const isBalanced = Math.abs(calculatedClosingBalance - data.closingBalance) < 0.01;

    return {
      calculatedClosingBalance,
      isBalanced,
      difference: data.closingBalance - calculatedClosingBalance,
    };
  }, [data]);
};
