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
}

const positionPermissions: Record<UserPosition, Partial<Permissions>> = {
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
};

export function usePermissions(userProfile: UserProfile | null): Permissions {
  const { isSuperAdmin } = useSuperAdmin();
  const { config: systemConfig } = useSystemConfig(userProfile?.orgId);

  const permissions = useMemo(() => {
    if (isSuperAdmin) {
      return { 
          ...defaultPermissions,
          canApproveHR: true,
          canApproveFinance: true,
          canApproveMD: true,
          canDisburse: true,
          canManageStaff: true,
          canManageCompany: true,
          canClockIn: true,
          canEditOwnProfile: true,
      };
    }

    if (!userProfile) {
      return defaultPermissions;
    }

    const userPermissions = positionPermissions[userProfile.position] || {};

    // Staff can only edit their profile if the system config allows it.
    const canEditOwnProfile = userProfile.position !== 'Staff' || (systemConfig?.allow_self_edit ?? true);

    return {
      ...defaultPermissions,
      ...userPermissions,
      canEditOwnProfile,
    };
  }, [isSuperAdmin, userProfile, systemConfig]);

  return permissions;
}
