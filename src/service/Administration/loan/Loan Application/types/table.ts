export interface TableColumn<T> {
  key: keyof T;
  header: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  step?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onDataChange: (data: T[]) => void;
  className?: string;
  showAddButton?: boolean;
}
