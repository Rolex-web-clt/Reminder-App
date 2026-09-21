import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, generateId, ReminderDoc } from '../db';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Helper to check if reminder is overdue
function updateReminderStatus(reminder: ReminderDoc): ReminderDoc {
  if (reminder.isCompleted) {
    reminder.status = 'COMPLETED';
    return reminder;
  }
  if (reminder.status === 'CANCELLED') {
    return reminder;
  }
  const now = new Date();
  const reminderDateTime = new Date(`${reminder.date}T${reminder.time || '00:00'}:00`);
  if (!isNaN(reminderDateTime.getTime()) && reminderDateTime < now) {
    reminder.status = 'OVERDUE';
  } else {
    reminder.status = 'PENDING';
  }
  return reminder;
}

// Compute next recurring date
function calculateNextOccurrence(dateStr: string, recurrence: ReminderDoc['recurrence']): string | null {
  if (!recurrence || recurrence.type === 'NONE') return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return null;

  switch (recurrence.type) {
    case 'DAILY':
      d.setDate(d.getDate() + (recurrence.interval || 1));
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7 * (recurrence.interval || 1));
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + (recurrence.interval || 1));
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + (recurrence.interval || 1));
      break;
    default:
      d.setDate(d.getDate() + 1);
  }

  if (recurrence.endDate && d > new Date(recurrence.endDate)) {
    return null;
  }
  return d.toISOString().split('T')[0];
}

// GET /api/reminders
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      search,
      category,
      tag,
      priority,
      status,
      date,
      startDate,
      endDate,
      sort = 'date_asc',
      workspaceId,
    } = req.query as Record<string, string>;

    // Find reminders owned by user or shared with user email
    let list = db.reminders.filter(r => {
      const isOwner = r.userId === user._id;
      const isShared = r.sharedWith && r.sharedWith.some(s => s.email.toLowerCase() === user.email.toLowerCase());
      const isWorkspace = workspaceId ? r.workspaceId === workspaceId : true;
      return (isOwner || isShared) && isWorkspace;
    });

    // Update statuses for overdue
    list = list.map(updateReminderStatus);

    // Filters
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    if (category && category !== 'all') {
      list = list.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }

    if (tag) {
      list = list.filter(r => r.tags && r.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
    }

    if (priority && priority !== 'all') {
      list = list.filter(r => r.priority.toUpperCase() === priority.toUpperCase());
    }

    if (status && status !== 'all') {
      if (status === 'completed') list = list.filter(r => r.isCompleted);
      else if (status === 'pending') list = list.filter(r => !r.isCompleted && r.status !== 'OVERDUE');
      else if (status === 'overdue') list = list.filter(r => r.status === 'OVERDUE');
      else if (status === 'cancelled') list = list.filter(r => r.status === 'CANCELLED');
    }

    if (date) {
      list = list.filter(r => r.date === date);
    } else if (startDate && endDate) {
      list = list.filter(r => r.date >= startDate && r.date <= endDate);
    }

    // Sort
    list.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();

      switch (sort) {
        case 'date_desc':
          return dateB - dateA;
        case 'priority_desc': {
          const pOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
        default:
          return dateA - dateB;
      }
    });

    res.json({
      success: true,
      data: {
        reminders: list,
        total: list.length,
      },
    });
  } catch (error) {
    console.error('Fetch reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reminders.' });
  }
});

// GET /api/reminders/public/:token
router.get('/public/:token', optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const { token } = req.params;
  const reminder = db.reminders.find(r => r.shareToken === token);
  if (!reminder) {
    return res.status(404).json({ success: false, message: 'Shared reminder link is invalid or has expired.' });
  }

  updateReminderStatus(reminder);
  res.json({
    success: true,
    data: { reminder },
  });
});

