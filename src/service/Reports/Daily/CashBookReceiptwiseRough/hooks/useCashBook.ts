import { useState } from 'react';
import { CashBookState, UseCashBookReturnType } from '../interfaces';

export const useCashBook = (): UseCashBookReturnType => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');

  return {
    date,
    setDate,
    outputType,
    setOutputType,
  };
};
