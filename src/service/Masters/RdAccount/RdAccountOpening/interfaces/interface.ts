export type RDNotification = { type: 'success' | 'error' | 'warning'; message: string } | null;

export interface NomineeDetail {
  id: string;
  name: string;
  address: string;
  age: string;
  relation: string;
}

export interface RDMasterData {
  memberNo: string;
  accountNo: string;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  rdHeadName: string;
  depositDate: string;
  openingBalance: string;
  depositUnit: string;
  depositPeriod: string;
  rate: string;
  amount: string;
  maturityDate: string;
  maturityAmount: string;
  nominees: NomineeDetail[];
  recoveryThroughDemand: boolean;
  specialInstructions: string;
}

export interface RDMasterHookReturn {
  data: RDMasterData;
  updateMemberNo: (value: string) => void;
  updateAccountNo: (value: string) => void;
  updatePrefix: (value: string) => void;
  updateFirstName: (value: string) => void;
  updateMiddleName: (value: string) => void;
  updateLastName: (value: string) => void;
  updateRdHeadName: (value: string) => void;
  updateDepositDate: (value: string) => void;
  updateOpeningBalance: (value: string) => void;
  updateDepositUnit: (value: string) => void;
  updateDepositPeriod: (value: string) => void;
  updateRate: (value: string) => void;
  updateAmount: (value: string) => void;
  updateMaturityDate: (value: string) => void;
  updateMaturityAmount: (value: string) => void;
  updateRecoveryThroughDemand: (value: boolean) => void;
  updateSpecialInstructions: (value: string) => void;
  addNominee: () => void;
  removeNominee: (id: string) => void;
  updateNominee: (id: string, field: keyof Omit<NomineeDetail, 'id'>, value: string) => void;
  save: () => void;
  reset: () => void;
  notification: RDNotification;
  clearNotification: () => void;
}
