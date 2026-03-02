export type UserPosition = "Staff" | "HR Manager" | "Finance Manager" | "Managing Director" | "Organization Administrator";
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE";

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  orgId: string;
  finance_access: boolean;
  admin_tools: boolean;
  attendance_strict: boolean;
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

export type AttendanceStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Attendance {
    id: string;
    userId: string;
    userName: string;
    orgId: string;
    date: string; // YYYY-MM-DD
    clockIn: string; // ISO String for timestamp
    clockOut?: string; // ISO String for timestamp
    status: AttendanceStatus;
    approvedBy?: string; // userId
    approvedAt?: string; // ISO String
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


export type TaskStatus = "QUEUED" | "ACTIVE" | "AWAITING_REVIEW" | "ARCHIVED";
export type TaskPriority = "CRITICAL" | "OPERATIONAL" | "ROUTINE";

export interface TaskUpdate {
  status: TaskStatus | 'CREATED' | 'UPDATED';
  time: string; // ISO String
  updatedBy: string; // userId
  note?: string;
}

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedToName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // ISO String
  createdBy: string; // userId
  updates: TaskUpdate[];
  createdAt: string; // ISO string
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
    orgId: string;
    participants: string[]; // userIds
    participantProfiles: { // Map userId to a mini profile
        [key: string]: {
            fullName: string;
            avatarURL?: string;
        }
    };
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: string;
    };
    updatedAt: string; // ISO String for timestamp
}

export interface ChatMessage {
    id: string;
    chatId: string;
    orgId: string;
    senderId: string;
    content: string;
    timestamp: string; // ISO String for timestamp
}
