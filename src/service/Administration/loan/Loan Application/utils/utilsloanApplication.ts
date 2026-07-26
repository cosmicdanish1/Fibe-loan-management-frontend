// utils.ts
export const formatDate = (date: string): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };
  
  export const formatCurrency = (amount: string | number): string => {
    if (!amount) return '';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(num);
  };
  
  export const calculateMaturityAmount = (
    amount: string,
    rate: string,
    period: string,
    unit: string
  ): string => {
    const principal = parseFloat(amount) || 0;
    const annualRate = parseFloat(rate) || 0;
    const periodValue = parseFloat(period) || 0;
  
    if (principal === 0 || annualRate === 0 || periodValue === 0) return '';
  
    let timeInYears = periodValue;
    switch (unit.toLowerCase()) {
      case 'months':
        timeInYears = periodValue / 12;
        break;
      case 'days':
        timeInYears = periodValue / 365;
        break;
    }
  
    // Simple interest calculation: A = P(1 + rt)
    const maturityAmount = principal * (1 + (annualRate / 100) * timeInYears);
    return maturityAmount.toFixed(2);
  };
  
  export const generateUniqueId = (): number => {
    return Date.now() + Math.random();
  };
  
  export const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
  };
  
  export const validateNumber = (value: string): boolean => {
    return !isNaN(Number(value)) && Number(value) >= 0;
  };
  
  export const validateDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };
  
  export const getRelationOptions = () => [
    { value: 'spouse', label: 'Spouse' },
    { value: 'son', label: 'Son' },
    { value: 'daughter', label: 'Daughter' },
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'brother', label: 'Brother' },
    { value: 'sister', label: 'Sister' },
    { value: 'other', label: 'Other' }
  ];
  
  export const getLoanTypeOptions = () => [
    { value: 'ALN', label: 'EMERGENCY LOAN' },
    { value: 'ELN', label: 'LOAN AGAINST RECOVERY' },
    { value: 'RLN', label: 'REGULAR LOAN' }
  ];
  
  export const getUnitOptions = () => [
    { value: 'years', label: 'Years' },
    { value: 'months', label: 'Months' },
    { value: 'days', label: 'Days' }
  ];
  
  export const classNames = (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  };
