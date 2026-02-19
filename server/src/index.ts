import http from 'http';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { WebSocketRelay } from './ws-relay';

const PORT = parseInt(process.env.PORT || '9000', 10);

// Create Express app
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Create HTTP server from Express app
const server = http.createServer(app);

// Mount PeerJS signaling server
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: false,
} as any);

// Critical: mount PeerJS middleware so it can handle HTTP requests and WebSocket upgrades
app.use(peerServer);

peerServer.on('connection', (client: any) => {
  console.log(`[PeerJS] Client connected: ${client.getId()}`);
});
peerServer.on('disconnect', (client: any) => {
  console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
});

// Mount WebSocket relay for server mode
const wsRelay = new WebSocketRelay(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signal server listening on port ${PORT}`);
  console.log(`  PeerJS signaling: /peerjs`);
  console.log(`  WebSocket relay:  /ws`);
  console.log(`  Health check:     /health`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down...');
  wsRelay.shutdown();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
