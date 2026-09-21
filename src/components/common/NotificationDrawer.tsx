import React from 'react';
import { Bell, Check, Trash2, X, Clock, AlertCircle, Users, Info } from 'lucide-react';
import { NotificationItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onSelectReminder?: (reminderId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onSelectReminder,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'REMINDER_DUE':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'SHARED':
      case 'WORKSPACE':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'SECURITY':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('notifications')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  id="notifications-mark-all-read"
                  onClick={onMarkAllRead}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t('mark_all_read')}
                </button>
              )}
              <button
                id="notifications-close-btn"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('no_notifications')}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  You are all caught up on your schedule!
                </p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  className={`p-3.5 rounded-xl border transition relative group ${
                    notif.isRead
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                          {notif.title}
                        </h4>
                        <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      {!notif.isRead && (
                        <button
                          onClick={() => onMarkRead(notif._id)}
                          title="Mark as read"
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(notif._id)}
                        title="Delete notification"
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {notif.reminderId && onSelectReminder && (
                    <button
                      onClick={() => {
                        onSelectReminder(notif.reminderId!);
                        onClose();
                      }}
                      className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline block"
                    >
                      View reminder →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
