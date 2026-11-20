// interface/ImportDemandListInterfaces.ts

/** One row of the backend preview (DemandImportPreviewRow). The field names are the backend's own. */
export interface DemandListItem {
    key: string;
    /** sheet row number (the header is row 1) */
    rowNo?: number;
    memberId: string;
    memberName: string;
    department?: string;
    rlnAmount: number;
    alnAmount: number;
    /** F/D, R/D or RD/CD column: the member's RD/CD deposit */
    cdAmount: number;
    /** F.R.S.-1 = MD */
    mdAmount: number;
    /** F.R.S.-2 = MD1 */
    md1Amount: number;
    interest: number;
    totalDemand: number;
    fileTotal?: number;
    status: 'Valid' | 'Error';
    remarks?: string;
    /** what the file said (H.O.NO., PS.NO., NAME), kept for the import log */
    honoGiven?: string;
    psNo?: string;
    nameInFile?: string;
    /** how the member was found: MEMBER_NO, HONO, or MANUAL (picked by the operator) */
    matchMethod?: 'MEMBER_NO' | 'HONO' | 'MANUAL';
    /** shown to the operator; they only block a save in STRICT mode when they are also in strictIssues */
    warnings?: string[];
    /** name / PS.NO. that differ from the member's: these block the import in STRICT mode */
    strictIssues?: string[];
    /** up to 5 members with a similar name, offered when the member could not be found */
    suggestions?: Array<{ memberNo: string; name: string; officeno: string }>;
    /** "Check this" flags (possible old-EMI / new-EMI mix-up). Never blocks a save. */
    flags?: Array<{ code: string; message: string; loancaseno: string; loantype: string; amount: number }>;
}

export interface ImportConfig {
    divisionRO: string;
    branch: string;
    monthStr: string;
    yearStr: string;
}

export interface BranchOption {
    officeno: number;
    office_name: string;
    division?: string;
}

export interface ImportDemandListHookReturn {
    /** ES-591: the strictness from Modify Business Rules (as the server reported it with the last preview) */
    strictness: 'STRICT' | 'STANDARD';
    /** why Save is blocked in STRICT mode ('' when it is not) */
    saveBlockedReason: string;
    importConfig: ImportConfig;
    previewData: DemandListItem[];
    branches: BranchOption[];
    isImporting: boolean;
    isSaving: boolean;
    recordCount: number;
    updateConfig: (field: keyof ImportConfig, value: any) => void;
    handleImport: () => void;
    handleSave: () => void;
    handleClear: () => void;
    handleExit: () => void;
    /** ES-587: the operator picks one of the suggested members for a row whose member was not found */
    pickMember: (rowKey: string, memberNo: string) => void;
}
