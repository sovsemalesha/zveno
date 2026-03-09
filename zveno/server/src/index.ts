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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/servers', serverRouter);
app.use('/api/channels', channelRouter);
app.use('/api/messages', messageRouter);

setupSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
