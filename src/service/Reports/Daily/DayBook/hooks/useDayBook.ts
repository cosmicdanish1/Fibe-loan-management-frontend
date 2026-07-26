import { useState } from 'react';
import { DayBookEntry, UseDayBookReturnType } from '../interfaces';

export const useDayBook = (initialEntries: DayBookEntry[] = []): UseDayBookReturnType => {
  const [entries, setEntries] = useState<DayBookEntry[]>(initialEntries);
  
  const addEntry = (entry: DayBookEntry) => {
    setEntries(prevEntries => [...prevEntries, entry]);
  };
  
  const clearEntries = () => {
    setEntries([]);
  };
  
  return {
    entries,
    addEntry,
    clearEntries
  };
};
