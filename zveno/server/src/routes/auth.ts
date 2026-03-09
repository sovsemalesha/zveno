import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zveno-secret-key';

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword },
    });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user: { id: user.id, email: user.email, username: user.username }, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar }, token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ id: user.id, email: user.email, username: user.username, avatar: user.avatar });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export const authRouter = router;
