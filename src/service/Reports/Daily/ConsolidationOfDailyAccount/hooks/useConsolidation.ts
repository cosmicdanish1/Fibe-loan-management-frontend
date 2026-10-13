import { useState } from 'react';
import { localISODate } from '../../../../../utils/dates';
import { UseConsolidationReturnType } from '../interfaces/index';

export const useConsolidation = (): UseConsolidationReturnType => {
  const [date, setDate] = useState<string>(localISODate());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');

  return {
    date,
    setDate,
    outputType,
    setOutputType,
  };
};
