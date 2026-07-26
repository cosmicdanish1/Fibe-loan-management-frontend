export interface EmployeeDetail {
  id?: number;  // Made optional to handle new records before they get an ID
  mbNo?: string;
  name?: string;
  netSalary?: string;
  dateOfRetire?: string;
  officeName?: string;
  address?: string;
}
