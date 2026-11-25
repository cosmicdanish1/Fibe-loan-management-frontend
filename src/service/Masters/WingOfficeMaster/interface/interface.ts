// Office Master Types
export interface OfficeMasterData {
  branchNo: string;
  name: string;
  /** The wing (Division / RO) the office belongs to: the wing code. */
  wingId: string;
  /** The division number the legacy keeps for the office (optional; the branch number is used when blank). */
  divisionNo: string;
  address: string;
  city: string;
}

export interface WingOption { wingId: string; wingName: string; state: string }

export interface OfficeMasterHookReturn {
  data: OfficeMasterData;
  wings: WingOption[];
  refreshWings: () => void;
  fetchOffice: (branchNo: string) => void;
  updateBranchNo: (value: string) => void;
  updateName: (value: string) => void;
  updateWingId: (value: string) => void;
  updateDivisionNo: (value: string) => void;
  updateAddress: (value: string) => void;
  updateCity: (value: string) => void;
  save: () => void;
  reset: () => void;
  /** Opens the Wing Master (the "..." button next to Division / RO). */
  onOpenWing?: () => void;
}

// Wing Master Types
export interface WingMasterData {
  wingCode: string;
  name: string;
  state: string;
}

export interface WingMasterHookReturn {
  data: WingMasterData;
  updateWingCode: (value: string) => void;
  updateName: (value: string) => void;
  updateState: (value: string) => void;
  fetchWing: (code: string) => void;
  handleOK: () => void;
  handleCancel: () => void;
}
