import { useState } from 'react';
import { UseConsolidationReturnType } from '../interfaces/index';

export const useConsolidation = (): UseConsolidationReturnType => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');

  return {
    date,
    setDate,
    outputType,
    setOutputType,
  };
};
