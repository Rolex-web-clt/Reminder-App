import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, generateId, UserDoc } from '../db';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();

function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Ensure demo user exists for seamless testing out-of-the-box
function ensureDemoUser(): UserDoc {
  let demo = db.users.find(u => u.email === 'demo@remindify.com');
  if (!demo) {
    const salt = bcrypt.genSaltSync(10);
    demo = {
      _id: generateId(),
      name: 'Anil Verma',
      email: 'demo@remindify.com',
      password: bcrypt.hashSync('Password123!', salt),
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+1 (555) 234-5678',
      isEmailVerified: true,
      twoFactorEnabled: false,
      role: 'USER',
      language: 'en',
      timezone: 'America/New_York',
      browserNotifications: true,
      emailNotifications: true,
      notificationTiming: 'at_time',
      theme: 'light',
      googleCalendarConnected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(demo);

    // Add initial reminders for the demo user
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    db.reminders.push(
      {
        _id: generateId(),
        title: 'Review MERN Architecture & API Endpoints',
        description: 'Verify JWT tokens, Express rate limit, and MongoDB collection models.',
        date: todayStr,
        time: '14:00',
        timezone: 'America/New_York',
        priority: 'HIGH',
        status: 'PENDING',
        isCompleted: false,
        category: 'Work',
        tags: ['mern', 'architecture', 'important'],
        userId: demo._id,
        attachments: [],
        recurrence: { type: 'NONE' },
        notificationSettings: { browser: true, email: true, timing: 'at_time' },
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: generateId(),
        title: 'Daily Team Standup Meeting',
        description: 'Sync with product and engineering teams on sprint deliverables.',
        date: todayStr,
        time: '10:00',
        timezone: 'America/New_York',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        isCompleted: true,
        completedAt: new Date().toISOString(),
        category: 'Meeting',
        tags: ['work', 'standup'],
        userId: demo._id,
        attachments: [],
        recurrence: { type: 'DAILY' },
        notificationSettings: { browser: true, email: false, timing: '5m' },
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: generateId(),
        title: 'Submit Quarterly Financial Report',
        description: 'Collate monthly receipts, tax deductions, and invoices.',
        date: tomorrowStr,
        time: '17:30',
        timezone: 'America/New_York',
        priority: 'URGENT',
        status: 'PENDING',
        isCompleted: false,
        category: 'Finance',
        tags: ['urgent', 'tax', 'finance'],
        userId: demo._id,
        attachments: [],
        recurrence: { type: 'MONTHLY' },
        notificationSettings: { browser: true, email: true, timing: '1h' },
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    db.save();
  }
  return demo;
}

ensureDemoUser();

// POST /api/auth/demo
router.post('/demo', (req, res) => {
  const demo = ensureDemoUser();
  const token = createToken(demo._id);
  const { password: _, ...userSafe } = demo;
  return res.json({
    success: true,
    message: 'Demo login successful.',
    data: { user: userSafe, token },
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, language, timezone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser: UserDoc = {
      _id: generateId(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: true,
      twoFactorEnabled: false,
      role: 'USER',
      language: language || 'en',
      timezone: timezone || 'UTC',
      browserNotifications: true,
      emailNotifications: true,
      notificationTiming: 'at_time',
      theme: 'light',
      googleCalendarConnected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.logActivity(newUser._id, 'REGISTER', 'User', 'Account registered');
    db.addNotification(newUser._id, 'Welcome to Remindify!', 'Get started by creating your first reminder or using our AI assistant.', 'SYSTEM');
    db.save();

    const token = createToken(newUser._id);
    const { password: _, ...userSafe } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: { user: userSafe, token },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ userId: user._id, is2FATemp: true }, JWT_SECRET, { expiresIn: '10m' });
      return res.status(200).json({
        success: true,
        require2FA: true,
        message: 'Two-factor authentication code required.',
        data: { tempToken },
      });
    }

    db.logActivity(user._id, 'LOGIN', 'User', 'User logged in successfully');
    const token = createToken(user._id);
    const { password: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      data: { user: userSafe, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// POST /api/auth/login/2fa
router.post('/login/2fa', (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ success: false, message: 'Temp token and verification code are required.' });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET) as { userId: string; is2FATemp?: boolean };
    const user = db.users.find(u => u._id === decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Verify code: accept demo code '123456' or secret or backup code
    const isValid = code === '123456' || code === user.twoFactorSecret || (user.backupCodes && user.backupCodes.includes(code));
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code or backup code.' });
    }

    const token = createToken(user._id);
    const { password: _, ...userSafe } = user;

    db.logActivity(user._id, '2FA_LOGIN', 'Security', 'Logged in using Two-Factor Authentication');

    return res.json({
      success: true,
      message: '2FA verification successful.',
      data: { user: userSafe, token },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const { password: _, ...userSafe } = req.user!;
  res.json({
    success: true,
    data: { user: userSafe },
  });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { name, phone, language, timezone, theme, profileImage, browserNotifications, emailNotifications, notificationTiming } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (language) user.language = language;
    if (timezone) user.timezone = timezone;
    if (theme) user.theme = theme;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (browserNotifications !== undefined) user.browserNotifications = Boolean(browserNotifications);
    if (emailNotifications !== undefined) user.emailNotifications = Boolean(emailNotifications);
    if (notificationTiming) user.notificationTiming = notificationTiming;

    user.updatedAt = new Date().toISOString();
    db.save();

    db.logActivity(user._id, 'UPDATE_PROFILE', 'User', 'Updated profile information');
    const { password: _, ...userSafe } = user;

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: userSafe },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date().toISOString();
    db.save();

    db.logActivity(user._id, 'CHANGE_PASSWORD', 'Security', 'Password changed successfully');

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// POST /api/auth/2fa/generate
router.post('/2fa/generate', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  const secret = '123456'; // standard test code
  const backupCodes = [
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  ];

  user.twoFactorSecret = secret;
  user.backupCodes = backupCodes;
  db.save();

  res.json({
    success: true,
    data: {
      secret,
      qrPlaceholder: 'otpauth://totp/Remindify:' + user.email + '?secret=JBSWY3DPEHPK3PXP&issuer=Remindify',
      backupCodes,
      testCode: '123456',
    },
  });
});

// POST /api/auth/2fa/toggle
router.post('/2fa/toggle', authMiddleware, (req: AuthRequest, res) => {
  const { enabled, code } = req.body;
  const user = req.user!;

  if (enabled) {
    if (code !== '123456' && code !== user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code. Use 123456 to enable.' });
    }
    user.twoFactorEnabled = true;
    db.logActivity(user._id, 'ENABLE_2FA', 'Security', 'Enabled Two-Factor Authentication');
  } else {
    user.twoFactorEnabled = false;
    db.logActivity(user._id, 'DISABLE_2FA', 'Security', 'Disabled Two-Factor Authentication');
  }

  user.updatedAt = new Date().toISOString();
  db.save();

  const { password: _, ...userSafe } = user;
  res.json({
    success: true,
    message: `Two-Factor Authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}.`,
    data: { user: userSafe },
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  // Don't reveal user existence
  return res.json({
    success: true,
    message: 'If an account exists with that email, a password reset link has been dispatched.',
  });
});

// DELETE /api/auth/account
router.delete('/account', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  const index = db.users.findIndex(u => u._id === user._id);
  if (index !== -1) {
    db.users.splice(index, 1);
  }
  // Remove user's reminders
  const remIndexes = db.reminders.filter(r => r.userId !== user._id);
  db.reminders.length = 0;
  db.reminders.push(...remIndexes);
  db.save();

  res.json({
    success: true,
    message: 'Account and associated data deleted successfully.',
  });
});

export default router;
