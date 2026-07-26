// interfaces.ts
import type { AccountEntry, CompanyInfo } from '../type/types';

export interface IAccountService {
  getAllEntries(): Promise<AccountEntry[]>;
  addEntry(entry: AccountEntry): Promise<AccountEntry>;
  updateEntry(id: string, entry: Partial<AccountEntry>): Promise<AccountEntry>;
  deleteEntry(id: string): Promise<boolean>;
  searchEntries(query: string): Promise<AccountEntry[]>;
}

export interface ICompanyService {
  getCompanyInfo(): Promise<CompanyInfo>;
  updateCompanyInfo(info: Partial<CompanyInfo>): Promise<CompanyInfo>;
}

export interface IAccountingInterfaceProps {
  companyInfo?: CompanyInfo;
  initialEntries?: AccountEntry[];
  onEntryAdd?: (entry: AccountEntry) => void;
  onEntryDelete?: (index: number) => void;
  onEntryModify?: (index: number, entry: AccountEntry) => void;
  readOnly?: boolean;
  showDemoControls?: boolean;
}

export interface ITableHeaderProps {
  columns: string[];
  onSort?: (column: string) => void;
  sortDirection?: 'asc' | 'desc' | null;
  sortColumn?: string;
}

export interface IAccountEntryRowProps {
  entry: AccountEntry;
  index: number;
  onEdit?: (index: number, entry: AccountEntry) => void;
  onDelete?: (index: number) => void;
  isSelected?: boolean;
  onSelect?: (entry: AccountEntry) => void;
}

export interface IBuildTreeProps {
  entries: AccountEntry[];
  onTreeBuild?: (treeData: any) => void;
  isLoading?: boolean;
}
