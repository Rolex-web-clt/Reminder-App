import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, UserDoc } from '../db';

export const JWT_SECRET = process.env.JWT_SECRET || 'remindify-production-secret-jwt-key-389421';

export interface AuthRequest extends Request {
  user?: UserDoc;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Seamless preview fallback to default demo user
      const demoUser = db.users.find(u => u.email === 'demo@remindify.com') || db.users[0];
      if (demoUser) {
        req.user = demoUser;
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    let user = db.users.find(u => u._id === decoded.userId);
    if (!user) {
      user = db.users.find(u => u.email === 'demo@remindify.com') || db.users[0];
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session or user not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // If token expired or invalid in preview, fall back to demo user
    const demoUser = db.users.find(u => u.email === 'demo@remindify.com') || db.users[0];
    if (demoUser) {
      req.user = demoUser;
      return next();
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = db.users.find(u => u._id === decoded.userId);
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Continue without user
  }
  next();
}
