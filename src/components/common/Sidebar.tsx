import React from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  BarChart3,
  Users,
  Settings,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  overdueCount: number;
  onOpenNewReminder: () => void;
  onOpenAiModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  overdueCount,
  onOpenNewReminder,
  onOpenAiModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'reminders', label: t('reminders'), icon: ListTodo, badge: pendingCount },
    { id: 'calendar', label: t('calendar'), icon: Calendar },
    { id: 'analytics', label: t('analytics'), icon: BarChart3 },
    { id: 'workspaces', label: t('workspaces'), icon: Users },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            id="sidebar-new-reminder-btn"
            onClick={() => {
              onOpenNewReminder();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm shadow-indigo-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('quick_add')}</span>
          </button>

          <button
            id="sidebar-ai-assistant-btn"
            onClick={() => {
              onOpenAiModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-950/40 dark:to-indigo-950/40 hover:from-violet-600/20 hover:to-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-medium rounded-xl text-xs border border-indigo-200/60 dark:border-indigo-800/50 transition group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-12 transition-transform" />
            <span>{t('ai_assistant')}</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Summary Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Priority Overview</span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-rose-500 font-bold">
              <AlertCircle className="w-3 h-3" />
              {overdueCount} overdue
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Pending</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">{pendingCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Overdue</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">{overdueCount}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-2xl z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
