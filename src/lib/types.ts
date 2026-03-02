export type UserRole = 'STAFF' | 'HR' | 'FINANCE' | 'MD';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  onlineStatus?: 'Online' | 'Offline';
}

export type RequisitionStatus = 'PENDING_HR' | 'PENDING_FINANCE' | 'PENDING_MD' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface Requisition {
  id: string;
  serialNumber: string;
  userId: string;
  user?: User;
  description: string;
  amount: number;
  status: RequisitionStatus;
  createdAt: string;
  attachmentUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDateTime: string;
  isCompleted: boolean;
  assignedToUserId: string;
  status: string;
}

export interface Announcement {
  id:string;
  title: string;
  content: string;
  author: string;
  isPinned: boolean;
  createdAt: string;
}

export interface CompanyGoal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  description: string;
}
