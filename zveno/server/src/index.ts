import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { serverRouter } from './routes/servers.js';
import { channelRouter } from './routes/channels.js';
import { messageRouter } from './routes/messages.js';
import { setupSocket } from './socket/index.js';
import { voiceService } from './services/voice.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, process.env.CLIENT_URL.replace('https://', 'http://')] : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, process.env.CLIENT_URL.replace('https://', 'http://')] : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/servers', serverRouter);
app.use('/api/channels', channelRouter);
app.use('/api/messages', messageRouter);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Zveno API running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

setupSocket(io);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await voiceService.initialize();
    console.log('✅ Voice service initialized');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
