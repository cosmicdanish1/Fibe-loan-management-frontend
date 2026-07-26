export interface NomineeDetail {
  id: string;
  name: string;
  address: string;
  age: string;
  relation: string;
}

export interface FdAccountOption {
  accountNumber: string;
  label: string;
}

export interface ModifyFDData {
  selectFD: string;
  allFdAccounts: FdAccountOption[];
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  certificateNo: string;
  depositDate: string;
  rate: string;
  depositUnit: string;
  depositPeriod: string;
  maturityDate: string;
  modeOfPayment: string;
  fdAmount: string;
  maturityAmount: string;
  intAmount: string;
  interestBalance: string;
  lastIntPaymentDate: string;
  interestPaid: string;
  status: string;
  nominees: NomineeDetail[];
}

export interface ModifyFDHookReturn {
  data: ModifyFDData;
  handleFdSelect: (accountNumber: string) => void;
  updateField: <K extends keyof ModifyFDData>(key: K, value: ModifyFDData[K]) => void;
  addNominee: () => void;
  removeNominee: (id: string) => void;
  updateNominee: (id: string, field: keyof Omit<NomineeDetail, 'id'>, value: string) => void;
  save: () => void;
  reset: () => void;
}
