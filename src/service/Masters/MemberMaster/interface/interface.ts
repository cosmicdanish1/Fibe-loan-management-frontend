import { tLabel } from '../../../../i18n';
// Types and Interfaces for Member Master Form
export interface MemberFormData {
  memberNumber: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  age: number;
  designation: string;
  membershipDate: string;
  department: string;
  panCardNo: string;
  frsNumber: string;
  srNoEpfPfNo: string;
  basicPay: string;
  shareAmt: string;
  retirementDate: string;
  aadharNo: string;
  branchMsNo: string;
  monthlyContribution: string;
  compulsatoryDeposit: string;
  startRd: boolean;
  isInsured: boolean;
  amountOfInsurance: string;
  mobileNumber: string;
  phoneNumber: string;
  email: string;
  homeAddress: string;
  status: string;
  castCategory: string;
  dateOfWithdrawRetire: string;
  memberType: string;
  divisionRo: string;
  branch: string;
  nomineeName: string;
  nomineeAddress: string;
  relationWithNominee: string;
  declarationDate: string;
  remarks: string;
  isActive: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

// Form field options
export const titleOptions: SelectOption[] = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: tLabel('Mrs') },
  { value: 'Ms', label: 'Ms' },
  { value: 'Dr', label: 'Dr' }
];

export const statusOptions: SelectOption[] = [
  { value: 'Regular', label: tLabel('Regular') },
  { value: 'Inactive', label: tLabel('Inactive') },
  { value: 'Suspended', label: tLabel('Suspended') }
];

export const castCategoryOptions: SelectOption[] = [
  { value: 'OBC', label: 'OBC' },
  { value: 'General', label: tLabel('General') },
  { value: 'SC', label: 'SC' },
  { value: 'ST', label: 'ST' }
];

export const memberTypeOptions: SelectOption[] = [
  { value: 'Regular', label: tLabel('Regular') },
  { value: 'Associate', label: tLabel('Associate') },
  { value: 'Honorary', label: tLabel('Honorary') }
];

export const relationOptions: SelectOption[] = [
  { value: 'Spouse', label: tLabel('Spouse') },
  { value: 'Son', label: tLabel('Son') },
  { value: 'Daughter', label: tLabel('Daughter') },
  { value: 'Father', label: tLabel('Father') },
  { value: 'Mother', label: tLabel('Mother') },
  { value: 'Brother', label: tLabel('Brother') },
  { value: 'Sister', label: tLabel('Sister') }
];

// Default form values
export const defaultFormValues: MemberFormData = {
  memberNumber: '',
  title: 'Mr',
  firstName: '',
  middleName: '',
  lastName: '',
  fatherName: '',
  gender: 'male',
  // BUG FIX 11: Date fields must default to '' — not today's date.
  // Pre-filling with today causes silent wrong dates when user skips the field.
  dateOfBirth: '',
  age: 0,
  designation: '',
  membershipDate: '',
  department: '',
  panCardNo: '',
  frsNumber: '',
  srNoEpfPfNo: '',
  basicPay: '',
  shareAmt: '',
  retirementDate: '',
  aadharNo: '',
  branchMsNo: '',
  monthlyContribution: '',
  compulsatoryDeposit: '',
  startRd: true,
  isInsured: false,
  amountOfInsurance: '',
  mobileNumber: '',
  phoneNumber: '',
  email: '',
  homeAddress: '',
  status: 'Regular',
  castCategory: 'OBC',
  dateOfWithdrawRetire: '',
  memberType: 'Regular',
  divisionRo: '1-BHILAI',
  branch: '',
  nomineeName: '',
  nomineeAddress: '',
  relationWithNominee: '',
  declarationDate: '',
  remarks: '',
  isActive: true
};