// POST /api/reminders/batch
router.post('/batch', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { action, reminderIds } = req.body as { action: 'COMPLETE' | 'DELETE' | 'CANCEL'; reminderIds: string[] };

    if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'reminderIds array is required.' });
    }

    if (action === 'DELETE') {
      const initialCount = db.reminders.length;
      db.reminders = db.reminders.filter(r => !(reminderIds.includes(r._id) && r.userId === user._id));
      const deletedCount = initialCount - db.reminders.length;
      db.logActivity(user._id, 'BATCH_DELETE', 'Reminder', `Batch deleted ${deletedCount} reminders`);
      db.save();
      return res.json({ success: true, message: `Successfully deleted ${deletedCount} reminders.` });
    }

    if (action === 'COMPLETE') {
      let count = 0;
      db.reminders.forEach(r => {
        if (reminderIds.includes(r._id) && (r.userId === user._id || r.sharedWith.some(s => s.email.toLowerCase() === user.email.toLowerCase()))) {
          r.isCompleted = true;
          r.status = 'COMPLETED';
          r.completedAt = new Date().toISOString();
          r.updatedAt = new Date().toISOString();
          count++;
        }
      });
      db.logActivity(user._id, 'BATCH_COMPLETE', 'Reminder', `Batch completed ${count} reminders`);
      db.save();
      return res.json({ success: true, message: `Successfully completed ${count} reminders.` });
    }

    if (action === 'CANCEL') {
      let count = 0;
      db.reminders.forEach(r => {
        if (reminderIds.includes(r._id) && r.userId === user._id) {
          r.status = 'CANCELLED';
          r.updatedAt = new Date().toISOString();
          count++;
        }
      });
      db.save();
      return res.json({ success: true, message: `Successfully cancelled ${count} reminders.` });
    }

    res.status(400).json({ success: false, message: 'Invalid batch action type.' });
  } catch (error) {
    console.error('Batch action error:', error);
    res.status(500).json({ success: false, message: 'Failed to perform batch action.' });
  }
});

// GET /api/reminders/:id
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);

  if (!reminder) {
    return res.status(404).json({ success: false, message: 'Reminder not found.' });
  }

  const hasAccess = reminder.userId === user._id || reminder.sharedWith.some(s => s.email.toLowerCase() === user.email.toLowerCase());
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: 'Access denied to this reminder.' });
  }

  updateReminderStatus(reminder);
  res.json({ success: true, data: { reminder } });
});

// POST /api/reminders
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      title,
      description,
      date,
      time,
      priority,
      category,
      tags,
      recurrence,
      notificationSettings,
      attachments,
      workspaceId,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and date are required.' });
    }

    const newReminder: ReminderDoc = {
      _id: generateId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      date: date.trim(),
      time: time ? time.trim() : '09:00',
      timezone: user.timezone || 'UTC',
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      isCompleted: false,
      category: category || 'Personal',
      tags: Array.isArray(tags) ? tags.map((t: string) => t.trim().toLowerCase()) : [],
      userId: user._id,
      workspaceId: workspaceId || undefined,
      attachments: Array.isArray(attachments) ? attachments : [],
      recurrence: recurrence || { type: 'NONE' },
      notificationSettings: notificationSettings || {
        browser: user.browserNotifications,
        email: user.emailNotifications,
        timing: user.notificationTiming || 'at_time',
      },
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateReminderStatus(newReminder);
    db.reminders.push(newReminder);
    db.logActivity(user._id, 'CREATE_REMINDER', 'Reminder', `Created reminder "${newReminder.title}"`, newReminder._id);
    db.save();

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully.',
      data: { reminder: newReminder },
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create reminder.' });
  }
});

// PUT /api/reminders/:id
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const reminder = db.reminders.find(r => r._id === req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    const isOwner = reminder.userId === user._id;
    const sharePermission = reminder.sharedWith.find(s => s.email.toLowerCase() === user.email.toLowerCase())?.permission;
    if (!isOwner && sharePermission !== 'EDIT' && sharePermission !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this reminder.' });
    }

    const {
      title,
      description,
      date,
      time,
      priority,
      category,
      tags,
      recurrence,
      notificationSettings,
      attachments,
    } = req.body;

    if (title) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description.trim();
    if (date) reminder.date = date.trim();
    if (time) reminder.time = time.trim();
    if (priority) reminder.priority = priority;
    if (category) reminder.category = category;
    if (Array.isArray(tags)) reminder.tags = tags.map((t: string) => t.trim().toLowerCase());
    if (recurrence) reminder.recurrence = recurrence;
    if (notificationSettings) reminder.notificationSettings = notificationSettings;
    if (Array.isArray(attachments)) reminder.attachments = attachments;

    reminder.updatedAt = new Date().toISOString();
    updateReminderStatus(reminder);
    db.logActivity(user._id, 'UPDATE_REMINDER', 'Reminder', `Updated reminder "${reminder.title}"`, reminder._id);
    db.save();

    res.json({
      success: true,
      message: 'Reminder updated successfully.',
      data: { reminder },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update reminder.' });
  }
});

