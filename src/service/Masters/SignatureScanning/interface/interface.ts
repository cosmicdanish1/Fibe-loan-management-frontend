export interface SignatureScanningData {
  memberNumber: string;
  memberName: string;
  signatureData?: string; // base64 or url
  memberId?: string; // member_master mbno (string, e.g. "610030685")
  loading: boolean;
}

export interface SignatureScanningHookReturn {
  data: SignatureScanningData;
  updateMemberNumber: (value: string) => void;
  updateMemberName: (value: string) => void;
  clearSignature: () => void;
  uploadFile: (file: File) => Promise<boolean>;
  searchMember: (memberNo: string) => Promise<void>;
}
