import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zveno-secret-key';

interface AuthSocket extends Socket {
  userId?: string;
  serverId?: string;
}

export function setupSocket(io: Server) {
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.userId}`);
    
    socket.on('server:join', async (serverId: string) => {
      const member = await prisma.member.findFirst({
        where: { serverId, userId: socket.userId },
      });
      
      if (!member) {
        socket.emit('error', 'Not a member');
        return;
      }
      
      socket.serverId = serverId;
      socket.join(`server:${serverId}`);
      socket.to(`server:${serverId}`).emit('member:join', { userId: socket.userId });
    });
    
    socket.on('server:leave', (serverId: string) => {
      socket.leave(`server:${serverId}`);
      socket.to(`server:${serverId}`).emit('member:leave', { userId: socket.userId });
    });
    
    socket.on('message:send', async (data: { channelId: string; content: string }) => {
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
      });
      
      if (!channel) return;
      
      const member = await prisma.member.findFirst({
        where: { serverId: channel.serverId, userId: socket.userId },
      });
      
      if (!member) return;
      
      const message = await prisma.message.create({
        data: {
          content: data.content,
          channelId: data.channelId,
          userId: socket.userId!,
        },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      });
      
      io.to(`server:${channel.serverId}`).emit('message:new', message);
    });
    
    socket.on('voice:join', async (data: { channelId: string; serverId: string }) => {
      const member = await prisma.member.findFirst({
        where: { serverId: data.serverId, userId: socket.userId },
      });
      
      if (!member) return;
      
      await prisma.member.update({
        where: { id: member.id },
        data: { voiceChannelId: data.channelId },
      });
      
      socket.join(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-joined', { userId: socket.userId });
    });
    
    socket.on('voice:leave', async (data: { channelId: string; serverId: string }) => {
      const member = await prisma.member.findFirst({
        where: { serverId: data.serverId, userId: socket.userId },
      });
      
      if (member) {
        await prisma.member.update({
          where: { id: member.id },
          data: { voiceChannelId: null },
        });
      }
      
      socket.leave(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-left', { userId: socket.userId });
    });
    
    socket.on('disconnect', async () => {
      if (socket.serverId && socket.userId) {
        const member = await prisma.member.findFirst({
          where: { serverId: socket.serverId, userId: socket.userId },
        });
        
        if (member?.voiceChannelId) {
          socket.to(`voice:${member.voiceChannelId}`).emit('voice:user-left', { userId: socket.userId });
        }
      }
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
}
