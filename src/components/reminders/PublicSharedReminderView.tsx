import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Tag, CheckCircle2, Shield, ArrowLeft, Download } from 'lucide-react';
import { Reminder } from '../../types';
import { api } from '../../services/api';

interface PublicSharedReminderViewProps {
  token: string;
  onBack: () => void;
}

export const PublicSharedReminderView: React.FC<PublicSharedReminderViewProps> = ({
  token,
  onBack,
}) => {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await api.getPublicReminder(token);
        if (res.data?.reminder) {
          setReminder(res.data.reminder);
        } else {
          setError('Shared reminder not found or link expired.');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load shared reminder.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchShared();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !reminder) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <Shield className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Link Unavailable
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {error || 'This shared reminder could not be found or has been revoked.'}
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
              R
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Shared Reminder
            </span>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              reminder.isCompleted
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {reminder.isCompleted ? 'Completed' : 'Pending'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {reminder.title}
          </h1>
          {reminder.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">
              {reminder.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Due Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{reminder.date}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Time</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{reminder.time}</span>
            </div>
          </div>
        </div>

        {reminder.tags && reminder.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reminder.tags.map(t => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Remindify
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Remindify SaaS Platform
          </span>
        </div>
      </div>
    </div>
  );
};
