import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  Bell,
  Globe,
  Lock,
  Key,
  CalendarSync,
  Trash2,
  Download,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { ActivityLog } from '../../types';
import { Language } from '../../i18n/translations';

export const SettingsView: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/New_York');

  // Notifications
  const [browserNotifications, setBrowserNotifications] = useState(user?.browserNotifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [notificationTiming, setNotificationTiming] = useState(user?.notificationTiming || 'at_time');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 2FA state
  const [twoFactorData, setTwoFactorData] = useState<{ secret: string; backupCodes: string[]; testCode: string } | null>(null);
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState('');
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null);

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Feedback & Banners
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (statusBanner) {
      const timer = setTimeout(() => setStatusBanner(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusBanner]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || '');
      setTimezone(user.timezone || 'America/New_York');
      setBrowserNotifications(user.browserNotifications);
      setEmailNotifications(user.emailNotifications);
      setNotificationTiming(user.notificationTiming);
    }
  }, [user]);

  useEffect(() => {
    api.getActivityLogs().then(res => {
      if (res.data?.activities) {
        setActivityLogs(res.data.activities);
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        name,
        phone,
        profileImage,
        timezone,
        browserNotifications,
        emailNotifications,
        notificationTiming: notificationTiming as any,
      });
      if (res.data?.user) {
        updateUser(res.data.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setStatusBanner({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestBrowserNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setStatusBanner({ text: 'Browser notifications enabled! You will receive reminders even in background.', type: 'success' });
        } else {
          setStatusBanner({ text: `Notification permission status: ${perm}`, type: 'info' });
        }
      } catch (e: any) {
        setStatusBanner({ text: 'Could not request notification permission in this environment.', type: 'info' });
      }
    } else {
      setStatusBanner({ text: 'Browser notifications are not supported in this environment.', type: 'info' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPassMsg({ text: 'Password successfully changed!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMsg({ text: err.message || 'Password update failed', isError: true });
    }
  };

  const handleGenerate2FA = async () => {
    try {
      const res = await api.generate2FA();
      if (res.data) {
        setTwoFactorData(res.data);
      }
    } catch (err: any) {
      setStatusBanner({ text: err.message || 'Failed to generate 2FA', type: 'error' });
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    try {
      const res = await api.toggle2FA(enabled, twoFactorCodeInput || '123456');
      if (res.data?.user) {
        updateUser(res.data.user);
        setTwoFactorData(null);
        setTwoFactorCodeInput('');
        setTwoFactorMsg(`2FA has been ${enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (err: any) {
      setTwoFactorMsg(err.message || 'Verification failed. Use 123456 as confirmation code.');
    }
  };

  const executeDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      logout();
    } catch (err: any) {
      setStatusBanner({ text: err.message || 'Failed to delete account', type: 'error' });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Account & System Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal profile, notification preferences, security protocols, and backups
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          Settings successfully saved!
        </div>
      )}

      {statusBanner && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            statusBanner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          {statusBanner.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Profile & Personal Info */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            User Profile
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address (Permanent ID)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phone Number (SMS Alert ready)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={profileImage}
                onChange={e => setProfileImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                {t('timezone')}
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Asia/Kathmandu">Asia/Kathmandu (Nepal Time +5:45)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="UTC">UTC Universal Time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Default Notification Timing
              </label>
              <select
                value={notificationTiming}
                onChange={e => setNotificationTiming(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="at_time">At time of reminder</option>
                <option value="5m">5 minutes before</option>
                <option value="10m">10 minutes before</option>
                <option value="30m">30 minutes before</option>
                <option value="1h">1 hour before</option>
                <option value="1d">1 day before</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-xs transition"
            >
              {isSaving ? 'Saving...' : t('save_changes')}
            </button>
          </div>
        </form>
      </section>

      {/* Notifications & Browser Permissions */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Notifications & Browser Alerts
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Browser Desktop & Mobile Push Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Receive browser alert popups even when the app is minimized or in background
              </p>
            </div>
            <button
              onClick={handleRequestBrowserNotificationPermission}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Request Browser Permission
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Email Dispatch Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Send daily digest and urgent reminder alerts to {user?.email}
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={e => setEmailNotifications(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Security, Password & 2FA */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Security & Authentication
          </h3>
        </div>

        {/* Change Password */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-slate-400" />
            Change Account Password
          </h4>

          {passMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold mb-3 ${
                passMsg.isError
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {passMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current Password"
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New Password (min 6 characters)"
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="col-span-full sm:col-span-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:opacity-90 transition"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* 2FA */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-slate-400" />
                {t('two_factor')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Require a 6-digit TOTP verification code on each login
              </p>
            </div>

            {user?.twoFactorEnabled ? (
              <button
                onClick={() => handleToggle2FA(false)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 transition"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleGenerate2FA}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl hover:bg-indigo-100 transition"
              >
                Enable 2FA
              </button>
            )}
          </div>

          {twoFactorMsg && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2">
              {twoFactorMsg}
            </p>
          )}

          {twoFactorData && !user?.twoFactorEnabled && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Test code: <strong className="text-indigo-600 font-mono">123456</strong>
              </p>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Backup Emergency Recovery Codes:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-slate-800 dark:text-slate-200">
                  {twoFactorData.backupCodes.map((code, idx) => (
                    <span key={idx} className="p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-center">
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCodeInput}
                  onChange={e => setTwoFactorCodeInput(e.target.value)}
                  placeholder="Enter 123456 to confirm"
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
                <button
                  onClick={() => handleToggle2FA(true)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                >
                  Confirm & Enable
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log preview */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Recent Security Activity Logs
          </span>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {activityLogs.slice(0, 5).map(log => (
              <div key={log._id} className="py-1.5 flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {log.action}: {log.details || log.resource}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Danger Zone: Delete Account */}
      <section className="bg-rose-50/50 dark:bg-rose-950/20 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Delete Account Permanently
          </h4>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            Permanently delete your profile, workspaces, attachments, and all reminder records.
          </p>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition shadow-xs"
        >
          Delete Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action is irreversible and will immediately delete all your reminders and data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAccount}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
