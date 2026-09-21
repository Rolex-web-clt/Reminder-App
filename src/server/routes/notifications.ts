import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifs = db.notifications.filter(n => n.userId === user._id);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  res.json({
    success: true,
    data: {
      notifications: notifs,
      unreadCount,
    },
  });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notif = db.notifications.find(n => n._id === req.params.id && n.userId === user._id);
  if (!notif) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  notif.isRead = true;
  db.save();

  res.json({ success: true, message: 'Notification marked as read.' });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  db.notifications.forEach(n => {
    if (n.userId === user._id) {
      n.isRead = true;
    }
  });
  db.save();

  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const index = db.notifications.findIndex(n => n._id === req.params.id && n.userId === user._id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Notification not found.' });
  }

  db.notifications.splice(index, 1);
  db.save();

  res.json({ success: true, message: 'Notification removed.' });
});

// DELETE /api/notifications (clear all)
router.delete('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  db.notifications = db.notifications.filter(n => n.userId !== user._id);
  db.save();

  res.json({ success: true, message: 'All notifications cleared.' });
});

export default router;
