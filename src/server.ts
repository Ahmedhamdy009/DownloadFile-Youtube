import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import downloadRoutes from './routes/downloadRoutes';
import { startCleanupJob } from './services/cleanup';

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store io instance on app context to access in controllers
app.set('io', io);

// Security & Utility Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP constraints to load CDNs (Fonts, Icons) smoothly
  crossOriginResourcePolicy: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API routes
app.use('/api', downloadRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  // Clients join a room matching their download ID to receive progress updates
  socket.on('join', (downloadId: string) => {
    socket.join(downloadId);
    console.log(`Client ${socket.id} joined room: ${downloadId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Fallback: Send index.html for unknown routes to support client-side routing if any
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start background cleanup daemon
startCleanupJob();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Premium YouTube Downloader Server running on port ${PORT}`);
  console.log(`🌐 Local interface: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
