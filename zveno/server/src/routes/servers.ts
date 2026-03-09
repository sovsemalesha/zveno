import { Router, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const members = await prisma.member.findMany({
    where: { userId: req.userId },
    include: {
      server: {
        include: {
          channels: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  
  const servers = members.map(m => m.server);
  res.json(servers);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, icon } = req.body;
  const inviteCode = Math.random().toString(36).substring(2, 10);
  
  const server = await prisma.server.create({
    data: {
      name,
      icon,
      inviteCode,
      ownerId: req.userId!,
      channels: {
        create: [
          { name: 'general', type: 'TEXT', position: 0 },
          { name: 'Voice Chat', type: 'VOICE', position: 1 },
        ],
      },
      members: {
        create: { userId: req.userId!, role: 'ADMIN' },
      },
    },
    include: { channels: true, members: true },
  });
  
  res.json(server);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  const member = await prisma.member.findFirst({
    where: { serverId: id, userId: req.userId },
  });
  
  if (!member) {
    return res.status(403).json({ error: 'Not a member' });
  }
  
  const server = await prisma.server.findUnique({
    where: { id },
    include: {
      channels: { orderBy: { position: 'asc' } },
      members: { include: { user: true } },
    },
  });
  
  res.json(server);
});

router.post('/join/:inviteCode', async (req: AuthRequest, res: Response) => {
  const { inviteCode } = req.params;
  
  const server = await prisma.server.findUnique({
    where: { inviteCode },
  });
  
  if (!server) {
    return res.status(404).json({ error: 'Invalid invite code' });
  }
  
  const existing = await prisma.member.findUnique({
    where: { userId_serverId: { userId: req.userId!, serverId: server.id } },
  });
  
  if (existing) {
    return res.status(400).json({ error: 'Already a member' });
  }
  
  await prisma.member.create({
    data: { userId: req.userId!, serverId: server.id, role: 'USER' },
  });
  
  res.json(server);
});

export const serverRouter = router;
