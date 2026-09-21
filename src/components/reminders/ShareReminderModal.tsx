import React, { useState } from 'react';
import { X, Share2, Mail, Copy, Check, Trash2, Link, Shield, Globe } from 'lucide-react';
import { Reminder, SharePermission } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface ShareReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onUpdateReminder: (updated: Reminder) => void;
}

export const ShareReminderModal: React.FC<ShareReminderModalProps> = ({
  isOpen,
  onClose,
  reminder,
  onUpdateReminder,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('VIEW');
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !reminder) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      const res = await api.shareReminder(reminder._id, email.trim(), permission);
      if (res.data?.sharedWith) {
        onUpdateReminder({
          ...reminder,
          sharedWith: res.data.sharedWith,
        });
        setEmail('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to share reminder', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async (targetEmail: string) => {
    try {
      const res = await api.revokeShare(reminder._id, targetEmail);
      if (res.data?.sharedWith) {
        onUpdateReminder({
          ...reminder,
          sharedWith: res.data.sharedWith,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke access', 'error');
    }
  };

  const handleGenerateLink = async () => {
    try {
      const res = await api.generateShareLink(reminder._id);
      if (res.data?.shareToken) {
        onUpdateReminder({
          ...reminder,
          shareToken: res.data.shareToken,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate share link', 'error');
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/share/${reminder.shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    showToast('Share link copied to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRevokeLink = async () => {
    try {
      await api.revokeShareLink(reminder._id);
      onUpdateReminder({
        ...reminder,
        shareToken: undefined,
      });
      showToast('Public share link revoked', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke share link', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('share_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                "{reminder.title}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invite form */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {t('invite_collaborator')}
            </h4>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={permission}
                onChange={e => setPermission(e.target.value as SharePermission)}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VIEW">Can View</option>
                <option value="EDIT">Can Edit</option>
                <option value="COMPLETE">Can Complete</option>
                <option value="ADMIN">Admin</option>
              </select>

              <button
                type="submit"
                disabled={isSharing || !email.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm transition"
              >
                Invite
              </button>
            </form>
          </div>

          {/* Collaborator List */}
          {reminder.sharedWith && reminder.sharedWith.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Collaborators ({reminder.sharedWith.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {reminder.sharedWith.map(s => (
                  <div key={s.email} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-800/50 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                        {s.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{s.email}</p>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                          {s.permission}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(s.email)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shareable Link Generator */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('generate_link')}
                </span>
              </div>

              {reminder.shareToken ? (
                <button
                  onClick={handleRevokeLink}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Revoke Link
                </button>
              ) : (
                <button
                  onClick={handleGenerateLink}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Create Public Link
                </button>
              )}
            </div>

            {reminder.shareToken && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <input
                  readOnly
                  type="text"
                  value={`${window.location.origin}/share/${reminder.shareToken}`}
                  className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? t('link_copied') : t('copy_link')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
