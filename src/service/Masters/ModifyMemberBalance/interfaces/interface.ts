export interface Wing {
  id: string;
  name: string;
}

export interface MemberBalanceData {
  // Shares
  shareOpBal: string;       // shareopbal
  shareAmt: string;         // shareamt
  // Monthly Contribution
  mdOpBal: string;          // mdopbal
  mdAmt: string;            // mdamt
  // Compulsory Deposit
  cdOpBal: string;          // cdopbal
  cdAmt: string;            // cdamt
  lnExecRec: string;        // lnexecrec (4th unnamed row in legacy)
  suspBal: string;          // suspbal
  // Regular Loan
  rlnOpBal: string;         // md1_opbal
  rlnAmt: string;           // md1_amount
  // Emergency Loan
  elnOpBal: string;         // md2_opbal
  elnAmt: string;           // md2_amount
}

export interface MemberBalanceHookReturn {
  formData: MemberBalanceData;
  setFormData: React.Dispatch<React.SetStateAction<MemberBalanceData>>;
  wing: string;
  setWing: (value: string) => void;
  wings: Wing[];
  memberNo: string;
  memberName: string;
  memberIndex: number;      // current position (1-based)
  memberTotal: number;      // total members in fundsmaster
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  navigateMember: (direction: 'first' | 'prev' | 'next' | 'last') => void;
  save: () => void;
  reset: () => void;
}
