import { Router, Response } from 'express';
import { db, generateId, TagDoc } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/tags
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const list = db.tags.filter(t => t.userId === 'system' || t.userId === user._id);
  res.json({
    success: true,
    data: { tags: list },
  });
});

// POST /api/tags
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, color = '#3b82f6' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Tag name is required.' });
  }

  const cleanName = name.trim().replace(/^#/, '').toLowerCase();
  const existing = db.tags.find(
    t => (t.userId === 'system' || t.userId === user._id) && t.name.toLowerCase() === cleanName
  );
  if (existing) {
    return res.status(200).json({ success: true, data: { tag: existing } });
  }

  const newTag: TagDoc = {
    _id: generateId(),
    name: cleanName,
    color,
    userId: user._id,
  };

  db.tags.push(newTag);
  db.save();

  res.status(201).json({
    success: true,
    message: 'Tag created successfully.',
    data: { tag: newTag },
  });
});

// DELETE /api/tags/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const index = db.tags.findIndex(t => t._id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Tag not found.' });
  }

  const tag = db.tags[index];
  if (tag.userId === 'system') {
    return res.status(400).json({ success: false, message: 'Default tags cannot be deleted.' });
  }
  if (tag.userId !== user._id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  db.tags.splice(index, 1);
  db.save();

  res.json({ success: true, message: 'Tag deleted successfully.' });
});

export default router;
