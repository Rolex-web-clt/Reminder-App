import { Router, Response } from 'express';
import { parseNaturalLanguageReminder } from '../services/ai';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/ai/parse-reminder
router.post('/parse-reminder', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, timezone } = req.body;
    const user = req.user!;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Natural language text or voice transcript is required.' });
    }

    const parsed = await parseNaturalLanguageReminder(text.trim(), timezone || user.timezone || 'UTC');

    res.json({
      success: true,
      message: 'Reminder successfully extracted from prompt.',
      data: { parsed },
    });
  } catch (error) {
    console.error('AI parse reminder route error:', error);
    res.status(500).json({ success: false, message: 'Failed to process AI reminder parsing.' });
  }
});

export default router;
