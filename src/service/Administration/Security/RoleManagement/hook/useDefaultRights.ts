// useDefaultRights.ts
import { useState, useEffect } from 'react';
import { apiService } from '../../../../../services/api';
import type {
  DefaultRightsFormData,
  UseDefaultRightsReturn
} from '../interface/types';

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail = '',
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

export const useDefaultRights = (): UseDefaultRightsReturn => {
  const [formData, setFormData] = useState<DefaultRightsFormData>({
    userLevel: '',
    menuRights: []
  });

  const [selectedUserLevel, setSelectedUserLevel] = useState<string>('');
  const [userLevels, setUserLevels] = useState<{ value: string; label: string }[]>([]);

  // 1. Initial Load: Fetch all possible user levels and all menu items
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [levelsRes, menusRes] = await Promise.all([
          apiService.getRoleLevels(),
          apiService.getRoleMenus()
        ]);

        if (levelsRes.success && levelsRes.data) {
          setUserLevels(levelsRes.data.map((l: any) => ({
            value: l.userlevelid.toString(),
            label: l.userlevel
          })));
        }

        if (menusRes && menusRes.success && menusRes.data) {
          setFormData(prev => ({
            ...prev,
            menuRights: (menusRes.data as any[]).map((m: any) => ({
              id: `right_${m.menuid}`,
              code: m.menuid.toString(),
              description: (() => {
                if (m.menudesc && /[a-zA-Z]/.test(m.menudesc)) {
                  return m.menudesc;
                }
                const name = (m.menuname || '').replace(/^mnu/i, '');
                if (name.includes(' ')) return name;
                return name.replace(/([A-Z])/g, ' $1').trim() || m.menuname;
              })(),
              isSelected: false,
              isEnabled: true
            }))
          }));
        }
      } catch (err) {
        console.error('Failed to initialize Role Management data:', err);
        await showDialog('error', 'Initialization Error', 'Failed to load role/menu matrix from database.', 'Check your connection and try reloading.');
      }
    };

    initializeData();
  }, []);

  // 2. Selection Sync: When user level changes, fetch its saved default rights
  useEffect(() => {
    const fetchDefaults = async () => {
      if (!selectedUserLevel) return;

      try {
        const response = await apiService.getRoleDefaultRights(parseInt(selectedUserLevel));
        if (response.success && response.data) {
          const savedMenuIds = response.data;

          setFormData(prev => ({
            ...prev,
            userLevel: selectedUserLevel,
            menuRights: prev.menuRights.map(right => ({
              ...right,
              isSelected: savedMenuIds.includes(parseInt(right.code))
            }))
          }));
        }
      } catch (err) {
        console.error('Failed to fetch default rights:', err);
        await showDialog('error', 'Sync Error', 'Failed to load default rights for the selected level.', 'The policy matrix could not be retrieved.');
      }
    };

    fetchDefaults();
  }, [selectedUserLevel]);

  const updateUserLevel = (level: string) => {
    setSelectedUserLevel(level);
  };

  const toggleMenuRight = (rightId: string) => {
    setFormData(prev => ({
      ...prev,
      menuRights: prev.menuRights.map(right =>
        right.id === rightId
          ? { ...right, isSelected: !right.isSelected }
          : right
      )
    }));
  };

  const toggleAllRights = (selectAll: boolean) => {
    setFormData(prev => ({
      ...prev,
      menuRights: prev.menuRights.map(right => ({
        ...right,
        isSelected: selectAll && right.isEnabled
      }))
    }));
  };

  const saveDefaultRights = async () => {
    if (!selectedUserLevel) return;

    try {
      const selectedMenuIds = formData.menuRights
        .filter(right => right.isSelected)
        .map(right => parseInt(right.code));

      const response = await apiService.updateRoleDefaultRights(
        parseInt(selectedUserLevel),
        selectedMenuIds
      );

      if (response.success) {
        const levelLabel = userLevels.find(l => l.value === selectedUserLevel)?.label || 'Selected Level';
        await showDialog(
          'info',
          'Role Governance System',
          'Default Access Matrix Synchronized!',
          `TARGET USER LEVEL : ${levelLabel.toUpperCase()}\n` +
          `GRANTED RIGHTS    : ${selectedMenuIds.length} Modules\n` +
          `REVOKED RIGHTS    : ${formData.menuRights.length - selectedMenuIds.length} Modules\n\n` +
          `✓ Database updated successfully`
        );
      } else {
        throw new Error(response.error || 'Backend rejected synchronization');
      }
    } catch (err: any) {
      await showDialog(
        'error',
        'Governance Synchronization Failure',
        'Failed to update access matrix.',
        `Error: ${err.message}\n\nPlease check your connection and try again.`
      );
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      menuRights: prev.menuRights.map(right => ({
        ...right,
        isSelected: false
      }))
    }));
    setSelectedUserLevel('');
  };

  const getSelectedRightsCount = (): number => {
    return formData.menuRights.filter(right => right.isSelected).length;
  };

  const getTotalRightsCount = (): number => {
    return formData.menuRights.length;
  };

  const createRole = async (roleName: string) => {
    try {
      const response = await apiService.createRoleLevel(roleName);
      if (response.success) {
        const levelsRes = await apiService.getRoleLevels();
        if (levelsRes.success && levelsRes.data) {
          setUserLevels(levelsRes.data.map((l: any) => ({
            value: l.userlevelid.toString(),
            label: l.userlevel
          })));
        }
        await showDialog('info', 'Role Governance System', 'New Control Level Established!', `Level "${roleName.toUpperCase()}" has been added to the hierarchy.`);
      } else {
        throw new Error(response.error || 'Failed to create role');
      }
    } catch (err: any) {
      console.error('Create role error:', err);
      await showDialog('error', 'Create Level Failed', err.message || 'Failed to create new role level', 'Ensure the level name is unique and try again.');
    }
  };

  return {
    formData,
    selectedUserLevel,
    userLevels,
    updateUserLevel,
    toggleMenuRight,
    toggleAllRights,
    saveDefaultRights,
    resetForm,
    getSelectedRightsCount,
    getTotalRightsCount,
    createRole
  };
};
