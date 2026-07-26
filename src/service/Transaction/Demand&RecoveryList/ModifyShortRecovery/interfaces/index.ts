export interface MemberRecord {
  id: string;
  name: string;
  memberNo: string;
  wing: string;
  status: string;
}

export interface AccessRecoveryData {
  selectedWing: string;
  currentRecord: number;
  totalRecords: number;
  memberData: MemberRecord[];
}
