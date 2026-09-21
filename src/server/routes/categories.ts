import { Router, Response } from 'express';
import { db, generateId, CategoryDoc } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/categories
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  // Return system default categories + user created categories
  const list = db.categories.filter(c => c.isDefault || c.userId === user._id);
  res.json({
    success: true,
    data: { categories: list },
  });
});

// POST /api/categories
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, color = '#6366f1', icon = 'Folder' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required.' });
  }

  const existing = db.categories.find(
    c => (c.isDefault || c.userId === user._id) && c.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ success: false, message: 'Category with this name already exists.' });
  }

  const newCat: CategoryDoc = {
    _id: generateId(),
    name: name.trim(),
    color,
    icon,
    isDefault: false,
    userId: user._id,
    createdAt: new Date().toISOString(),
  };

  db.categories.push(newCat);
  db.logActivity(user._id, 'CREATE_CATEGORY', 'Category', `Created category "${newCat.name}"`, newCat._id);
  db.save();

  res.status(201).json({
    success: true,
    message: 'Category created successfully.',
    data: { category: newCat },
  });
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const cat = db.categories.find(c => c._id === req.params.id);

  if (!cat) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }
  if (cat.isDefault && user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Default categories cannot be edited.' });
  }
  if (!cat.isDefault && cat.userId !== user._id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const { name, color, icon } = req.body;
  if (name) cat.name = name.trim();
  if (color) cat.color = color;
  if (icon) cat.icon = icon;
  db.save();

  res.json({
    success: true,
    message: 'Category updated successfully.',
    data: { category: cat },
  });
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const index = db.categories.findIndex(c => c._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Category not found.' });
  }

  const cat = db.categories[index];
  if (cat.isDefault) {
    return res.status(400).json({ success: false, message: 'System default categories cannot be deleted.' });
  }
  if (cat.userId !== user._id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  db.categories.splice(index, 1);
  db.save();

  res.json({
    success: true,
    message: 'Category deleted successfully.',
  });
});

export default router;
