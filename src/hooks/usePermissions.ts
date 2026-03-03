'use client';
import type { UserProfile, UserPosition } from '@/lib/types';
import { useSuperAdmin } from './useSuperAdmin';
import { useSystemConfig } from './useSystemConfig';
import { useMemo } from 'react';

export interface Permissions {
  canApproveHR: boolean;
  canApproveFinance: boolean;
  canApproveMD: boolean;
  canDisburse: boolean;
  canManageStaff: boolean;
  canManageCompany: boolean;
  canClockIn: boolean;
  canEditOwnProfile: boolean;
  canAccessRequisitions: boolean;
  canAccessChat: boolean;
  canAccessAllTasks: boolean;
  canAccessAllWorkbooks: boolean;
}

// Maps new descriptive roles to the original, simpler roles used for permission logic.
const getBaseRoleForPermissions = (position: UserPosition): 'Staff' | 'HR Manager' | 'Finance Manager' | 'Managing Director' | 'Organization Administrator' => {
    switch (position) {
        case "CEO / Managing Director":
            return "Managing Director";
        case "Finance Manager":
            return "Finance Manager";
        case "HR Manager":
            return "HR Manager";
        case "Organization Administrator":
            return "Organization Administrator";
        default:
            return "Staff";
    }
}


const positionPermissions: Record<'Staff' | 'HR Manager' | 'Finance Manager' | 'Managing Director' | 'Organization Administrator', Partial<Permissions>> = {
  'Staff': {},
  'HR Manager': {
    canApproveHR: true,
    canManageStaff: true,
  },
  'Finance Manager': {
    canApproveFinance: true,
    canDisburse: true,
  },
  'Managing Director': {
    canApproveMD: true,
    canManageStaff: true,
  },
  'Organization Administrator': {
    canApproveHR: true,
    canApproveFinance: true,
    canApproveMD: true,
    canDisburse: true,
    canManageStaff: true,
    canManageCompany: true,
  },
};

const defaultPermissions: Permissions = {
  canApproveHR: false,
  canApproveFinance: false,
  canApproveMD: false,
  canDisburse: false,
  canManageStaff: false,
  canManageCompany: false,
  canClockIn: true,
  canEditOwnProfile: true,
  canAccessRequisitions: false,
  canAccessChat: false,
  canAccessAllTasks: false,
  canAccessAllWorkbooks: false,
};

export function usePermissions(userProfile: UserProfile | null): Permissions {
  const { isSuperAdmin } = useSuperAdmin();
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);

  const permissions = useMemo(() => {
    if (isSuperAdmin) {
      return { 
          canApproveHR: true,
          canApproveFinance: true,
          canApproveMD: true,
          canDisburse: true,
          canManageStaff: true,
          canManageCompany: true,
          canClockIn: true,
          canEditOwnProfile: true,
          canAccessRequisitions: true,
          canAccessChat: true,
          canAccessAllTasks: true,
          canAccessAllWorkbooks: true,
      };
    }

    if (!userProfile) {
      return defaultPermissions;
    }
    
    const baseRole = getBaseRoleForPermissions(userProfile.position);
    const rolePerms = positionPermissions[baseRole] || {};
    const customPerms = userProfile.customPermissions || {};

    const perms: Permissions = {
        ...defaultPermissions,
        ...rolePerms,
    };

    // 1. Base module access is gated by the org-wide SystemConfig
    // Staff should have access to create requisitions if module is on
    perms.canAccessRequisitions = systemConfig?.finance_access ?? false;
    perms.canAccessChat = systemConfig?.chat_enabled ?? false;

    // 2. "View All" permissions are typically tied to management roles
    perms.canAccessAllTasks = !!rolePerms.canManageStaff;
    perms.canAccessAllWorkbooks = !!rolePerms.canManageStaff;

    // 3. Apply user-specific custom permissions as overrides
    // A custom permission cannot grant access if the global switch is off.
    if (typeof customPerms.canAccessRequisitions === 'boolean') {
        perms.canAccessRequisitions = customPerms.canAccessRequisitions && (systemConfig?.finance_access ?? true);
    }
    if (typeof customPerms.canAccessChat === 'boolean') {
        perms.canAccessChat = customPerms.canAccessChat && (systemConfig?.chat_enabled ?? true);
    }
    if (typeof customPerms.canAccessAllTasks === 'boolean') {
        perms.canAccessAllTasks = customPerms.canAccessAllTasks;
    }
     if (typeof customPerms.canAccessAllWorkbooks === 'boolean') {
        perms.canAccessAllWorkbooks = customPerms.canAccessAllWorkbooks;
    }
    
    // 4. Special cases
    perms.canEditOwnProfile = userProfile.position !== 'Staff' || (systemConfig?.allow_self_edit ?? true);

    return perms;
  }, [isSuperAdmin, userProfile, systemConfig]);

  return permissions;
}
