import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { createServer as createViteServer } from 'vite';

import authRoutes from './src/server/routes/auth';
import reminderRoutes from './src/server/routes/reminders';
import categoryRoutes from './src/server/routes/categories';
import tagRoutes from './src/server/routes/tags';
import notificationRoutes from './src/server/routes/notifications';
import workspaceRoutes from './src/server/routes/workspaces';
import analyticsRoutes from './src/server/routes/analytics';
import aiRoutes from './src/server/routes/ai';
import exportRoutes from './src/server/routes/export';
import { db } from './src/server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Middlewares
  // In AI Studio, the app runs inside an iframe, so disable headers that block iframe embedding
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      xFrameOptions: false,
    })
  );

  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic structured logging
  app.use(morgan('dev'));

  // Rate Limiting on API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // generous for rich interactive SaaS
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiLimiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Remindify MERN SaaS API',
      timestamp: new Date().toISOString(),
      database: 'connected (hybrid MongoDB-ready persistent store)',
      models: ['User', 'Reminder', 'Category', 'Tag', 'Notification', 'Workspace', 'ActivityLog'],
    });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/export', exportRoutes);

  // Background Job: Check due reminders periodically (runs every 30s)
  setInterval(() => {
    try {
      const now = new Date();
      db.reminders.forEach(r => {
        if (r.isCompleted || r.status === 'CANCELLED' || r.notificationSettings?.notified) return;

        const reminderTime = new Date(`${r.date}T${r.time || '00:00'}:00`);
        if (isNaN(reminderTime.getTime())) return;

        const diffMinutes = Math.round((reminderTime.getTime() - now.getTime()) / (1000 * 60));

        let shouldNotify = false;
        const timing = r.notificationSettings?.timing || 'at_time';

        if (timing === 'at_time' && diffMinutes <= 0 && diffMinutes >= -5) shouldNotify = true;
        else if (timing === '5m' && diffMinutes <= 5 && diffMinutes >= 0) shouldNotify = true;
        else if (timing === '10m' && diffMinutes <= 10 && diffMinutes >= 0) shouldNotify = true;
        else if (timing === '30m' && diffMinutes <= 30 && diffMinutes >= 0) shouldNotify = true;
        else if (timing === '1h' && diffMinutes <= 60 && diffMinutes >= 0) shouldNotify = true;
        else if (timing === '1d' && diffMinutes <= 1440 && diffMinutes >= 0) shouldNotify = true;

        if (shouldNotify) {
          r.notificationSettings.notified = true;
          db.addNotification(
            r.userId,
            `Reminder Due: ${r.title}`,
            `Your reminder "${r.title}" is scheduled for ${r.time} (${r.category || 'General'}).`,
            'REMINDER_DUE',
            r._id
          );
        }
      });
    } catch (e) {
      console.error('Background reminder job error:', e);
    }
  }, 30000);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Remindify MERN Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
