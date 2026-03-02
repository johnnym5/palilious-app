import type { User, Announcement, CompanyGoal, Requisition } from './types';

export const mockUsers: User[] = [
  { id: '1', fullName: 'Sarah Carter', email: 'sarah.carter@controlflow.com', role: 'MD', avatarUrl: 'https://picsum.photos/seed/1/48/48', onlineStatus: 'Online' },
  { id: '2', fullName: 'Michael Chen', email: 'michael.chen@controlflow.com', role: 'FINANCE', avatarUrl: 'https://picsum.photos/seed/2/48/48', onlineStatus: 'Online' },
  { id: '3', fullName: 'Jessica Rodriguez', email: 'jessica.rodriguez@controlflow.com', role: 'HR', avatarUrl: 'https://picsum.photos/seed/3/48/48', onlineStatus: 'Offline' },
  { id: '4', fullName: 'David Lee', email: 'david.lee@controlflow.com', role: 'STAFF', avatarUrl: 'https://picsum.photos/seed/4/48/48', onlineStatus: 'Online' },
  { id: '5', fullName: 'Emily White', email: 'emily.white@controlflow.com', role: 'STAFF', avatarUrl: 'https://picsum.photos/seed/5/48/48', onlineStatus: 'Offline' },
];

export const mockCurrentUser: User = mockUsers[0]; // Assume MD is logged in

export const mockAnnouncements: Announcement[] = [
  { id: '1', title: 'Q3 Performance Review', content: 'All department heads are reminded to submit their team performance reviews by EOD Friday.', author: 'Jessica Rodriguez', isPinned: true, createdAt: '2024-07-22T09:00:00Z' },
  { id: '2', title: 'New Office Cafe Menu', content: 'The new cafe menu starts next Monday! Check out the new additions including vegan options.', author: 'Jessica Rodriguez', isPinned: false, createdAt: '2024-07-21T14:30:00Z' },
  { id: '3', title: 'System Maintenance Scheduled', content: 'There will be a scheduled system maintenance on Sunday from 2 AM to 4 AM. Services may be intermittently unavailable.', author: 'IT Department', isPinned: false, createdAt: '2024-07-20T11:00:00Z' },
];

export const mockCompanyGoals: CompanyGoal[] = [
  { id: '1', title: 'Quarterly Revenue Target', progress: 85, target: 100, description: 'Achieve $5M in quarterly revenue.' },
  { id: '2', title: 'Customer Satisfaction Score', progress: 92, target: 100, description: 'Maintain a CSAT score above 90%.' },
  { id: '3', title: 'New Feature Adoption', progress: 60, target: 100, description: 'Reach 75% user adoption for the new module.' },
];

export const mockRequisitions: Omit<Requisition, 'user'>[] = [
  { id: '1', serialNumber: 'REQ-00021', userId: '4', description: 'New ergonomic chairs for the design team', amount: 1200, status: 'PENDING_MD', createdAt: '2024-07-22T10:00:00Z' },
  { id: '2', serialNumber: 'REQ-00020', userId: '5', description: 'Software license renewals (Adobe Suite)', amount: 850, status: 'PENDING_FINANCE', createdAt: '2024-07-21T15:20:00Z' },
  { id: '3', serialNumber: 'REQ-00019', userId: '2', description: 'Catering for client meeting', amount: 300, status: 'PENDING_HR', createdAt: '2024-07-21T11:45:00Z' },
];

export const mockTasks = [
    { id: '1', title: 'Finalize Q3 budget report', isCompleted: false, assignedTo: mockUsers[1] },
    { id: '2', title: 'Review new marketing campaign assets', isCompleted: false, assignedTo: mockUsers[0] },
    { id: '3', title: 'Onboard new hire - Alex Smith', isCompleted: true, assignedTo: mockUsers[2] },
];

export const mockBirthdays = [
    { fullName: 'David Lee', birthday: 'July 28th', avatarUrl: 'https://picsum.photos/seed/4/48/48' },
    { fullName: 'Sophia Loren', birthday: 'August 5th', avatarUrl: 'https://picsum.photos/seed/6/48/48' },
];
