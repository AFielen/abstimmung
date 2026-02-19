import express from 'express';
import http from 'http';
import { ExpressPeerServer } from 'peer';
import { WebSocketRelay } from './ws-relay';

const PORT = parseInt(process.env.PORT || '9000', 10);

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: false,
} as any);

peerServer.on('connection', (client: any) => {
  console.log(`[PeerJS] Client connected: ${client.getId()}`);
});
peerServer.on('disconnect', (client: any) => {
  console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
});

app.use('/', peerServer);

const wsRelay = new WebSocketRelay(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signal server listening on port ${PORT}`);
  console.log(`  PeerJS signaling: /peerjs`);
  console.log(`  WebSocket relay:  /ws`);
  console.log(`  Health check:     /health`);
});

const gracefulShutdown = () => {
  console.log('Shutting down...');
  wsRelay.shutdown();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
