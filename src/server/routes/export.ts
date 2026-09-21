import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/export/reminders, /api/export/json, /api/export/csv
router.get(['/reminders', '/json', '/csv'], authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  let format = (req.query.format as string) || (req.path.includes('json') ? 'json' : 'csv');
  const { status, category } = req.query as Record<string, string>;

  let list = db.reminders.filter(r => r.userId === user._id);

  if (status && status !== 'all') {
    if (status === 'completed') list = list.filter(r => r.isCompleted);
    if (status === 'pending') list = list.filter(r => !r.isCompleted);
  }

  if (category && category !== 'all') {
    list = list.filter(r => r.category.toLowerCase() === category.toLowerCase());
  }

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="reminders.json"');
    return res.send(JSON.stringify(list, null, 2));
  }

  // CSV format
  const headers = ['Title', 'Description', 'Date', 'Time', 'Priority', 'Status', 'Category', 'Tags', 'Recurrence', 'Completed'];
  const rows = list.map(r => [
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    r.date,
    r.time,
    r.priority,
    r.status,
    r.category,
    `"${(r.tags || []).join(';')}"`,
    r.recurrence?.type || 'NONE',
    r.isCompleted ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="remindify-export.csv"');
  res.send(csvContent);
});

// GET /api/activity
router.get('/activity', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const acts = db.activities.filter(a => a.userId === user._id).slice(0, 50);
  res.json({
    success: true,
    data: { activities: acts },
  });
});

export default router;
