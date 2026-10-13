// types.ts
import type { Dispatch, SetStateAction } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  allowPassTransactions?: boolean;
  createdAt?: string;
}

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  userLevel: string;
  allowPassTransactions: boolean;
  isActive: boolean;
  availablePermissions: string[];
  assignedPermissions: string[];
  avatar?: string;
}

export type UserLevel =
  | 'system'
  | 'administrator'
  | 'manager'
  | 'branch_manager'
  | 'officer'
  | 'passing_officer'
  | 'clerk'
  | 'auditor'
  | 'cashier'
  | 'accountant'
  | 'loan_officer'
  | 'data_operator'
  | 'user';

export type RightsTransferDirection = 'default' | 'allot';

export interface UseUserManagementReturn {
  formData: UserFormData;
  selectedDefaultRights: string[];
  selectedRightsAllot: string[];
  setSelectedDefaultRights: Dispatch<SetStateAction<string[]>>;
  setSelectedRightsAllot: Dispatch<SetStateAction<string[]>>;
  updateFormData: (field: keyof UserFormData, value: any) => void;
  moveRights: (from: RightsTransferDirection, to: RightsTransferDirection) => void;
  moveAllRights: (from: RightsTransferDirection, to: RightsTransferDirection) => void;
  moveSpecificRights: (from: RightsTransferDirection, items: string[]) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  saveUser: () => Promise<void>;
  isUpdating: boolean;
  fetchUser: (username?: string) => Promise<void>;
  allUsers: User[];
  isLoadingUsers: boolean;
  loadUser: (user: User) => void;
  fetchAllUsers: () => Promise<void>;
  statusMessage: { type: 'success' | 'info' | 'warning' | 'error'; text: string } | null;
  clearStatus: () => void;
}
