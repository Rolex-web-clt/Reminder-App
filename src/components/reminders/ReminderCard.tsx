import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Share2,
  CalendarSync,
  Paperclip,
  Repeat,
  AlertCircle,
  Users,
} from 'lucide-react';
import { Reminder } from '../../types';

interface ReminderCardProps {
  reminder: Reminder;
  onToggleComplete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onShare: (reminder: Reminder) => void;
  onSyncGoogle: (id: string) => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onSyncGoogle,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityBadge = (priority: Reminder['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80';
      case 'HIGH':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80';
      case 'MEDIUM':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80';
      case 'LOW':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  // Format countdown / due label
  const getDueLabel = () => {
    const now = new Date();
    const target = new Date(`${reminder.date}T${reminder.time || '00:00'}:00`);

    if (reminder.isCompleted) {
      return { label: `Completed`, isOverdue: false };
    }

    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let dayText = reminder.date;
    if (reminder.date === todayStr) dayText = 'Today';
    else if (reminder.date === tomorrowStr) dayText = 'Tomorrow';

    const timeText = reminder.time ? ` at ${reminder.time}` : '';

    if (target < now && reminder.status === 'OVERDUE') {
      return { label: `Overdue (${dayText}${timeText})`, isOverdue: true };
    }

    return { label: `${dayText}${timeText}`, isOverdue: false };
  };

  const dueInfo = getDueLabel();

  return (
    <div
      id={`reminder-card-${reminder._id}`}
      className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
        reminder.isCompleted
          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75'
          : dueInfo.isOverdue
          ? 'bg-white dark:bg-slate-900 border-rose-300/80 dark:border-rose-900/50 shadow-sm shadow-rose-500/5'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox and Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            id={`reminder-toggle-${reminder._id}`}
            onClick={() => onToggleComplete(reminder._id)}
            className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
            title={reminder.isCompleted ? 'Mark as pending' : 'Mark as complete'}
          >
            {reminder.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />
            ) : (
              <Circle className="w-5 h-5 group-hover:text-indigo-600 transition" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                  reminder.priority
                )}`}
              >
                {reminder.priority}
              </span>

              {reminder.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {reminder.category}
                </span>
              )}

              {reminder.recurrence && reminder.recurrence.type !== 'NONE' && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {reminder.recurrence.type.toLowerCase()}
                </span>
              )}

              {reminder.sharedWith && reminder.sharedWith.length > 0 && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {reminder.sharedWith.length} shared
                </span>
              )}

              {reminder.syncedToGoogleCalendar && (
                <span
                  title="Synchronized with Google Calendar"
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center gap-1"
                >
                  <CalendarSync className="w-3 h-3" />
                  G-Cal
                </span>
              )}
            </div>

            <h3
              className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                reminder.isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {reminder.title}
            </h3>

            {reminder.description && (
              <p
                className={`text-xs sm:text-sm mt-1 line-clamp-2 break-words leading-relaxed ${
                  reminder.isCompleted
                    ? 'text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {reminder.description}
              </p>
            )}

            {/* Tags */}
            {reminder.tags && reminder.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {reminder.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Attachments preview */}
            {reminder.attachments && reminder.attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {reminder.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:underline px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Date & Time Footer */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/60">
              <div
                className={`flex items-center gap-1 font-medium ${
                  dueInfo.isOverdue
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {dueInfo.isOverdue ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{dueInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions Dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            id={`reminder-actions-${reminder._id}`}
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Reminder options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-30">
              <button
                onClick={() => {
                  onEdit(reminder);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit Reminder</span>
              </button>

              <button
                onClick={() => {
                  onShare(reminder);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Share with Team / Link</span>
              </button>

              <button
                onClick={() => {
                  onDuplicate(reminder._id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Duplicate Task</span>
              </button>

              <button
                onClick={() => {
                  onSyncGoogle(reminder._id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <CalendarSync className="w-3.5 h-3.5 text-slate-400" />
                <span>{reminder.syncedToGoogleCalendar ? 'Remove G-Cal Sync' : 'Sync to Google Calendar'}</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  onDelete(reminder._id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Reminder</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
