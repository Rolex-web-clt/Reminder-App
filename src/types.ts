export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Status = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
export type SharePermission = 'VIEW' | 'EDIT' | 'COMPLETE' | 'ADMIN';

export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  phone?: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  role: 'USER' | 'ADMIN' | 'MANAGER';
  language: 'en' | 'ne' | 'hi';
  timezone: string;
  browserNotifications: boolean;
  emailNotifications: boolean;
  notificationTiming: 'at_time' | '5m' | '10m' | '30m' | '1h' | '1d';
  theme: 'light' | 'dark' | 'system';
  googleCalendarConnected: boolean;
  googleCalendarEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ReminderRecurrence {
  type: RecurrenceType;
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}

export interface SharedUser {
  userId?: string;
  email: string;
  permission: SharePermission;
  accepted: boolean;
  invitedAt: string;
}

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timezone: string;
  priority: Priority;
  status: Status;
  isCompleted: boolean;
  completedAt?: string;
  category: string;
  tags: string[];
  userId: string;
  workspaceId?: string;
  attachments: ReminderAttachment[];
  recurrence: ReminderRecurrence;
  notificationSettings: {
    browser: boolean;
    email: boolean;
    timing: 'at_time' | '5m' | '10m' | '30m' | '1h' | '1d';
    notified?: boolean;
  };
  sharedWith: SharedUser[];
  shareToken?: string;
  sharePermission?: 'VIEW' | 'EDIT';
  syncedToGoogleCalendar?: boolean;
  googleEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  userId: string;
}

export interface Tag {
  _id: string;
  name: string;
  color: string;
  userId: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'REMINDER_DUE' | 'SHARED' | 'WORKSPACE' | 'SYSTEM' | 'SECURITY';
  reminderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface WorkspaceMember {
  userId?: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatar?: string;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description: string;
  type: 'TEAM' | 'FAMILY' | 'PROJECT';
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

export interface AnalyticsData {
  metrics: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    cancelled: number;
    completionRate: number;
    overdueRate: number;
    productivityScore: number;
    mostProductiveDay: string;
    mostUsedCategory: string;
  };
  weeklyTrend: { day: string; date: string; completed: number; created: number }[];
  categoryData: { name: string; count: number }[];
  priorityData: { priority: string; count: number }[];
}
