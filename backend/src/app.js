import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pollRoutes, { initializePollCleanup } from './routes/polls.js';

const app = express();
const server = createServer(app);
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:3000", "http://localhost:3001"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const participants = new Map();

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Nishtha Resilient Live Polling Backend is live' });
});

app.get('/api/health', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const isConnected = mongoose.default.connection.readyState === 1;

    res.json({
      status: 'Server is running',
      database: isConnected ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'Server is running',
      database: 'Error checking connection',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/polls', pollRoutes);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  
  socket.on('join-poll', (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll room: ${pollId}`);
  });

  socket.on('leave-poll', (pollId) => {
    socket.leave(pollId);
    console.log(`User ${socket.id} left poll room: ${pollId}`);
  });

  
  socket.on('student-join', ({ studentId, studentName }) => {
    if (!studentId || !studentName) return;
    participants.set(socket.id, { studentId, studentName });
    io.emit('participants-updated', Array.from(participants.values()));
    console.log(`Student joined: ${studentName} (${studentId})`);
  });

  socket.on('student-leave', () => {
    if (participants.has(socket.id)) {
      participants.delete(socket.id);
      io.emit('participants-updated', Array.from(participants.values()));
    }
  });

 
  socket.on('kick-student', ({ studentId }) => {
    if (!studentId) return;

    for (const [socketId, participant] of participants.entries()) {
      if (participant.studentId === studentId) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.emit('kicked');
          targetSocket.disconnect(true);
        }
        participants.delete(socketId);
      }
    }

    io.emit('participants-updated', Array.from(participants.values()));
    console.log(`Kick requested for studentId=${studentId}`);
  });

  
  socket.on('chat-message', (payload) => {
    if (!payload || !payload.message) return;
    const timestamp = payload.timestamp || new Date().toISOString();
    io.emit('chat-message', { ...payload, timestamp });
  });

  socket.on('disconnect', () => {
    if (participants.has(socket.id)) {
      participants.delete(socket.id);
      io.emit('participants-updated', Array.from(participants.values()));
    }
    console.log('User disconnected:', socket.id);
  });
});

initializePollCleanup(io);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export { app, server, io };