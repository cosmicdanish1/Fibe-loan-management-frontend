import { useState } from 'react';
import { UseCashBookReturnType } from '../interfaces';

export const useCashBook = (): UseCashBookReturnType => {
  const [finYear, setFinYear] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');

  return {
    finYear,
    setFinYear,
    date,
    setDate,
    outputType,
    setOutputType,
  };
};
