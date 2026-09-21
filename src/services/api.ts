import { User, Reminder, Category, Tag, NotificationItem, Workspace, ActivityLog, AnalyticsData } from '../types';

const TOKEN_KEY = 'remindify_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; message?: string; data?: T; errors?: string[] }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'An error occurred during API request.');
    }
    return data;
  } catch (err: any) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  register: (body: any) => request<{ user: User; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ user?: User; token?: string; tempToken?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  loginDemo: () => request<{ user: User; token: string }>('/api/auth/demo', { method: 'POST' }),
  login2FA: (tempToken: string, code: string) => request<{ user: User; token: string }>('/api/auth/login/2fa', { method: 'POST', body: JSON.stringify({ tempToken, code }) }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  updateProfile: (body: Partial<User>) => request<{ user: User }>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  generate2FA: () => request<{ secret: string; qrPlaceholder: string; backupCodes: string[]; testCode: string }>('/api/auth/2fa/generate', { method: 'POST' }),
  toggle2FA: (enabled: boolean, code: string) => request<{ user: User }>('/api/auth/2fa/toggle', { method: 'POST', body: JSON.stringify({ enabled, code }) }),
  deleteAccount: () => request('/api/auth/account', { method: 'DELETE' }),

  // Reminders
  getReminders: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ reminders: Reminder[]; total: number }>(`/api/reminders${query ? `?${query}` : ''}`);
  },
  getReminderById: (id: string) => request<{ reminder: Reminder }>(`/api/reminders/${id}`),
  createReminder: (body: Partial<Reminder>) => request<{ reminder: Reminder }>('/api/reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateReminder: (id: string, body: Partial<Reminder>) => request<{ reminder: Reminder }>(`/api/reminders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleComplete: (id: string, isCompleted?: boolean) => request<{ reminder: Reminder; nextOccurrence?: Reminder }>(`/api/reminders/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ isCompleted }) }),
  toggleCancel: (id: string) => request<{ reminder: Reminder }>(`/api/reminders/${id}/cancel`, { method: 'PATCH' }),
  batchAction: (body: { action: 'COMPLETE' | 'DELETE' | 'CANCEL'; reminderIds: string[] }) => request('/api/reminders/batch', { method: 'POST', body: JSON.stringify(body) }),
  duplicateReminder: (id: string) => request<{ reminder: Reminder }>(`/api/reminders/${id}/duplicate`, { method: 'POST' }),
  deleteReminder: (id: string) => request(`/api/reminders/${id}`, { method: 'DELETE' }),
  shareReminder: (id: string, email: string, permission: string) => request<{ sharedWith: any[] }>(`/api/reminders/${id}/share`, { method: 'POST', body: JSON.stringify({ email, permission }) }),
  revokeShare: (id: string, email: string) => request<{ sharedWith: any[] }>(`/api/reminders/${id}/share/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  generateShareLink: (id: string) => request<{ shareToken: string; shareUrl: string }>(`/api/reminders/${id}/share-link`, { method: 'POST' }),
  revokeShareLink: (id: string) => request(`/api/reminders/${id}/share-link`, { method: 'DELETE' }),
  getPublicReminder: (token: string) => request<{ reminder: Reminder }>(`/api/reminders/public/${token}`),
  syncGoogleCalendar: (id: string) => request<{ reminder: Reminder }>(`/api/reminders/${id}/sync-google`, { method: 'POST' }),

  // Categories & Tags
  getCategories: () => request<{ categories: Category[] }>('/api/categories'),
  createCategory: (body: { name: string; color?: string; icon?: string }) => request<{ category: Category }>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  getTags: () => request<{ tags: Tag[] }>('/api/tags'),
  createTag: (body: { name: string; color?: string }) => request<{ tag: Tag }>('/api/tags', { method: 'POST', body: JSON.stringify(body) }),
  deleteTag: (id: string) => request(`/api/tags/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),
  markNotificationRead: (id: string) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
  clearAllNotifications: () => request('/api/notifications', { method: 'DELETE' }),
  deleteNotification: (id: string) => request(`/api/notifications/${id}`, { method: 'DELETE' }),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: Workspace[] }>('/api/workspaces'),
  createWorkspace: (body: { name: string; description?: string; type?: string }) => request<{ workspace: Workspace }>('/api/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  inviteWorkspaceMember: (id: string, body: { email: string; name?: string; role?: string }) => request<{ workspace: Workspace }>(`/api/workspaces/${id}/invite`, { method: 'POST', body: JSON.stringify(body) }),
  removeWorkspaceMember: (id: string, email: string) => request<{ workspace: Workspace }>(`/api/workspaces/${id}/member/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  // Analytics & Activity
  getAnalytics: () => request<AnalyticsData>('/api/analytics/overview'),
  getActivityLogs: () => request<{ activities: ActivityLog[] }>('/api/export/activity'),

  // AI & Natural Language
  parseReminderWithAI: (text: string, timezone?: string) => request<{ parsed: any }>('/api/ai/parse-reminder', { method: 'POST', body: JSON.stringify({ text, timezone }) }),
};
