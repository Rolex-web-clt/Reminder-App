import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Shield, Trash2, CheckCircle2, FolderPlus, UserPlus } from 'lucide-react';
import { Workspace, Reminder } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ReminderCard } from '../reminders/ReminderCard';

interface WorkspaceViewProps {
  onOpenNewReminder: () => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onDuplicateReminder: (id: string) => void;
  onShareReminder: (reminder: Reminder) => void;
  onSyncGoogle: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  onOpenNewReminder,
  onEditReminder,
  onDeleteReminder,
  onDuplicateReminder,
  onShareReminder,
  onSyncGoogle,
  onToggleComplete,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // New workspace form
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsType, setWsType] = useState<'TEAM' | 'FAMILY' | 'PROJECT'>('TEAM');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');

  const fetchWorkspaces = async () => {
    try {
      const res = await api.getWorkspaces();
      if (res.data?.workspaces) {
        setWorkspaces(res.data.workspaces);
        if (res.data.workspaces.length > 0 && !activeWorkspace) {
          setActiveWorkspace(res.data.workspaces[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      api.getReminders({ workspaceId: activeWorkspace._id }).then(res => {
        if (res.data?.reminders) {
          setReminders(res.data.reminders);
        }
      });
    }
  }, [activeWorkspace]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;

    try {
      const res = await api.createWorkspace({
        name: wsName.trim(),
        description: wsDesc.trim(),
        type: wsType,
      });
      if (res.data?.workspace) {
        setWorkspaces([...workspaces, res.data.workspace]);
        setActiveWorkspace(res.data.workspace);
        setShowCreateModal(false);
        setWsName('');
        setWsDesc('');
        showToast('Workspace created successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create workspace', 'error');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;

    try {
      const res = await api.inviteWorkspaceMember(activeWorkspace._id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (res.data?.workspace) {
        setActiveWorkspace(res.data.workspace);
        setWorkspaces(workspaces.map(w => (w._id === res.data!.workspace._id ? res.data!.workspace : w)));
        setShowInviteModal(false);
        setInviteEmail('');
        showToast(`Invited ${inviteEmail.trim()} successfully!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to invite member', 'error');
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!activeWorkspace) return;
    try {
      const res = await api.removeWorkspaceMember(activeWorkspace._id, email);
      if (res.data?.workspace) {
        setActiveWorkspace(res.data.workspace);
        setWorkspaces(workspaces.map(w => (w._id === res.data!.workspace._id ? res.data!.workspace : w)));
        showToast('Member removed from workspace', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Team & Family Collaboration Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Share schedules, assign shared tasks, and collaborate with family or colleagues
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspace Tabs & Member Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Workspaces selector and Members */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Your Workspaces
            </span>

            {workspaces.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No workspaces created yet. Click "New Workspace" above.
              </p>
            ) : (
              <div className="space-y-1.5">
                {workspaces.map(ws => (
                  <button
                    key={ws._id}
                    onClick={() => setActiveWorkspace(ws)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between ${
                      activeWorkspace?._id === ws._id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-semibold">{ws.name}</h4>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {ws.type} • {ws.members.length} member{ws.members.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {activeWorkspace?._id === ws._id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Workspace Members */}
          {activeWorkspace && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Members ({activeWorkspace.members.length})
                </span>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeWorkspace.members.map(m => (
                  <div key={m.email} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                        {m.role}
                      </span>
                      {m.role !== 'OWNER' && (
                        <button
                          onClick={() => handleRemoveMember(m.email)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Workspace Reminders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {activeWorkspace ? `${activeWorkspace.name} Reminders` : 'Workspace Reminders'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeWorkspace?.description || 'All shared reminders for this workspace'}
              </p>
            </div>

            <button
              onClick={onOpenNewReminder}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Workspace Task</span>
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No reminders in this workspace yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Collaborate by creating tasks shared across team members.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map(r => (
                <ReminderCard
                  key={r._id}
                  reminder={r}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEditReminder}
                  onDelete={onDeleteReminder}
                  onDuplicate={onDuplicateReminder}
                  onShare={onShareReminder}
                  onSyncGoogle={onSyncGoogle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Create New Workspace
            </h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  placeholder="e.g. Engineering Sprint, Family House"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={wsDesc}
                  onChange={e => setWsDesc(e.target.value)}
                  placeholder="Optional purpose of this group"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Type
                </label>
                <select
                  value={wsType}
                  onChange={e => setWsType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TEAM">Team / Company</option>
                  <option value="FAMILY">Family / Household</option>
                  <option value="PROJECT">Project / Client</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Invite Member to {activeWorkspace?.name}
            </h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Colleague / Family Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ADMIN">Admin (Can invite and manage)</option>
                  <option value="MEMBER">Member (Can edit and complete tasks)</option>
                  <option value="VIEWER">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
