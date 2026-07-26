export interface DemandPrintingData {
  divisionRO: string;
  branch: string;
  month: string;
  year: string;
  sortBy: string;
  totalPages: string;
  outputType: 'Screen' | 'Printer';
  printBalance: boolean;
  printEmpNo: boolean;
  printPrevBalance: boolean;
}

export interface PrintOptions {
  screen: boolean;
  printer: boolean;
  printBalance: boolean;
  printEmpNo: boolean;
  printPrevBalance: boolean;
}
