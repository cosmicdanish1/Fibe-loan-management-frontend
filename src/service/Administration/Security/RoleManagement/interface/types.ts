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

export interface RightItemView {
  id: string;
  name: string;
  isSelected: boolean;
  toggle: () => void;
}

export interface RightSectionView {
  name: string;
  total: number;
  on: number;
  open: boolean;
  toggleOpen: () => void;
  grant: () => void;
  revoke: () => void;
  items: RightItemView[];
}

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
  // Search / filter / grouping — Role Governance redesign
  query: string;
  setQuery: (query: string) => void;
  onlyGranted: boolean;
  toggleOnlyGranted: () => void;
  sections: RightSectionView[];
  isEmpty: boolean;
  expandAll: () => void;
  collapseAll: () => void;
}

export interface DefaultRightsConfig {
  userLevels: { value: string; label: string }[];
  defaultMenuRights: Omit<MenuRight, 'id' | 'isSelected' | 'isEnabled'>[];
}
