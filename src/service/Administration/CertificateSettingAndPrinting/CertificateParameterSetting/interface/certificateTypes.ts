// types/certificateTypes.ts
export interface CertificateField {
    id: string;
    name: string;
    row: number;
    col: number;
    flag: boolean;
    inWo: string;
    length: number;
    visible: boolean;
  }
  
  export interface CertificateFormat {
    formatName: string;
    accountType: string;
  }
  
  export interface CertificateDetailSetting {
    formatName: string;
    fields: CertificateField[];
  }
  
  export type TabType = 'format' | 'detail';
  
  export interface CertificateParametersState {
    activeTab: TabType;
    formatSetting: CertificateFormat;
    detailSetting: CertificateDetailSetting;
  }
