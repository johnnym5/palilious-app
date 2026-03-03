export type UserPosition = "Staff" | "HR Manager" | "Finance Manager" | "Managing Director" | "Organization Administrator";
export type UserStatus = "ONLINE" | "OFFLINE" | "ON_LEAVE";

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface SystemConfig {
  id:string;
  orgId: string;
  finance_access: boolean;
  admin_tools: boolean;
  attendance_strict: boolean;
  chat_enabled: boolean;
  allow_self_edit: boolean;
  office_coordinates?: {
    lat: number;
    lng: number;
  } | null;
  work_hours?: {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  };
  currency_symbol: string;
  branding_color?: string | null; // Hex code
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
  lastSeen?: string; // ISO String
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
    remarks?: Array<'EARLY' | 'LATE' | 'OVERTIME' | 'UNDERTIME'>;
    duration?: number; // seconds
    overtime?: number; // seconds
    undertime?: number; // seconds
}

export type RequisitionStatus = "PENDING_HR" | "PENDING_FINANCE" | "PENDING_MD" | "APPROVED" | "PAID" | "REJECTED";
export type TaskStatus = "QUEUED" | "ACTIVE" | "AWAITING_REVIEW" | "ARCHIVED";
export type ActivityType = 'LOG' | 'COMMENT';

export interface ActivityEntry {
    type: ActivityType;
    actorId: string; // userId
    actorName: string;
    actorAvatarUrl?: string;
    timestamp: string; // ISO String for timestamp
    text: string; // The content of the log or comment
    
    // Optional fields for LOG entries
    fromStatus?: RequisitionStatus | TaskStatus | 'N/A';
    toStatus?: RequisitionStatus | TaskStatus;
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
  activity: ActivityEntry[];
  createdAt: string; // ISO String for timestamp
}

export type TaskPriority = "LEVEL_1" | "LEVEL_2" | "LEVEL_3";

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
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
  dueDate?: string; // ISO String
  createdBy: string; // userId
  activity: ActivityEntry[];
  createdAt: string; // ISO string
  attachmentUrl?: string;
  sharedWith?: string[];
  subTasks?: SubTask[];
  type?: 'STANDARD' | 'ASSISTANCE_REQUEST';
  relatedTaskId?: string;
  requesterId?: string;
  requesterName?: string;
}


export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  content: string;
  isPinned: boolean;
  authorId: string; // userId
  authorName: string;
  createdAt: string; // ISO String for timestamp
  viewedBy?: string[]; // Array of userIds
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

export interface Workbook {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  createdBy: string;
  creatorName: string;
  createdAt: string; // ISO String
}

export interface Sheet {
  id: string;
  workbookId: string;
  name: string;
  data: Record<string, any>[];
  headers: string[];
  createdAt: string; // ISO String
}
