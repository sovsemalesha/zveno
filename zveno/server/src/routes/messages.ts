import { Router, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/channel/:channelId', async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const { limit = 50, before } = req.query;
  
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  const member = await prisma.member.findFirst({
    where: { serverId: channel.serverId, userId: req.userId },
  });
  
  if (!member) {
    return res.status(403).json({ error: 'Not a member' });
  }
  
  const messages = await prisma.message.findMany({
    where: {
      channelId,
      ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
  });
  
  res.json(messages.reverse());
});

router.post('/channel/:channelId', async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const { content } = req.body;
  
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  const member = await prisma.member.findFirst({
    where: { serverId: channel.serverId, userId: req.userId },
  });
  
  if (!member) {
    return res.status(403).json({ error: 'Not a member' });
  }
  
  const message = await prisma.message.create({
    data: { content, channelId, userId: req.userId! },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  });
  
  res.json(message);
});

export const messageRouter = router;
