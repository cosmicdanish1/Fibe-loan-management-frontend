// useUserManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../../../services/api';
import type {
  UserFormData,
  RightsTransferDirection,
  UseUserManagementReturn,
  User
} from '../interface/types';

// ── Native Electron dialog helper (replaces antd message) ─────────────────────
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

export const useUserManagement = (): UseUserManagementReturn => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    userLevel: '',
    allowPassTransactions: false,
    availablePermissions: [],
    assignedPermissions: [],
    avatar: '',
  });

  const [selectedDefaultRights, setSelectedDefaultRights] = useState<string[]>([]);
  const [selectedRightsAllot, setSelectedRightsAllot] = useState<string[]>([]);
  const [rolePermissionsMapping, setRolePermissionsMapping] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [existingUserId, setExistingUserId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  // In-page status for non-blocking notifications (replaces antd message toasts)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'warning' | 'error'; text: string } | null>(null);

  const clearStatus = useCallback(() => setStatusMessage(null), []);

  // Fetch all possible permissions to populate available pool
  const fetchAllPermissions = useCallback(async () => {
    try {
      const response = await apiService.getRolePermissions();
      if (response.success && response.data) {
        const data = response.data;
        setRolePermissionsMapping(data);
        const masterPool = Array.from(new Set(data.flatMap((m: any) => m.permissions))) as string[];
        setFormData(prev => ({
          ...prev,
          availablePermissions: masterPool.filter(p => !prev.assignedPermissions.includes(p))
        }));
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiService.getUsers({ limit: 1000 });
      if (response.success && response.data) {
        setAllUsers((response.data as any).users || []);
      } else {
        setAllUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPermissions();
    fetchAllUsers();
  }, [fetchAllPermissions, fetchAllUsers]);

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'userLevel' && value && !isUpdating) {
        const roleMapping = rolePermissionsMapping.find(m => m.role === value);
        if (roleMapping) {
          const rolePermissions = roleMapping.permissions;
          const masterPool = Array.from(new Set(rolePermissionsMapping.flatMap((m: any) => m.permissions))) as string[];
          return {
            ...newData,
            assignedPermissions: rolePermissions,
            availablePermissions: masterPool.filter(p => !rolePermissions.includes(p))
          };
        }
      }
      return newData;
    });
  };

  const loadUser = useCallback((user: User) => {
    setIsUpdating(true);
    setExistingUserId(user.id);

    const masterPool = Array.from(new Set(rolePermissionsMapping.flatMap((m: any) => m.permissions))) as string[];

    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      firstName: user.firstName,
      lastName: user.lastName,
      userLevel: user.role,
      allowPassTransactions: (user as any).allowPassTransactions ?? false,
      assignedPermissions: user.permissions || [],
      availablePermissions: masterPool.filter(p => !(user.permissions || []).includes(p))
    });
    // In-page non-blocking status (not a dialog — user can see the form filled)
    setStatusMessage({ type: 'success', text: `User '${user.username}' loaded for modification` });
  }, [rolePermissionsMapping]);

  const fetchUser = async (usernameToSearch?: string) => {
    const target = usernameToSearch || formData.username;
    if (!target) {
      await showDialog('warning', 'Search', 'Please enter a username to search', '');
      return;
    }

    try {
      const response = await apiService.getUserByUsername(target);
      if (response.success && response.data) {
        const data = response.data as any;
        const users = data.users || [];
        const user = users.find((u: any) => u.username.toLowerCase() === target.toLowerCase());

        if (user) {
          loadUser(user);
        } else {
          setIsUpdating(false);
          setExistingUserId(null);
          setStatusMessage({ type: 'info', text: `No existing user found for '${target}'. You can create a new one.` });
        }
      }
    } catch (err: any) {
      console.error('Fetch user failed:', err);
      await showDialog('error', 'Search Failed', 'Identity lookup failed', err.message || 'Check server connection.');
    }
  };

  const moveRights = (from: RightsTransferDirection, to: RightsTransferDirection) => {
    if (from === 'default' && to === 'allot') {
      const toMove = selectedDefaultRights;
      setFormData(prev => ({
        ...prev,
        availablePermissions: prev.availablePermissions.filter(r => !toMove.includes(r)),
        assignedPermissions: [...prev.assignedPermissions, ...toMove]
      }));
      setSelectedDefaultRights([]);
    } else if (from === 'allot' && to === 'default') {
      const toMove = selectedRightsAllot;
      setFormData(prev => ({
        ...prev,
        assignedPermissions: prev.assignedPermissions.filter(r => !toMove.includes(r)),
        availablePermissions: [...prev.availablePermissions, ...toMove]
      }));
      setSelectedRightsAllot([]);
    }
  };

  const moveAllRights = (from: RightsTransferDirection, to: RightsTransferDirection) => {
    if (from === 'default' && to === 'allot') {
      setFormData(prev => ({
        ...prev,
        assignedPermissions: [...prev.assignedPermissions, ...prev.availablePermissions],
        availablePermissions: []
      }));
      setSelectedDefaultRights([]);
    } else if (from === 'allot' && to === 'default') {
      setFormData(prev => ({
        ...prev,
        availablePermissions: [...prev.availablePermissions, ...prev.assignedPermissions],
        assignedPermissions: []
      }));
      setSelectedRightsAllot([]);
    }
  };

  const validateForm = (): boolean => {
    const { username, password, confirmPassword, userLevel } = formData;

    if (!username.trim() || !userLevel) {
      showDialog('warning', 'Validation', 'User Name and User Level are mandatory', '');
      return false;
    }

    if (!isUpdating && !password.trim()) {
      showDialog('warning', 'Validation', 'Password is required for new users', '');
      return false;
    }

    // Backend enforces @MinLength(6)
    if (!isUpdating && password.length < 6) {
      showDialog('warning', 'Validation', 'Password must be at least 6 characters', '');
      return false;
    }

    if (password && password !== confirmPassword) {
      showDialog('warning', 'Validation', 'Passwords do not match', 'Re-enter the password in both fields.');
      return false;
    }

    if (isUpdating && password && password.length < 6) {
      showDialog('warning', 'Validation', 'New password must be at least 6 characters', '');
      return false;
    }

    // Email is optional — left blank, one is auto-generated from the
    // username. If the admin does type one, it must actually be valid: a
    // malformed value here used to only surface as a cryptic backend
    // "email must be an email" error with no visible field to blame.
    const trimmedEmail = formData.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showDialog('warning', 'Validation', 'Email address is not valid', 'Leave it blank to auto-generate one, or fix the format.');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setIsUpdating(false);
    setExistingUserId(null);
    setStatusMessage(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      userLevel: '',
      allowPassTransactions: false,
      availablePermissions: Array.from(new Set(rolePermissionsMapping.flatMap((m: any) => m.permissions))) as string[],
      assignedPermissions: []
    });
    setSelectedDefaultRights([]);
    setSelectedRightsAllot([]);
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      // Trim both sides: a stray leading/trailing space in either field used
      // to produce a malformed synthesized email (e.g. "danish @bank.local")
      // that failed backend validation with no indication the username was
      // the actual cause, since there was no email field to look at.
      const email = formData.email.trim() || `${formData.username.trim().toLowerCase()}@bank.local`;
      const firstName = formData.firstName || formData.username;
      const lastName = formData.lastName || 'User';

      const payload: any = {
        username: formData.username,
        email,
        firstName,
        lastName,
        role: formData.userLevel,
        permissions: formData.assignedPermissions,
        isActive: true,
        allowPassTransactions: formData.allowPassTransactions,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      let response;
      if (isUpdating) {
        response = await apiService.updateUser(existingUserId!, payload);
      } else {
        response = await apiService.createUser(payload);
      }

      if (!response.success) {
        throw new Error((response as any).error || 'Identity synchronization failed');
      }

      await showDialog(
        'info',
        'Identity Synchronization System',
        isUpdating ? 'User Identity Updated Successfully!' : 'New User Identity Created Successfully!',
        `USERNAME   : ${formData.username}\n` +
        `LEVEL      : ${formData.userLevel.toUpperCase()}\n` +
        `EMAIL      : ${email}\n` +
        `NAME       : ${firstName} ${lastName}\n` +
        `PRIVILEGES : ${formData.assignedPermissions.length} Rights\n\n` +
        `✓ User record synchronized\n` +
        `✓ Role-based access control (RBAC) active`
      );

      resetForm();
      fetchAllUsers();
    } catch (err: any) {
      await showDialog(
        'error',
        'Identity Synchronization Error',
        'Failed to process user identity',
        `Error: ${err.message || 'Matrix connection failed'}\n\n` +
        `Troubleshooting:\n` +
        `• Check if the username is already taken\n` +
        `• Ensure the database server is reachable\n` +
        `• Verify your network connection`
      );
    }
  };

  return {
    formData,
    selectedDefaultRights,
    selectedRightsAllot,
    setSelectedDefaultRights,
    setSelectedRightsAllot,
    updateFormData,
    moveRights,
    moveAllRights,
    validateForm,
    resetForm,
    saveUser,
    isUpdating,
    fetchUser,
    allUsers,
    isLoadingUsers,
    loadUser,
    fetchAllUsers,
    statusMessage,
    clearStatus,
  };
};
