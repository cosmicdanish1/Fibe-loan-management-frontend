// Office Master Types
export interface OfficeMasterData {
  branchNo: string;
  name: string;
  divisionRO: string;
  address: string;
  city: string;
}

export interface OfficeMasterHookReturn {
  data: OfficeMasterData;
  fetchOffice: (branchNo: string) => void;
  updateBranchNo: (value: string) => void;
  updateName: (value: string) => void;
  updateDivisionRO: (value: string) => void;
  updateAddress: (value: string) => void;
  updateCity: (value: string) => void;
  save: () => void;
  reset: () => void;
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
