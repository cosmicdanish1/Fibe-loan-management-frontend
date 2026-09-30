// DataTable.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Select } from 'antd';
import { Plus } from 'lucide-react';
import { useTableData } from '../../hooks/useTableData';
import type { TableColumn } from '../../types/table';

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
  const { addRow, updateRow } = useTableData(data, onDataChange);
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
            aria-label={column.header}
            className="aw-input"
          />
        );
      }
      if (column.type === 'select' && column.options) {
        return (
          <Select
            value={editValue || undefined}
            onChange={(v) => { setEditValue(v ?? ''); updateRow(rowId, column.key, v ?? ''); }}
            onKeyDown={(e) => handleGridKeyDown(e, rowIndex, colIndex, rowId, column.key, editValue)}
            autoFocus
            defaultOpen
            aria-label={column.header}
            placeholder="Select..."
            className="aw-select"
            popupClassName="aw-select-popup"
            options={column.options.map((opt: any) => ({ value: opt.value, label: opt.label }))}
          />
        );
      }
      return (
        <input
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(column.type === 'number' ? Number(e.target.value) : e.target.value)}
          onKeyDown={(e) => handleGridKeyDown(e, rowIndex, colIndex, rowId, column.key, editValue)}
          autoFocus
          aria-label={column.header}
          className="aw-input"
        />
      );
    }

    // Handle different column types
    if (column.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => updateRow(rowId, column.key, e.target.checked)}
          aria-label={column.header}
          style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }}
        />
      );
    }

    const empty = value === undefined || value === null || value === '';
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleCellClick(rowId, column.key)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCellClick(rowId, column.key); } }}
        className="aw-cell"
        style={{ minHeight: 'calc(var(--aw-control-h) - 8px)' }}
      >
        {empty ? <span className="aw-meta">—</span> : String(value)}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
        <table className="aw-table">
          <thead>
            <tr>
              <th className="is-center" style={{ width: 70 }}>Sr. No.</th>
              {columns.map((column) => (
                <th key={String(column.key)} style={{ width: column.width }}>
                  {column.header}
                  {column.required && <span style={{ color: 'var(--aw-danger)', marginLeft: 3 }}>*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id}>
                <td className="is-muted is-center">{index + 1}</td>
                {columns.map((column) => (
                  <td key={String(column.key)} className="has-input">
                    {renderCell(row, column, index)}
                  </td>
                ))}
              </tr>
            ))}
            {/* Empty rows to fill the table */}
            {Array.from({ length: Math.max(0, 8 - data.length) }).map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="is-muted is-center" style={{ height: 42 }}>{data.length + index + 1}</td>
                {columns.map((column) => (
                  <td key={String(column.key)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddButton && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => addRow({} as any)} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}>
            <Plus size={14} /> Add New Row
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
