import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { attachSocket } from './services/realtimeService.js';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientOrigin,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.emit('connected', { socketId: socket.id, connectedAt: new Date().toISOString() });
});

attachSocket(io);

server.listen(env.port, () => {
  console.log(`TieuLenh server listening on http://localhost:${env.port}`);
});
