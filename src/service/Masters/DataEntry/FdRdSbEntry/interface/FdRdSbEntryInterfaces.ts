// interface/FdRdSbEntryInterfaces.ts

export type EntryType = 'RD' | 'SB';

export interface AccountOption {
  accountNo: string;
  certNo: string;
  amount: string;
  label: string;
}

export interface FdRdSbEntryData {
  entryType: EntryType;
  memberNo: string;
  memberName: string;
  accountNo: string;
  accounts: AccountOption[];
  transDate: string;
  transType: 'CR' | 'DR';
  amount: string;
  receiptVchrNo: string;
  vchrType: string;
  modeOfPay: string;
  narration: string;
}

export interface FdRdSbEntryHookReturn {
  formData: FdRdSbEntryData;
  updateField: (field: keyof FdRdSbEntryData, value: any) => void;
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  handleSave: () => void;
  handleClear: () => void;
  handleExit: () => void;
  isLoading: boolean;
}
