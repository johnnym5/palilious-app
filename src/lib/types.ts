export type UserRole = 'STAFF' | 'HR' | 'FINANCE' | 'MD';
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarURL?: string;
  joinedDate: string; // ISO String for timestamp
  birthday?: string; // ISO String for timestamp
  status?: UserStatus;
}

export interface Attendance {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    clockIn: string; // ISO String for timestamp
    clockOut?: string; // ISO String for timestamp
}

export type RequisitionStatus = "PENDING_HR" | "PENDING_FINANCE" | "PENDING_MD" | "APPROVED" | "PAID" | "REJECTED";

export interface ApprovalHistoryEntry {
    actor: string; // userId
    action: string;
    time: string; // ISO String for timestamp
}

export interface Requisition {
  id: string;
  serialNo: string;
  createdBy: string; // userId
  amount: number;
  description: string;
  attachmentUrl?: string;
  status: RequisitionStatus;
  approvalHistory?: ApprovalHistoryEntry[];
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
