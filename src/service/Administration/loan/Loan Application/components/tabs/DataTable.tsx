// DataTable.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTableData } from '../../hooks/useTableData';
import type { TableColumn } from '../../types/table';

// Simple button component
const Button = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  size = 'default',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md fz-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary',
  };
  const sizeStyles = {
    default: 'h-10 py-2 px-4',
    sm: 'h-8 px-3 rounded-md fz-body',
    lg: 'h-11 px-8 rounded-md',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Simple input component
const Input = ({
  value,
  onChange,
  type = 'text',
  className = '',
  ...props
}: {
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 fz-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

// Simple classNames utility
function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onDataChange: (data: T[]) => void;
  className?: string;
  showAddButton?: boolean;
}

function DataTable<T extends { id?: number } & Record<string, any>>({
  data,
  columns,
  onDataChange,
  className = '',
  showAddButton = true
}: DataTableProps<T>) {
  const { addRow, updateRow, deleteRow } = useTableData(data, onDataChange);
  const [editingCell, setEditingCell] = useState<{ id: number | null; field: keyof T | null }>({ id: null, field: null });
  const [editValue, setEditValue] = useState<any>('');
  // Set when Tab/Enter runs off the last cell of the last row — tells the
  // effect below which column to open once the newly-added row lands in `data`.
  const pendingNewRowFieldRef = useRef<keyof T | null>(null);

  const editableColumns = columns.filter(c => c.type !== 'checkbox');

  const openCellForEdit = (id: number, field: keyof T, value: any) => {
    setEditingCell({ id, field });
    setEditValue(value ?? '');
  };

  const handleCellClick = (id: number, field: keyof T) => {
    openCellForEdit(id, field, data.find(item => item.id === id)?.[field]);
  };

  const cancelEdit = () => {
    setEditingCell({ id: null, field: null });
  };

  // After addRow() lands a new row in `data`, open its first editable
  // column so Tab/Enter can keep flowing into it like a spreadsheet.
  useEffect(() => {
    if (!pendingNewRowFieldRef.current) return;
    const lastRow = data[data.length - 1];
    if (lastRow?.id !== undefined) {
      openCellForEdit(lastRow.id as number, pendingNewRowFieldRef.current, '');
    }
    pendingNewRowFieldRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  // Move focus to the next (or previous, on Shift+Tab) editable cell —
  // wraps to the next row, and spawns a new row past the last one.
  const moveToCell = (rowIndex: number, colIndex: number) => {
    if (editableColumns.length === 0) return;
    if (colIndex < 0) {
      if (rowIndex <= 0) return;
      rowIndex -= 1;
      colIndex = editableColumns.length - 1;
    } else if (colIndex >= editableColumns.length) {
      rowIndex += 1;
      colIndex = 0;
    }
    if (rowIndex < 0) return;

    if (rowIndex >= data.length) {
      const firstCol = editableColumns[0];
      if (!firstCol) return;
      pendingNewRowFieldRef.current = firstCol.key;
      addRow({} as any);
      return;
    }

    const targetRow = data[rowIndex];
    const targetCol = editableColumns[colIndex];
    if (targetRow?.id === undefined || !targetCol) return;
    openCellForEdit(targetRow.id as number, targetCol.key, targetRow[targetCol.key as keyof T]);
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number, rowId: number, field: keyof T, value: any) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      updateRow(rowId, field, value);
      moveToCell(rowIndex, e.shiftKey ? colIndex - 1 : colIndex + 1);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const renderCell = (row: T, column: TableColumn<T>, rowIndex: number) => {
    if (row.id === undefined) return null;
    const rowId = row.id as number;
    const isEditing = editingCell.id === rowId && editingCell.field === column.key && column.type !== 'checkbox';
    const value = row[column.key as keyof T];
    const colIndex = editableColumns.indexOf(column);

    if (isEditing) {
      if (column.type === 'date') {
        return (
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleGridKeyDown(e, rowIndex, colIndex, rowId, column.key, e.currentTarget.value)}
            autoFocus
            className="w-full fz-body h-8 border border-blue-400 rounded px-1 focus:outline-none"
          />
        );
      }
      if (column.type === 'select' && column.options) {
        return (
          <select
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); updateRow(rowId, column.key, e.target.value); }}
            onKeyDown={(e) => handleGridKeyDown(e, rowIndex, colIndex, rowId, column.key, editValue)}
            autoFocus
            className="w-full fz-body h-8 border border-blue-400 rounded px-1 focus:outline-none"
          >
            <option value="">Select...</option>
            {column.options.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
      return (
        <Input
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(column.type === 'number' ? Number(e.target.value) : e.target.value)}
          onKeyDown={(e) => handleGridKeyDown(e, rowIndex, colIndex, rowId, column.key, editValue)}
          autoFocus
          className="w-full fz-body h-8"
        />
      );
    }

    // Handle different column types
    switch (column.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateRow(rowId, column.key, e.target.checked)}
            className="w-4 h-4"
          />
        );

      case 'date':
        return (
          <div
            onClick={() => handleCellClick(rowId, column.key)}
            className="min-h-[32px] p-2 hover:bg-blue-50 cursor-pointer w-full fz-body rounded transition-colors duration-150 text-slate-700"
          >
            {value ? String(value) : <span className="text-slate-300">—</span>}
          </div>
        );

      default:
        return (
          <div
            onClick={() => handleCellClick(rowId, column.key)}
            className="min-h-[32px] p-2 hover:bg-blue-50 cursor-pointer w-full fz-body rounded transition-colors duration-150"
          >
            {value !== undefined && value !== null && value !== '' ? String(value) : <span className="text-slate-300">—</span>}
          </div>
        );
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Modern table with classic structure */}
      <div className="border border-slate-200 bg-white h-full overflow-auto rounded-lg shadow-sm">
        <table className="w-full fz-body">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th
                className="px-4 py-3 text-left font-semibold text-slate-700 border-r border-slate-200"
                style={{ width: '80px' }}
              >
                Sr. No.
              </th>
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left font-semibold text-slate-700 border-r border-slate-200"
                  style={{ width: column.width }}
                >
                  {column.header}
                  {column.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-slate-100 transition-colors duration-150 ${index === 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-slate-50'
                  }`}
              >
                <td className="px-4 py-3 text-center border-r border-slate-100 font-medium text-slate-600">
                  {index + 1}
                </td>
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 border-r border-slate-100">
                    {renderCell(row, column, index)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Empty rows to fill the table */}
            {Array.from({ length: Math.max(0, 8 - data.length) }).map((_, index) => (
              <tr key={`empty-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-center border-r border-slate-100 h-12 text-slate-400">
                  {data.length + index + 1}
                </td>
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 border-r border-slate-100 h-12">
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddButton && (
        <div className="mt-4">
          <Button
            onClick={() => addRow({} as any)}
            className="w-full border-dashed border-2 border-slate-300 bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Row
          </Button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
