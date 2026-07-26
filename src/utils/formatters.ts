/**
 * Formats a number as currency
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "1,234.56")
 */
export const formatCurrency = (value: string | number | undefined): string => {
  if (value === undefined || value === '') return '0.00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0.00';
  
  // Format with 2 decimal places and thousands separators
  return numValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Parses a currency string into a number
 * @param currencyString - The currency string to parse (e.g., "1,234.56")
 * @returns The parsed number
 */
export const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove all non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^0-9.]/g, '');
  const value = parseFloat(numericString);
  
  return isNaN(value) ? 0 : value;
};

/**
 * Formats a date string to a more readable format
 * @param dateString - The date string to format (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "31/12/2023")
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return dateString; // Return original if invalid date
  
  return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
};
