import { DayBookSavingProps, UseDayBookSBReturnType } from '../interfaces';

export const useDayBookSB = (): UseDayBookSBReturnType => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return {
    formatDate
  };
};