// Handlers for complete and toggle
const handleToggleComplete = (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const reminder = db.reminders.find(r => r._id === req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    const isOwner = reminder.userId === user._id;
    const isShared = reminder.sharedWith.some(s => s.email.toLowerCase() === user.email.toLowerCase());
    if (!isOwner && !isShared) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const newCompleted = req.body?.isCompleted !== undefined ? Boolean(req.body.isCompleted) : !reminder.isCompleted;
    reminder.isCompleted = newCompleted;
    reminder.status = newCompleted ? 'COMPLETED' : 'PENDING';
    reminder.completedAt = newCompleted ? new Date().toISOString() : undefined;
    reminder.updatedAt = new Date().toISOString();

    let nextReminderCreated: ReminderDoc | null = null;

    // If completed and has recurrence, spawn the next occurrence!
    if (newCompleted && reminder.recurrence && reminder.recurrence.type !== 'NONE') {
      const nextDate = calculateNextOccurrence(reminder.date, reminder.recurrence);
      if (nextDate) {
        nextReminderCreated = {
          _id: generateId(),
          title: reminder.title,
          description: reminder.description,
          date: nextDate,
          time: reminder.time,
          timezone: reminder.timezone,
          priority: reminder.priority,
          status: 'PENDING',
          isCompleted: false,
          category: reminder.category,
          tags: [...reminder.tags],
          userId: reminder.userId,
          workspaceId: reminder.workspaceId,
          attachments: [...reminder.attachments],
          recurrence: reminder.recurrence,
          notificationSettings: reminder.notificationSettings,
          sharedWith: [...reminder.sharedWith],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.reminders.push(nextReminderCreated);
        db.addNotification(
          user._id,
          'Next Recurring Reminder Scheduled',
          `"${reminder.title}" scheduled for ${nextDate}.`,
          'REMINDER_DUE',
          nextReminderCreated._id
        );
      }
    }

    db.logActivity(
      user._id,
      newCompleted ? 'COMPLETE_REMINDER' : 'UNCOMPLETE_REMINDER',
      'Reminder',
      `${newCompleted ? 'Completed' : 'Marked pending'} "${reminder.title}"`,
      reminder._id
    );
    db.save();

    res.json({
      success: true,
      message: newCompleted ? 'Reminder marked as completed!' : 'Reminder reopened.',
      data: { reminder, nextOccurrence: nextReminderCreated },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle complete status.' });
  }
};

router.patch('/:id/complete', authMiddleware, handleToggleComplete);
router.put('/:id/complete', authMiddleware, handleToggleComplete);
router.patch('/:id/toggle', authMiddleware, handleToggleComplete);
router.put('/:id/toggle', authMiddleware, handleToggleComplete);

// PATCH /api/reminders/:id/cancel
router.patch('/:id/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or access denied.' });
  }

  reminder.status = reminder.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED';
  reminder.updatedAt = new Date().toISOString();
  db.logActivity(user._id, 'CANCEL_REMINDER', 'Reminder', `Status toggled for "${reminder.title}"`, reminder._id);
  db.save();

  res.json({
    success: true,
    message: `Reminder status set to ${reminder.status}`,
    data: { reminder },
  });
});

