// useUserManagement.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../../../../services/api';
import type {
  UserFormData,
  RightsTransferDirection,
  UseUserManagementReturn,
  User
} from '../interface/types';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';
import { isDuplicateUserError } from '../utils/windowRights';
import { passwordProblems } from '../../../../../utils/passwordPolicy';

/** A yes / no question: the native box in the app, the browser's own when there is no app shell */
export const askYesNo = async (title: string, message: string, detail = ''): Promise<boolean> => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    const r = await api.showMessageBox({ type: 'question', title, message, detail, buttons: ['Yes', 'No'], defaultId: 0, cancelId: 1 });
    return r?.response === 0;
  }
  return typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(`${message}\n\n${detail}`.trim()) : false;
};

interface HookOptions {
  /** The window rights to save with the person: set by the page once its rights lists exist (null = nothing to send) */
  getMenuIds?: React.MutableRefObject<() => number[] | null>;
  /** Called after a successful save, before the form is cleared */
  onSaved?: React.MutableRefObject<() => void>;
}

// ── Native Electron dialog helper (replaces antd message) ─────────────────────
export const useUserManagement = (opts: HookOptions = {}): UseUserManagementReturn => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    userLevel: '',
    allowPassTransactions: false,
    isActive: true,
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
      // The list endpoint rejected limit=1000 (HTTP 400): page through in
      // modest chunks instead of asking for everything at once.
      const PAGE_SIZE = 100;
      const collected: User[] = [];
      for (let page = 1; page <= 100; page++) {
        const response = await apiService.getUsers({ page, limit: PAGE_SIZE });
        if (!response.success || !response.data) break;
        const data = response.data as any;
        const batch: User[] = data.users || [];
        collected.push(...batch);
        const total = Number(data.total) || 0;
        if (batch.length < PAGE_SIZE || (total > 0 && collected.length >= total)) break;
      }
      setAllUsers(collected);
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
      // Keep the account's real state so saving an edit never silently re-activates it
      isActive: user.isActive !== false,
      assignedPermissions: user.permissions || [],
      availablePermissions: masterPool.filter(p => !(user.permissions || []).includes(p))
    });
    // In-page non-blocking status (not a dialog — user can see the form filled)
    setStatusMessage({ type: 'success', text: `User '${user.username}' loaded for modification` });
  }, [rolePermissionsMapping]);

  const fetchUser = async (usernameToSearch?: string) => {
    const target = usernameToSearch || formData.username;
    if (!target) {
      await showDialog('warning', t('Search'), t('Please enter a username to search'), '');
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
      } else {
        // a refused or failed lookup used to do nothing at all
        await showDialog('error', t('Search Failed'), t('Identity lookup failed'), response.message || (response as any).error || t('Check server connection.'));
      }
    } catch (err: any) {
      console.error('Fetch user failed:', err);
      await showDialog('error', t('Search Failed'), t('Identity lookup failed'), err.message || t('Check server connection.'));
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

  /** Move exactly these rights (drag and drop), regardless of what is currently selected. */
  const moveSpecificRights = (from: RightsTransferDirection, items: string[]) => {
    if (from === 'default') {
      setFormData(prev => ({
        ...prev,
        availablePermissions: prev.availablePermissions.filter(r => !items.includes(r)),
        assignedPermissions: [...prev.assignedPermissions, ...items.filter(r => prev.availablePermissions.includes(r))]
      }));
      setSelectedDefaultRights([]);
    } else {
      setFormData(prev => ({
        ...prev,
        assignedPermissions: prev.assignedPermissions.filter(r => !items.includes(r)),
        availablePermissions: [...prev.availablePermissions, ...items.filter(r => prev.assignedPermissions.includes(r))]
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
      showDialog('warning', t('Validation'), t('User Name and User Level are mandatory'), '');
      return false;
    }
    // the same rule the server applies: it used to fail with a database error (longer than 20) or save with spaces
    if (username.trim().length > 20 || !/^[A-Za-z0-9._-]+$/.test(username.trim())) {
      showDialog('warning', t('Validation'), t('User name: up to 20 letters, digits, dot, underscore or hyphen'), t('No spaces.'));
      return false;
    }

    if (!isUpdating && !password.trim()) {
      showDialog('warning', t('Validation'), t('Password is required for new users'), '');
      return false;
    }

    if (password && password !== confirmPassword) {
      showDialog('warning', t('Validation'), t('Passwords do not match'), t('Re-enter the password in both fields.'));
      return false;
    }

    // ES-660: the same rule the person must follow when they change it themselves (the server applies it again)
    if (password) {
      const problems = passwordProblems(password);
      if (problems.length > 0) {
        showDialog('warning', t('Validation'), t('Password must be 8 to 64 characters with an uppercase letter, a lowercase letter and a number'),
          problems.includes('hashlike') ? t('It must not start with $2a$, $2b$ or $2y$.') : '');
        return false;
      }
    }

    const ids = opts.getMenuIds?.current?.();
    if (ids && ids.length === 0) {
      showDialog('warning', t('Validation'), t('Give this person at least one window'), t('Move at least one window to Allowed.'));
      return false;
    }

    // Email is optional — left blank, one is auto-generated from the
    // username. If the admin does type one, it must actually be valid: a
    // malformed value here used to only surface as a cryptic backend
    // "email must be an email" error with no visible field to blame.
    const trimmedEmail = formData.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showDialog('warning', t('Validation'), t('Email address is not valid'), t('Leave it blank to auto-generate one, or fix the format.'));
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
      isActive: true,
      availablePermissions: Array.from(new Set(rolePermissionsMapping.flatMap((m: any) => m.permissions))) as string[],
      assignedPermissions: []
    });
    setSelectedDefaultRights([]);
    setSelectedRightsAllot([]);
  };

  const savingRef = useRef(false);
  const saveUser = async () => {
    if (savingRef.current) return; // a double click or Enter + click sends one request
    if (!validateForm()) return;
    savingRef.current = true;
    try {
      // Trim both sides: a stray leading/trailing space in either field used
      // to produce a malformed synthesized email (e.g. "danish @bank.local")
      // that failed backend validation with no indication the username was
      // the actual cause, since there was no email field to look at.
      const email = formData.email.trim() || `${formData.username.trim().toLowerCase()}@bank.local`;
      const firstName = formData.firstName || formData.username;
      const lastName = formData.lastName || 'User';

      const payload: any = {
        username: formData.username.trim(),
        email,
        firstName,
        lastName,
        role: formData.userLevel,
        permissions: formData.assignedPermissions,
        isActive: formData.isActive,
        allowPassTransactions: formData.allowPassTransactions,
      };

      if (formData.password) {
        payload.password = formData.password;
      }
      // the windows this person may open (not sent for administrators / SYSTEM, who have every window)
      const menuIds = opts.getMenuIds?.current?.();
      if (menuIds) payload.menuIds = menuIds;

      let response;
      if (isUpdating) {
        response = await apiService.updateUser(existingUserId!, payload);
      } else {
        response = await apiService.createUser(payload);
      }

      if (!response.success) {
        throw new Error(response.message || (response as any).error || 'Identity synchronization failed');
      }

      await showDialog(
        'info',
        t('Identity Synchronization System'),
        isUpdating ? t('User Identity Updated Successfully!') : t('New User Identity Created Successfully!'),
        `USERNAME   : ${formData.username}\n` +
        `LEVEL      : ${formData.userLevel.toUpperCase()}\n` +
        `EMAIL      : ${email}\n` +
        `NAME       : ${firstName} ${lastName}\n` +
        `PRIVILEGES : ${formData.assignedPermissions.length} Rights\n\n` +
        `✓ User record synchronized\n` +
        `✓ Role-based access control (RBAC) active`
      );

      opts.onSaved?.current?.();
      resetForm();
      fetchAllUsers();
    } catch (err: any) {
      // Legacy asks "This user already exists. Do you want to modify or disable this user?": say yes and the person is loaded
      if (!isUpdating && isDuplicateUserError(String(err?.message || ''))) {
        const modify = await askYesNo(
          t('User already exists'),
          t('This user already exists. Do you want to modify or disable this user?'),
          formData.username,
        );
        if (modify) await fetchUser(formData.username);
        return;
      }
      await showDialog(
        'error',
        t('Identity Synchronization Error'),
        t('Failed to process user identity'),
        `Error: ${err.message || 'Matrix connection failed'}\n\n` +
        `Troubleshooting:\n` +
        `• Check if the username is already taken\n` +
        `• Ensure the database server is reachable\n` +
        `• Verify your network connection`
      );
    } finally {
      savingRef.current = false;
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
    moveSpecificRights,
    validateForm,
    resetForm,
    saveUser,
    isUpdating,
    existingUserId,
    fetchUser,
    allUsers,
    isLoadingUsers,
    loadUser,
    fetchAllUsers,
    statusMessage,
    clearStatus,
  };
};
