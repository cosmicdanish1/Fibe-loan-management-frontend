import { useState } from 'react';
import { UseCashBookReturnType } from '../interfaces';
import { localISODate } from '../../../../../utils/dates';

export const useCashBook = (): UseCashBookReturnType => {
  const [finYear, setFinYear] = useState<string>('');
  const [date, setDate] = useState<string>(localISODate());
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
