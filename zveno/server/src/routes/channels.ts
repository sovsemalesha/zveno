import { Router, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/server/:serverId', async (req: AuthRequest, res: Response) => {
  const { serverId } = req.params;
  const { name, type = 'TEXT' } = req.body;
  
  const member = await prisma.member.findFirst({
    where: { serverId, userId: req.userId, role: 'ADMIN' },
  });
  
  if (!member) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  const maxPosition = await prisma.channel.aggregate({
    where: { serverId },
    _max: { position: true },
  });
  
  const channel = await prisma.channel.create({
    data: {
      name,
      type: type as 'TEXT' | 'VOICE',
      position: (maxPosition._max.position ?? -1) + 1,
      serverId,
    },
  });
  
  res.json(channel);
});

export const channelRouter = router;
