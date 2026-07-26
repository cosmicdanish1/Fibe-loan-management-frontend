import { useState, useCallback } from 'react';

export function useTableData<T extends { id?: number }>(
  initialData: T[],
  onChange: (data: T[]) => void
) {
  const [data, setData] = useState<T[]>(initialData);

  const addRow = useCallback((template: Omit<T, 'id'>) => {
    setData(prev => {
      const newRow = { ...template, id: Date.now() } as T;
      const newData = [...prev, newRow];
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const updateRow = useCallback((id: number, field: keyof T, value: any) => {
    setData(prev => {
      const newData = prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  const deleteRow = useCallback((id: number) => {
    setData(prev => {
      const newData = prev.filter(item => item.id !== id);
      onChange(newData);
      return newData;
    });
  }, [onChange]);

  return {
    data,
    addRow,
    updateRow,
    deleteRow,
  };
}