// POST /api/reminders/:id/duplicate
router.post('/:id/duplicate', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder) {
    return res.status(404).json({ success: false, message: 'Reminder not found.' });
  }

  const duplicated: ReminderDoc = {
    ...reminder,
    _id: generateId(),
    title: `${reminder.title} (Copy)`,
    isCompleted: false,
    status: 'PENDING',
    completedAt: undefined,
    userId: user._id,
    sharedWith: [],
    shareToken: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.reminders.push(duplicated);
  db.logActivity(user._id, 'DUPLICATE_REMINDER', 'Reminder', `Duplicated "${reminder.title}"`, duplicated._id);
  db.save();

  res.status(201).json({
    success: true,
    message: 'Reminder duplicated successfully.',
    data: { reminder: duplicated },
  });
});

// POST /api/reminders/:id/share
router.post('/:id/share', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { email, permission = 'VIEW' } = req.body;
  const reminder = db.reminders.find(r => r._id === req.params.id);

  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or you are not the owner.' });
  }

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required to share reminder.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingShare = reminder.sharedWith.find(s => s.email.toLowerCase() === normalizedEmail);
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    reminder.sharedWith.push({
      email: normalizedEmail,
      permission,
      accepted: true,
      invitedAt: new Date().toISOString(),
    });
  }

  // If invited user is registered in the system, notify them
  const targetUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (targetUser) {
    db.addNotification(
      targetUser._id,
      'Reminder Shared With You',
      `${user.name} shared the reminder "${reminder.title}" with ${permission} access.`,
      'SHARED',
      reminder._id
    );
  }

  db.logActivity(user._id, 'SHARE_REMINDER', 'Reminder', `Shared "${reminder.title}" with ${normalizedEmail}`, reminder._id);
  db.save();

  res.json({
    success: true,
    message: `Reminder shared with ${normalizedEmail}.`,
    data: { sharedWith: reminder.sharedWith },
  });
});

// DELETE /api/reminders/:id/share/:email
router.delete('/:id/share/:email', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or access denied.' });
  }

  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  reminder.sharedWith = reminder.sharedWith.filter(s => s.email.toLowerCase() !== targetEmail);
  db.save();

  res.json({
    success: true,
    message: 'Sharing permission revoked.',
    data: { sharedWith: reminder.sharedWith },
  });
});

// POST /api/reminders/:id/share-link
router.post('/:id/share-link', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or access denied.' });
  }

  if (!reminder.shareToken) {
    reminder.shareToken = crypto.randomBytes(16).toString('hex');
    reminder.sharePermission = 'VIEW';
    db.save();
  }

  res.json({
    success: true,
    message: 'Shareable link generated.',
    data: {
      shareToken: reminder.shareToken,
      shareUrl: `/share/${reminder.shareToken}`,
    },
  });
});

// DELETE /api/reminders/:id/share-link
router.delete('/:id/share-link', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or access denied.' });
  }

  reminder.shareToken = undefined;
  db.save();

  res.json({
    success: true,
    message: 'Share link revoked.',
  });
});

// POST /api/reminders/:id/sync-google
router.post('/:id/sync-google', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const reminder = db.reminders.find(r => r._id === req.params.id);
  if (!reminder || reminder.userId !== user._id) {
    return res.status(404).json({ success: false, message: 'Reminder not found or access denied.' });
  }

  reminder.syncedToGoogleCalendar = !reminder.syncedToGoogleCalendar;
  if (reminder.syncedToGoogleCalendar) {
    reminder.googleEventId = `gcal_${crypto.randomBytes(8).toString('hex')}`;
  } else {
    reminder.googleEventId = undefined;
  }
  db.save();

  res.json({
    success: true,
    message: reminder.syncedToGoogleCalendar
      ? 'Reminder synchronized with Google Calendar.'
      : 'Removed from Google Calendar sync.',
    data: { reminder },
  });
});

// DELETE /api/reminders/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const index = db.reminders.findIndex(r => r._id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Reminder not found.' });
  }

  const reminder = db.reminders[index];
  if (reminder.userId !== user._id) {
    return res.status(403).json({ success: false, message: 'Only the creator can delete this reminder.' });
  }

  db.reminders.splice(index, 1);
  db.logActivity(user._id, 'DELETE_REMINDER', 'Reminder', `Deleted "${reminder.title}"`);
  db.save();

  res.json({
    success: true,
    message: 'Reminder deleted successfully.',
  });
});

export default router;
