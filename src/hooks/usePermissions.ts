'use client';
import type { UserProfile, UserPosition } from '@/lib/types';
import { useSuperAdmin } from './useSuperAdmin';

export interface Permissions {
  canApproveHR: boolean;
  canApproveFinance: boolean;
  canApproveMD: boolean;
  canDisburse: boolean;
  canManageStaff: boolean;
  canManageCompany: boolean;
  canClockIn: boolean;
  // Add other permissions as needed
}

const positionPermissions: Record<UserPosition, Partial<Permissions>> = {
  'Staff': {
    canClockIn: true,
  },
  'HR Manager': {
    canApproveHR: true,
    canManageStaff: true,
    canClockIn: true,
  },
  'Finance Manager': {
    canApproveFinance: true,
    canDisburse: true,
    canClockIn: true,
  },
  'Managing Director': {
    canApproveMD: true,
    canManageStaff: true,
    canClockIn: true,
  },
  'Organization Administrator': {
    canApproveHR: true,
    canApproveFinance: true,
    canApproveMD: true,
    canDisburse: true,
    canManageStaff: true,
    canManageCompany: true,
    canClockIn: true,
  },
};

const defaultPermissions: Permissions = {
  canApproveHR: false,
  canApproveFinance: false,
  canApproveMD: false,
  canDisburse: false,
  canManageStaff: false,
  canManageCompany: false,
  canClockIn: false,
};

export function usePermissions(userProfile: UserProfile | null) {
  const { isSuperAdmin } = useSuperAdmin();

  if (isSuperAdmin) {
    return { 
        ...defaultPermissions,
        canApproveHR: true,
        canApproveFinance: true,
        canApproveMD: true,
        canDisburse: true,
        canManageStaff: true,
        canManageCompany: true,
        canClockIn: true, // Super admin can do everything
    };
  }

  if (!userProfile) {
    return defaultPermissions;
  }

  const userPermissions = positionPermissions[userProfile.position] || {};

  return {
    ...defaultPermissions,
    ...userPermissions,
  };
}
