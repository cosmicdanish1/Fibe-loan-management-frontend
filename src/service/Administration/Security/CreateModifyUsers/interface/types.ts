// types.ts
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  permissions: string[];
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
  availablePermissions: string[];
  assignedPermissions: string[];
  avatar: string;
}

export type UserLevel =
  | 'system'
  | 'administrator'
  | 'branch_manager'
  | 'officer'
  | 'passing_officer'
  | 'clerk'
  | 'auditor'
  | 'cashier'
  | 'user';

export type RightsTransferDirection = 'default' | 'allot';

export interface UseUserManagementReturn {
  formData: UserFormData;
  selectedDefaultRights: string[];
  selectedRightsAllot: string[];
  setSelectedDefaultRights: (rights: string[]) => void;
  setSelectedRightsAllot: (rights: string[]) => void;
  updateFormData: (field: keyof UserFormData, value: any) => void;
  moveRights: (from: RightsTransferDirection, to: RightsTransferDirection) => void;
  moveAllRights: (from: RightsTransferDirection, to: RightsTransferDirection) => void;
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
