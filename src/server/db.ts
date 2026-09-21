import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  password: string; // hashed
  profileImage?: string;
  phone?: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
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
  type: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  interval?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  endDate?: string;
  count?: number;
}

export interface SharedUser {
  userId?: string;
  email: string;
  permission: 'VIEW' | 'EDIT' | 'COMPLETE' | 'ADMIN';
  accepted: boolean;
  invitedAt: string;
}

export interface ReminderDoc {
  _id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  timezone: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
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

export interface CategoryDoc {
  _id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
}

export interface TagDoc {
  _id: string;
  name: string;
  color: string;
  userId: string;
}

export interface NotificationDoc {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'REMINDER_DUE' | 'SHARED' | 'WORKSPACE' | 'SYSTEM' | 'SECURITY';
  reminderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface WorkspaceDoc {
  _id: string;
  name: string;
  description: string;
  type: 'TEAM' | 'FAMILY' | 'PROJECT';
  ownerId: string;
  members: {
    userId?: string;
    name: string;
    email: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    avatar?: string;
    joinedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDoc {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: UserDoc[];
  reminders: ReminderDoc[];
  categories: CategoryDoc[];
  tags: TagDoc[];
  notifications: NotificationDoc[];
  workspaces: WorkspaceDoc[];
  activities: ActivityDoc[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

class InMemoryDb {
  private data: DatabaseSchema = {
    users: [],
    reminders: [],
    categories: [],
    tags: [],
    notifications: [],
    workspaces: [],
    activities: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (e) {
      console.warn('Could not load local DB file, starting fresh:', e);
      this.seedInitialData();
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database file:', e);
    }
  }

  public get users() { return this.data.users; }
  public set users(val: UserDoc[]) { this.data.users = val; }
  public get reminders() { return this.data.reminders; }
  public set reminders(val: ReminderDoc[]) { this.data.reminders = val; }
  public get categories() { return this.data.categories; }
  public set categories(val: CategoryDoc[]) { this.data.categories = val; }
  public get tags() { return this.data.tags; }
  public set tags(val: TagDoc[]) { this.data.tags = val; }
  public get notifications() { return this.data.notifications; }
  public set notifications(val: NotificationDoc[]) { this.data.notifications = val; }
  public get workspaces() { return this.data.workspaces; }
  public set workspaces(val: WorkspaceDoc[]) { this.data.workspaces = val; }
  public get activities() { return this.data.activities; }
  public set activities(val: ActivityDoc[]) { this.data.activities = val; }

  private seedInitialData() {
    // Default categories
    const defaultCategories: Omit<CategoryDoc, '_id' | 'createdAt'>[] = [
      { name: 'Work', color: '#4f46e5', icon: 'Briefcase', isDefault: true, userId: 'system' },
      { name: 'Personal', color: '#06b6d4', icon: 'User', isDefault: true, userId: 'system' },
      { name: 'Study', color: '#8b5cf6', icon: 'GraduationCap', isDefault: true, userId: 'system' },
      { name: 'Health', color: '#10b981', icon: 'HeartPulse', isDefault: true, userId: 'system' },
      { name: 'Finance', color: '#f59e0b', icon: 'DollarSign', isDefault: true, userId: 'system' },
      { name: 'Meeting', color: '#ec4899', icon: 'Calendar', isDefault: true, userId: 'system' },
      { name: 'Shopping', color: '#f97316', icon: 'ShoppingCart', isDefault: true, userId: 'system' },
      { name: 'Travel', color: '#14b8a6', icon: 'Plane', isDefault: true, userId: 'system' },
      { name: 'Other', color: '#64748b', icon: 'Folder', isDefault: true, userId: 'system' },
    ];

    this.data.categories = defaultCategories.map(c => ({
      ...c,
      _id: generateId(),
      createdAt: new Date().toISOString(),
    }));

    // Seed some common tags
    const defaultTags = ['important', 'urgent', 'study', 'work', 'personal', 'mern', 'health'];
    const colors = ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6', '#10b981', '#6366f1', '#ec4899'];
    this.data.tags = defaultTags.map((name, i) => ({
      _id: generateId(),
      name,
      color: colors[i % colors.length],
      userId: 'system',
    }));
  }

  public logActivity(userId: string, action: string, resource: string, details?: string, resourceId?: string) {
    const act: ActivityDoc = {
      _id: generateId(),
      userId,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.activities.unshift(act);
    if (this.data.activities.length > 500) {
      this.data.activities = this.data.activities.slice(0, 500);
    }
    this.save();
  }

  public addNotification(userId: string, title: string, message: string, type: NotificationDoc['type'], reminderId?: string) {
    const notif: NotificationDoc = {
      _id: generateId(),
      userId,
      title,
      message,
      type,
      reminderId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }
}

export const db = new InMemoryDb();
