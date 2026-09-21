import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Reminder } from '../../types';

interface CalendarViewProps {
  reminders: Reminder[];
  onSelectDate: (dateStr: string) => void;
  onOpenNewReminder: (defaultDate?: string) => void;
  onEditReminder: (reminder: Reminder) => void;
}

type CalendarMode = 'MONTH' | 'WEEK' | 'DAY' | 'AGENDA';

export const CalendarView: React.FC<CalendarViewProps> = ({
  reminders,
  onSelectDate,
  onOpenNewReminder,
  onEditReminder,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<CalendarMode>('MONTH');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrev = () => {
    if (mode === 'MONTH') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (mode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (mode === 'MONTH') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (mode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthCells: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNumber: day, dateStr, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNumber: day, dateStr, isCurrentMonth: true });
  }

  // Next month leading days (fill up 35 or 42 grid cells)
  const remaining = 42 - monthCells.length;
  for (let day = 1; day <= (remaining >= 7 ? remaining - 7 : remaining); day++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNumber: day, dateStr, isCurrentMonth: false });
  }

  // Group reminders by date
  const remindersByDate = reminders.reduce<Record<string, Reminder[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const todayStr = new Date().toISOString().split('T')[0];

  const getPriorityColor = (priority: Reminder['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500 text-white';
      case 'HIGH':
        return 'bg-amber-500 text-white';
      case 'MEDIUM':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  // Google Calendar quick export link
  const makeGoogleCalendarUrl = (reminder: Reminder) => {
    const title = encodeURIComponent(reminder.title);
    const details = encodeURIComponent(reminder.description || '');
    const cleanDate = reminder.date.replace(/-/g, '');
    const cleanTime = (reminder.time || '09:00').replace(/:/g, '') + '00';
    const dates = `${cleanDate}T${cleanTime}/${cleanDate}T${cleanTime}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {(['MONTH', 'WEEK', 'AGENDA'] as CalendarMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-lg transition ${
                  mode === m
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenNewReminder(currentDate.toISOString().split('T')[0])}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {mode === 'MONTH' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {monthCells.map((cell, idx) => {
              const dayReminders = remindersByDate[cell.dateStr] || [];
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 transition group flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
                      : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onOpenNewReminder(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Add task on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Reminders List */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayReminders.slice(0, 3).map(rem => (
                      <div
                        key={rem._id}
                        onClick={e => {
                          e.stopPropagation();
                          onEditReminder(rem);
                        }}
                        className={`text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer transition flex items-center justify-between ${
                          rem.isCompleted
                            ? 'line-through bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : `${getPriorityColor(rem.priority)} shadow-xs`
                        }`}
                        title={`${rem.time} - ${rem.title}`}
                      >
                        <span className="truncate">{rem.title}</span>
                        <span className="text-[9px] opacity-80 shrink-0 ml-1">{rem.time}</span>
                      </div>
                    ))}
                    {dayReminders.length > 3 && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold pl-1 block">
                        +{dayReminders.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {(mode === 'AGENDA' || mode === 'WEEK') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Scheduled Reminders Agenda
          </h3>

          {reminders.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">
              No tasks scheduled.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(remindersByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, items]) => (
                  <div key={dateKey} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {dateKey === todayStr && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pl-6">
                      {items.map(item => (
                        <div
                          key={item._id}
                          onClick={() => onEditReminder(item)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {item.time}
                            </span>
                            <span
                              className={`text-sm font-semibold ${
                                item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>

                            <a
                              href={makeGoogleCalendarUrl(item)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="Export to Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
