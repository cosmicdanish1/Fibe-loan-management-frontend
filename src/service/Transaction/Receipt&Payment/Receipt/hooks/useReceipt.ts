import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ReceiptData, ReceiptHookReturn, ReceiptRow } from '../interfaces/interface';

const initialReceiptData: ReceiptData = {
  receiptType: 'receipt',
  memberNo: '',
  officeNo: '',
  month: new Date().toLocaleString('default', { month: 'short' }).toUpperCase().slice(0, 3),
  year: new Date().getFullYear().toString(),
  rlnBal: 0,
  rlnInt: 0,
  elnBal: 0,
  elnInt: 0,
  flnBal: 0,
  flnInt: 0,
  bankBal: 0,
  paymentMode: 'cash',
  actualAmount: 0,
  chequeDetails: {
    date: new Date().toISOString().split('T')[0] ?? '',
    chequeNo: '',
    bank: '',
    customerBankName: ''
  },
  items: [],
  narration: '',
  totalAmount: 0,
};

const calculateTotalAmount = (items: ReceiptRow[]): number => {
  return items.reduce((sum, row) => {
    const amount = parseFloat(row.amount) || 0;
    return sum + amount;
  }, 0);
};

export const useReceipt = (initialData?: Partial<ReceiptData>): ReceiptHookReturn => {
  const [receiptData, setReceiptData] = useState<ReceiptData>(() => ({
    ...initialReceiptData,
    ...initialData,
    items: initialData?.items?.map(item => ({
      ...item,
      amount: String(item.amount || '0')
    })) || []
  }));

  const handleAddRow = useCallback(() => {
    setReceiptData(prev => {
      const newItem: ReceiptRow = {
        id: uuidv4(),
        code: '',
        name: '',
        amount: '0',
        rdSrNo: ''
      };
      const updatedItems = [...prev.items, newItem];
      return {
        ...prev,
        items: updatedItems,
        totalAmount: calculateTotalAmount(updatedItems)
      };
    });
  }, []);

  const handleUpdateRow = useCallback((index: number, field: keyof ReceiptRow, value: string) => {
    setReceiptData(prev => {
      if (index < 0 || index >= prev.items.length) return prev;
      
      const updatedItems = prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      );
      
      // Only recalculate total if amount was updated
      const shouldUpdateTotal = field === 'amount';
      const newTotal = shouldUpdateTotal ? calculateTotalAmount(updatedItems) : prev.totalAmount;
      
      return {
        ...prev,
        items: updatedItems,
        totalAmount: newTotal
      };
    });
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    setReceiptData(prev => {
      if (index < 0 || index >= prev.items.length) return prev;
      
      const updatedItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: updatedItems,
        totalAmount: calculateTotalAmount(updatedItems)
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Validate required fields
      if (!receiptData.memberNo) {
        throw new Error('Member number is required');
      }
      
      if (receiptData.paymentMode === 'bank' && !receiptData.chequeDetails.chequeNo) {
        throw new Error('Cheque number is required for bank payment');
      }
      
      // Here you would typically make an API call to save the data
      console.log('Saving receipt:', receiptData);
      
      // For now, just show a success message
      alert('Receipt saved successfully!');
      
      // Reset the form after successful save
      setReceiptData(initialReceiptData);
      
      return true;
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert(error instanceof Error ? error.message : 'Failed to save receipt');
      return false;
    }
  }, [receiptData]);

  const handleCancel = useCallback(() => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      setReceiptData(initialReceiptData);
    }
  }, []);

  const handleExit = useCallback(() => {
    const hasUnsavedChanges = JSON.stringify(receiptData) !== JSON.stringify(initialReceiptData);
    if (!hasUnsavedChanges || window.confirm('You have unsaved changes. Are you sure you want to exit?')) {
      // Handle exit logic here (e.g., navigate away)
      console.log('Exiting receipt form');
    }
  }, [receiptData]);

  return {
    receiptData,
    setReceiptData,
    handleAddRow,
    handleUpdateRow,
    handleRemoveRow,
    handleSave,
    handleCancel,
    handleExit,
  };
};
