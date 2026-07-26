export interface BankPassbookSettings {
    formatName: string;
    accountType: string;
  }
  
  export interface PageSetting {
    bankFormat: string;
    totalPages: number;
    linesPerPage: number;
    lineStartNumber: number;
    incrementLevel: number;
  }
  
  export interface DetailPageSetting {
    bankFormat: string;
    fields: {
      name: string;
      row: number;
      col: number;
      visible: boolean;
    }[];
  }
  
  export interface FirstPageSetting {
    formatForBank: string;
    fields: {
      name: string;
      row: number;
      col: number;
      displayNameFlag: boolean;
      visibleFlag: boolean;
    }[];
  }
  
  export interface PassbookParameters {
    bankPassbookSettings: BankPassbookSettings;
    pageSetting: PageSetting;
    detailPageSetting: DetailPageSetting;
    firstPageSetting: FirstPageSetting;
  }
  
