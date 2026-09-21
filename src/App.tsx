import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';
import {
  ThemeProvider,
  useTheme,
} from './context/ThemeContext';
import {
  LanguageProvider,
  useLanguage,
} from './context/LanguageContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { FilterBar } from './components/reminders/FilterBar';
import { ReminderCard } from './components/reminders/ReminderCard';
import { ReminderModal } from './components/reminders/ReminderModal';
import { AiReminderModal } from './components/reminders/AiReminderModal';
import { ShareReminderModal } from './components/reminders/ShareReminderModal';
import { CalendarView } from './components/calendar/CalendarView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { WorkspaceView } from './components/workspaces/WorkspaceView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { QuickAddBar } from './components/dashboard/QuickAddBar';
import { PublicSharedReminderView } from './components/reminders/PublicSharedReminderView';
import { api } from './services/api';
import { Reminder, Category, Tag, NotificationItem, Priority } from './types';
import { playSuccessChime, playNotificationChime } from './utils/audio';
import {
  CheckSquare,
  Square,
  Trash2,
  CheckCircle,
  Inbox,
  Filter,
  Sparkles,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ListTodo,
} from 'lucide-react';

export function MainLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Navigation view: 'dashboard' | 'calendar' | 'workspaces' | 'analytics' | 'settings'
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sharedToken, setSharedToken] = useState<string | null>(null);

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('date_asc');

  // Selected for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Currently editing reminder
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [sharingReminder, setSharingReminder] = useState<Reminder | null>(null);
  const [defaultModalDate, setDefaultModalDate] = useState<string | undefined>(undefined);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // URL Hash router check (e.g. #share/token)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share/')) {
        const token = hash.replace('#share/', '');
        setSharedToken(token);
      } else {
        setSharedToken(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [remRes, catRes, tagRes, notifRes] = await Promise.all([
        api.getReminders(),
        api.getCategories(),
        api.getTags(),
        api.getNotifications(),
      ]);

      if (remRes.data?.reminders) {
        setReminders(remRes.data.reminders);
      }
      if (catRes.data?.categories) {
        setCategories(catRes.data.categories);
      }
      if (tagRes.data?.tags) {
        setTags(tagRes.data.tags);
      }
      if (notifRes.data) {
        setNotifications(notifRes.data.notifications || []);
        setUnreadCount(notifRes.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load initial SaaS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, user]);

  // Periodic poll for reminders and notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const notifRes = await api.getNotifications();
        if (notifRes.data) {
          const newUnread = notifRes.data.unreadCount || 0;
          if (newUnread > unreadCount) {
            playNotificationChime();
          }
          setNotifications(notifRes.data.notifications || []);
          setUnreadCount(newUnread);
        }
      } catch (e) {
        // quiet fallback
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [unreadCount]);

  // Handler: Toggle complete
  const handleToggleComplete = async (id: string) => {
    const target = reminders.find(r => r._id === id);
    const nextState = !target?.isCompleted;

    if (nextState) {
      playSuccessChime();
    }

    // Optimistic UI
    setReminders(prev =>
      prev.map(r => (r._id === id ? { ...r, isCompleted: nextState } : r))
    );

    try {
      await api.toggleComplete(id, nextState);
      showToast(nextState ? 'Reminder marked as completed!' : 'Reminder reopened');
    } catch (err) {
      // Revert on error
      setReminders(prev =>
        prev.map(r => (r._id === id ? { ...r, isCompleted: !nextState } : r))
      );
      showToast('Failed to update status');
    }
  };

  // Handler: Save reminder (Create or Edit)
  const handleSaveReminder = async (data: Partial<Reminder>) => {
    if (editingReminder) {
      const res = await api.updateReminder(editingReminder._id, data);
      if (res.data?.reminder) {
        setReminders(prev =>
          prev.map(r => (r._id === editingReminder._id ? res.data!.reminder : r))
        );
        showToast('Reminder updated successfully');
      }
    } else {
      const res = await api.createReminder(data);
      if (res.data?.reminder) {
        setReminders(prev => [res.data!.reminder, ...prev]);
        showToast('Reminder created successfully');
      }
    }
  };

  // Handler: Quick add single-line
  const handleQuickAdd = async (title: string, priority: Priority, category: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const res = await api.createReminder({
      title,
      date: todayStr,
      time: '09:00',
      priority,
      category,
    });
    if (res.data?.reminder) {
      setReminders(prev => [res.data!.reminder, ...prev]);
      showToast('Task added');
    }
  };

  // Handler: Delete reminder
  const handleDeleteReminder = async (id: string) => {
    const prev = [...reminders];
    setReminders(reminders.filter(r => r._id !== id));
    try {
      await api.deleteReminder(id);
      showToast('Reminder deleted');
    } catch (err) {
      setReminders(prev);
      showToast('Failed to delete reminder');
    }
  };

  // Handler: Duplicate reminder
  const handleDuplicateReminder = async (id: string) => {
    try {
      const res = await api.duplicateReminder(id);
      if (res.data?.reminder) {
        setReminders(prev => [res.data!.reminder, ...prev]);
        showToast('Reminder duplicated');
      }
    } catch (err) {
      showToast('Failed to duplicate');
    }
  };

  // Handler: Sync to Google Calendar
  const handleSyncGoogle = async (id: string) => {
    try {
      const res = await api.syncGoogleCalendar(id);
      if (res.data?.reminder) {
        setReminders(prev =>
          prev.map(r => (r._id === id ? res.data!.reminder : r))
        );
        showToast('Synced to Google Calendar!');
      }
    } catch (err) {
      showToast('Google sync failed');
    }
  };

  // Handler: Load sample reminders if empty
  const handleLoadSamples = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const samples = [
        {
          title: 'Daily Team Standup Meeting',
          description: 'Sync with product and engineering teams on sprint deliverables.',
          date: todayStr,
          time: '10:00',
          priority: 'MEDIUM' as Priority,
          category: 'Meeting',
          tags: ['work', 'standup'],
        },
        {
          title: 'Review MERN Architecture & API Endpoints',
          description: 'Verify JWT tokens, Express rate limit, and MongoDB collection models.',
          date: todayStr,
          time: '14:00',
          priority: 'HIGH' as Priority,
          category: 'Work',
          tags: ['mern', 'architecture', 'important'],
        },
        {
          title: 'Submit Quarterly Financial Report',
          description: 'Collate monthly receipts, tax deductions, and invoices.',
          date: tomorrowStr,
          time: '17:30',
          priority: 'URGENT' as Priority,
          category: 'Finance',
          tags: ['urgent', 'tax', 'finance'],
        },
        {
          title: 'Evening Health & Fitness Routine',
          description: '45-minute cardio workout and hydration tracking.',
          date: todayStr,
          time: '18:30',
          priority: 'LOW' as Priority,
          category: 'Health',
          tags: ['health', 'fitness'],
        },
      ];

      for (const item of samples) {
        await api.createReminder(item);
      }
      await fetchData();
      showToast('Sample reminders loaded');
    } catch (e) {
      showToast('Could not load samples');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Create category inline
  const handleCreateCategory = async (name: string): Promise<Category> => {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const res = await api.createCategory({ name, color: randomColor });
    if (res.data?.category) {
      setCategories(prev => [...prev, res.data!.category]);
      return res.data.category;
    }
    throw new Error('Failed to create category');
  };

  // Batch actions
  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredIds: string[]) => {
    if (selectedIds.length === filteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  const handleBatchComplete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.batchAction({ action: 'COMPLETE', reminderIds: selectedIds });
      setReminders(prev =>
        prev.map(r => (selectedIds.includes(r._id) ? { ...r, isCompleted: true } : r))
      );
      playSuccessChime();
      showToast(`${selectedIds.length} reminders completed`);
      setSelectedIds([]);
    } catch (err) {
      showToast('Batch complete failed');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const count = selectedIds.length;
      await api.batchAction({ action: 'DELETE', reminderIds: selectedIds });
      setReminders(prev => prev.filter(r => !selectedIds.includes(r._id)));
      showToast(`${count} reminders deleted`);
      setSelectedIds([]);
    } catch (err) {
      showToast('Batch delete failed');
    }
  };

  // Filtered Reminders Memo
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchCat = r.category?.toLowerCase().includes(q);
        const matchTags = r.tags?.some(tag => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCat && !matchTags) return false;
      }

      // Status
      if (selectedStatus === 'pending' && r.isCompleted) return false;
      if (selectedStatus === 'completed' && !r.isCompleted) return false;
      if (selectedStatus === 'overdue' && (r.isCompleted || r.date >= todayStr)) return false;

      // Priority
      if (selectedPriority !== 'all' && r.priority.toLowerCase() !== selectedPriority.toLowerCase()) {
        return false;
      }

      // Category
      if (selectedCategory !== 'all' && r.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (selectedSort === 'date_asc') return a.date.localeCompare(b.date);
      if (selectedSort === 'date_desc') return b.date.localeCompare(a.date);
      if (selectedSort === 'title_asc') return a.title.localeCompare(b.title);
      if (selectedSort === 'created_desc') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (selectedSort === 'priority_desc') {
        const order: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      return 0;
    });
  }, [reminders, searchQuery, selectedStatus, selectedPriority, selectedCategory, selectedSort, todayStr]);

  // Pending & Overdue counts
  const pendingCount = useMemo(() => reminders.filter(r => !r.isCompleted).length, [reminders]);
  const overdueCount = useMemo(
    () => reminders.filter(r => !r.isCompleted && r.date < todayStr).length,
    [reminders, todayStr]
  );

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedPriority !== 'all' ||
    selectedStatus !== 'all' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
    setSearchQuery('');
  };

  // Shared token view
  if (sharedToken) {
    return (
      <PublicSharedReminderView
        token={sharedToken}
        onBack={() => {
          window.location.hash = '';
          setSharedToken(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline banner */}
      <OfflineIndicator />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={currentView}
        onSelectTab={setCurrentView}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        onOpenNewReminder={() => {
          setEditingReminder(null);
          setDefaultModalDate(undefined);
          setIsReminderModalOpen(true);
        }}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onOpenNewReminder={() => {
            setEditingReminder(null);
            setDefaultModalDate(undefined);
            setIsReminderModalOpen(true);
          }}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          unreadCount={unreadCount}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          onNavigate={setCurrentView}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* DASHBOARD OR REMINDERS VIEW */}
          {(currentView === 'dashboard' || currentView === 'reminders') && (
            <div className="space-y-6">
              {/* If Dashboard view: show welcoming stats summary cards */}
              {currentView === 'dashboard' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Here is an overview of your scheduled tasks and productivity metrics.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingReminder(null);
                          setDefaultModalDate(undefined);
                          setIsReminderModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Reminder</span>
                      </button>
                      <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI Assistant</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <button
                      onClick={() => {
                        setSelectedStatus('all');
                        setSelectedCategory('all');
                        setSelectedPriority('all');
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                        selectedStatus === 'all'
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tasks</span>
                        <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {reminders.length}
                      </div>
                      <span className="text-[11px] text-slate-400">All registered reminders</span>
                    </button>

                    <button
                      onClick={() => setSelectedStatus('pending')}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                        selectedStatus === 'pending'
                          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending</span>
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {pendingCount}
                      </div>
                      <span className="text-[11px] text-slate-400">Upcoming tasks</span>
                    </button>

                    <button
                      onClick={() => setSelectedStatus('completed')}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                        selectedStatus === 'completed'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Completed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {reminders.filter(r => r.isCompleted).length}
                      </div>
                      <span className="text-[11px] text-slate-400">Finished tasks</span>
                    </button>

                    <button
                      onClick={() => setSelectedStatus('overdue')}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                        selectedStatus === 'overdue'
                          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Overdue</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {overdueCount}
                      </div>
                      <span className="text-[11px] text-slate-400">Requires attention</span>
                    </button>
                  </div>
                </div>
              )}

              {/* If Reminders view: show dedicated Reminders header & quick status tabs */}
              {currentView === 'reminders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                        <ListTodo className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        All Reminders & Tasks
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage, filter, search, and schedule your full list of reminders.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingReminder(null);
                          setDefaultModalDate(undefined);
                          setIsReminderModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Reminder</span>
                      </button>
                      <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI Assistant</span>
                      </button>
                    </div>
                  </div>

                  {/* Fast Status Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: 'All Tasks', count: reminders.length },
                      { id: 'pending', label: 'Pending', count: pendingCount },
                      { id: 'completed', label: 'Completed', count: reminders.filter(r => r.isCompleted).length },
                      { id: 'overdue', label: 'Overdue', count: overdueCount },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedStatus(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                          selectedStatus === tab.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            selectedStatus === tab.id
                              ? 'bg-indigo-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Add Input Bar */}
              <QuickAddBar
                onQuickAdd={handleQuickAdd}
                onOpenFullModal={() => {
                  setEditingReminder(null);
                  setDefaultModalDate(undefined);
                  setIsReminderModalOpen(true);
                }}
                onOpenAiModal={() => setIsAiModalOpen(true)}
                categories={categories}
              />

              {/* Filter, Status & Sort Bar */}
              <FilterBar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedPriority={selectedPriority}
                onSelectPriority={setSelectedPriority}
                selectedStatus={selectedStatus}
                onSelectStatus={setSelectedStatus}
                selectedSort={selectedSort}
                onSelectSort={setSelectedSort}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Batch Actions Ribbon (when items selected) */}
              {selectedIds.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200">
                      {selectedIds.length} tasks selected
                    </span>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchComplete}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Complete
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Select All Toggle Bar */}
              {filteredReminders.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <button
                    onClick={() => handleSelectAll(filteredReminders.map(r => r._id))}
                    className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer transition"
                  >
                    {selectedIds.length === filteredReminders.length && filteredReminders.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select all ({filteredReminders.length})</span>
                  </button>

                  <span>Showing {filteredReminders.length} reminder{filteredReminders.length === 1 ? '' : 's'}</span>
                </div>
              )}

              {/* Reminders List or Empty State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="p-12 sm:p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No reminders found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'No tasks matched your active filter settings. Try resetting your search or filters.'
                      : 'You have no scheduled reminders in this list. Create one or load sample data to explore!'}
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    {hasActiveFilters ? (
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition"
                      >
                        Reset Filters
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingReminder(null);
                            setIsReminderModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition"
                        >
                          Create Reminder
                        </button>
                        <button
                          onClick={handleLoadSamples}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Load Sample Reminders</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReminders.map(reminder => (
                    <div key={reminder._id} className="flex items-start gap-2 group">
                      <button
                        onClick={() => handleToggleSelectId(reminder._id)}
                        className="mt-4 p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        title="Select for batch action"
                      >
                        {selectedIds.includes(reminder._id) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <ReminderCard
                          reminder={reminder}
                          onToggleComplete={handleToggleComplete}
                          onEdit={rem => {
                            setEditingReminder(rem);
                            setIsReminderModalOpen(true);
                          }}
                          onDelete={handleDeleteReminder}
                          onDuplicate={handleDuplicateReminder}
                          onShare={rem => {
                            setSharingReminder(rem);
                            setIsShareModalOpen(true);
                          }}
                          onSyncGoogle={handleSyncGoogle}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALENDAR VIEW */}
          {currentView === 'calendar' && (
            <CalendarView
              reminders={reminders}
              onSelectDate={dateStr => {
                setDefaultModalDate(dateStr);
                setEditingReminder(null);
                setIsReminderModalOpen(true);
              }}
              onOpenNewReminder={dateStr => {
                setDefaultModalDate(dateStr);
                setEditingReminder(null);
                setIsReminderModalOpen(true);
              }}
              onEditReminder={rem => {
                setEditingReminder(rem);
                setIsReminderModalOpen(true);
              }}
            />
          )}

          {/* WORKSPACES & COLLABORATION VIEW */}
          {currentView === 'workspaces' && (
            <WorkspaceView
              onOpenNewReminder={() => {
                setEditingReminder(null);
                setIsReminderModalOpen(true);
              }}
              onEditReminder={rem => {
                setEditingReminder(rem);
                setIsReminderModalOpen(true);
              }}
              onDeleteReminder={handleDeleteReminder}
              onDuplicateReminder={handleDuplicateReminder}
              onShareReminder={rem => {
                setSharingReminder(rem);
                setIsShareModalOpen(true);
              }}
              onSyncGoogle={handleSyncGoogle}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {/* ANALYTICS & INSIGHTS VIEW */}
          {currentView === 'analytics' && <AnalyticsView />}

          {/* SETTINGS VIEW */}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Create/Edit Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
        editingReminder={editingReminder}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        defaultDate={defaultModalDate}
      />

      {/* 2. AI Voice & Natural Language Modal */}
      <AiReminderModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onConfirmSchedule={handleSaveReminder}
        onOpenEditModal={prefill => {
          setEditingReminder(prefill as Reminder);
          setIsReminderModalOpen(true);
        }}
      />

      {/* 3. Share & Collaborate Modal */}
      <ShareReminderModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSharingReminder(null);
        }}
        reminder={sharingReminder}
        onUpdateReminder={updated => {
          setReminders(prev => prev.map(r => (r._id === updated._id ? updated : r)));
          setSharingReminder(updated);
        }}
      />

      {/* 4. Auth & 2FA Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 5. Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={async (id: string) => {
          await api.markNotificationRead(id);
          setNotifications(prev =>
            prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }}
        onMarkAllRead={async () => {
          await api.markAllNotificationsRead();
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
        }}
        onDelete={async (id: string) => {
          await api.deleteNotification(id);
          setNotifications(prev => prev.filter(n => n._id !== id));
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <MainLayout />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
