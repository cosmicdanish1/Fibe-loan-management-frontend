// types.ts
export interface MenuRight {
  id: string;
  code: string;
  description: string;
  isSelected: boolean;
  isEnabled: boolean;
}

export interface DefaultRightsFormData {
  userLevel: string;
  menuRights: MenuRight[];
}

export type UserLevel = 'admin' | 'manager' | 'user' | 'guest' | 'supervisor' | '';

export interface UseDefaultRightsReturn {
  formData: DefaultRightsFormData;
  selectedUserLevel: string;
  userLevels: { value: string; label: string }[];
  updateUserLevel: (level: string) => void;
  toggleMenuRight: (rightId: string) => void;
  toggleAllRights: (selectAll: boolean) => void;
  saveDefaultRights: () => void;
  resetForm: () => void;
  getSelectedRightsCount: () => number;
  getTotalRightsCount: () => number;
  createRole: (roleName: string) => Promise<void>;
}

export interface DefaultRightsConfig {
  userLevels: { value: string; label: string }[];
  defaultMenuRights: Omit<MenuRight, 'id' | 'isSelected' | 'isEnabled'>[];
}
