export type UserPosition = string;
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE";

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface UserProfile {
  id: string; // UID
  orgId: string;
  email: string;
  username: string;
  fullName: string;
  position: UserPosition;
  avatarURL?: string;
  joinedDate: string; // ISO String for timestamp
  status?: UserStatus;
  notificationPreferences?: {
    requisitionUpdates?: boolean;
    taskAssignments?: boolean;
    announcements?: boolean;
  };
}

export interface Attendance {
    id: string;
    userId: string;
    orgId: string;
    date: string; // YYYY-MM-DD
    clockIn: string; // ISO String for timestamp
    clockOut?: string; // ISO String for timestamp
}

export type RequisitionStatus = "PENDING_HR" | "PENDING_FINANCE" | "PENDING_MD" | "APPROVED" | "PAID" | "REJECTED";

export interface ApprovalHistoryEntry {
    actorId: string;
    actorName: string;
    actorPosition: string;
    action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'PAID';
    timestamp: string; // ISO String for timestamp
    fromStatus: RequisitionStatus | 'N/A';
    toStatus: RequisitionStatus;
    reason?: string; // For rejections
}

export interface Requisition {
  id: string;
  serialNo: string;
  orgId: string;
  createdBy: string; // userId
  creatorName: string;
  title: string;
  amount: number;
  description: string;
  attachmentUrl?: string;
  status: RequisitionStatus;
  approvalHistory: ApprovalHistoryEntry[];
  createdAt: string; // ISO String for timestamp
}


export interface AiFields {
    phone?: string;
    email?: string;
    location?: string;
}

export interface TaskTimelineEntry {
    update: string;
    timestamp: string; // ISO string for timestamp
}

export interface Task {
  id: string;
  orgId: string;
  assignedTo: string; // userId
  title: string;
  description: string;
  deadline: string; // ISO String for timestamp
  aiFields?: AiFields;
  isCompleted: boolean;
  timeline?: TaskTimelineEntry[];
}

export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  content: string;
  isPinned: boolean;
  author: string; // userId
  createdAt: string; // ISO String for timestamp
}

export interface Chat {
    id: string;
    participants: string[]; // userIds
    lastMessage?: string;
    updatedAt: string; // ISO String for timestamp
}

export interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: string; // ISO String for timestamp
}
