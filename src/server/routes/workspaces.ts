import { Router, Response } from 'express';
import { db, generateId, WorkspaceDoc } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/workspaces
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  // Return workspaces owned by user or where user is member
  const list = db.workspaces.filter(w =>
    w.ownerId === user._id || w.members.some(m => m.email.toLowerCase() === user.email.toLowerCase() || m.userId === user._id)
  );

  res.json({
    success: true,
    data: { workspaces: list },
  });
});

// POST /api/workspaces
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, description = '', type = 'TEAM' } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Workspace name is required.' });
  }

  const newWorkspace: WorkspaceDoc = {
    _id: generateId(),
    name: name.trim(),
    description: description.trim(),
    type,
    ownerId: user._id,
    members: [
      {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: 'OWNER',
        avatar: user.profileImage,
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.workspaces.push(newWorkspace);
  db.logActivity(user._id, 'CREATE_WORKSPACE', 'Workspace', `Created workspace "${newWorkspace.name}"`, newWorkspace._id);
  db.save();

  res.status(201).json({
    success: true,
    message: 'Workspace created successfully.',
    data: { workspace: newWorkspace },
  });
});

// POST /api/workspaces/:id/invite
router.post('/:id/invite', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { email, name, role = 'MEMBER' } = req.body;
  const ws = db.workspaces.find(w => w._id === req.params.id);

  if (!ws) {
    return res.status(404).json({ success: false, message: 'Workspace not found.' });
  }

  const isOwner = ws.ownerId === user._id;
  const userMember = ws.members.find(m => m.email.toLowerCase() === user.email.toLowerCase());
  if (!isOwner && (!userMember || userMember.role !== 'ADMIN')) {
    return res.status(403).json({ success: false, message: 'Only workspace owners or admins can invite members.' });
  }

  if (!email) {
    return res.status(400).json({ success: false, message: 'Member email is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingMember = ws.members.find(m => m.email.toLowerCase() === normalizedEmail);
  if (existingMember) {
    return res.status(409).json({ success: false, message: 'This member is already part of the workspace.' });
  }

  const targetUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  ws.members.push({
    userId: targetUser ? targetUser._id : undefined,
    name: name || (targetUser ? targetUser.name : normalizedEmail.split('@')[0]),
    email: normalizedEmail,
    role,
    avatar: targetUser?.profileImage,
    joinedAt: new Date().toISOString(),
  });

  if (targetUser) {
    db.addNotification(
      targetUser._id,
      'Workspace Invitation',
      `You were added to the workspace "${ws.name}" by ${user.name}.`,
      'WORKSPACE'
    );
  }

  ws.updatedAt = new Date().toISOString();
  db.logActivity(user._id, 'INVITE_WORKSPACE_MEMBER', 'Workspace', `Invited ${normalizedEmail} to "${ws.name}"`, ws._id);
  db.save();

  res.json({
    success: true,
    message: `Invitation sent to ${normalizedEmail}.`,
    data: { workspace: ws },
  });
});

// DELETE /api/workspaces/:id/member/:email
router.delete('/:id/member/:email', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const ws = db.workspaces.find(w => w._id === req.params.id);
  if (!ws) {
    return res.status(404).json({ success: false, message: 'Workspace not found.' });
  }

  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  if (targetEmail === user.email.toLowerCase() && ws.ownerId === user._id) {
    return res.status(400).json({ success: false, message: 'Owner cannot leave workspace. Transfer ownership or delete workspace.' });
  }

  ws.members = ws.members.filter(m => m.email.toLowerCase() !== targetEmail);
  ws.updatedAt = new Date().toISOString();
  db.save();

  res.json({
    success: true,
    message: 'Member removed from workspace.',
    data: { workspace: ws },
  });
});

export default router;
