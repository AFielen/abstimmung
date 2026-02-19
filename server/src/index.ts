import http from 'http';
import { ExpressPeerServer } from 'peer';
import { WebSocketRelay } from './ws-relay';

const PORT = parseInt(process.env.PORT || '9000', 10);

// Create HTTP server with CORS support
const server = http.createServer((req, res) => {
  // CORS headers for cross-origin access (Cloudflare Tunnel etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Mount PeerJS signaling server
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

// Mount WebSocket relay for server mode
const wsRelay = new WebSocketRelay(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signal server listening on port ${PORT}`);
  console.log(`  PeerJS signaling: /peerjs (path: /)`);
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
