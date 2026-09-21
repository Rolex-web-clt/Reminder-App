import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/analytics and /api/analytics/overview
router.get(['/', '/overview'], authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const userReminders = db.reminders.filter(r => r.userId === user._id);

  const total = userReminders.length;
  const completed = userReminders.filter(r => r.isCompleted).length;
  const pending = userReminders.filter(r => !r.isCompleted && r.status !== 'OVERDUE').length;
  const overdue = userReminders.filter(r => r.status === 'OVERDUE').length;
  const cancelled = userReminders.filter(r => r.status === 'CANCELLED').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;

  // Last 7 days breakdown
  const daysMap: Record<string, { day: string; date: string; completed: number; created: number }> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = dayNames[d.getDay()];
    daysMap[dateStr] = {
      day: dayLabel,
      date: dateStr,
      completed: 0,
      created: 0,
    };
  }

  userReminders.forEach(r => {
    // Created
    const createdDate = r.createdAt.split('T')[0];
    if (daysMap[createdDate]) {
      daysMap[createdDate].created += 1;
    }
    // Completed
    if (r.completedAt) {
      const compDate = r.completedAt.split('T')[0];
      if (daysMap[compDate]) {
        daysMap[compDate].completed += 1;
      }
    }
  });

  const weeklyTrend = Object.values(daysMap);

  // Category distribution
  const catCount: Record<string, number> = {};
  userReminders.forEach(r => {
    const c = r.category || 'Other';
    catCount[c] = (catCount[c] || 0) + 1;
  });
  const categoryData = Object.entries(catCount).map(([name, count]) => ({ name, count }));

  // Priority distribution
  const priorityCount: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  userReminders.forEach(r => {
    if (priorityCount[r.priority] !== undefined) {
      priorityCount[r.priority] += 1;
    }
  });
  const priorityData = Object.entries(priorityCount).map(([priority, count]) => ({ priority, count }));

  // Most productive day
  let bestDay = 'None';
  let maxComp = 0;
  weeklyTrend.forEach(w => {
    if (w.completed > maxComp) {
      maxComp = w.completed;
      bestDay = `${w.day} (${w.completed} tasks)`;
    }
  });

  // Most used category
  let mostUsedCat = 'None';
  let maxCatCount = 0;
  Object.entries(catCount).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostUsedCat = cat;
    }
  });

  // Productivity score (0-100)
  // Weighted: completion rate (60%), low overdue penalty (20%), activity level (20%)
  const overduePenalty = Math.max(0, 20 - overdueRate * 0.5);
  const activityScore = Math.min(20, total * 4);
  const productivityScore = Math.min(100, Math.round((completionRate * 0.6) + overduePenalty + activityScore));

  res.json({
    success: true,
    data: {
      metrics: {
        total,
        completed,
        pending,
        overdue,
        cancelled,
        completionRate,
        overdueRate,
        productivityScore,
        mostProductiveDay: bestDay,
        mostUsedCategory: mostUsedCat,
      },
      weeklyTrend,
      categoryData,
      priorityData,
    },
  });
});

export default router;
