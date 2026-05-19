"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const peer_1 = require("peer");
const ws_1 = require("ws");
const ws_relay_1 = require("./ws-relay");
const PORT = parseInt(process.env.PORT || '9000', 10);
// Origins allowed to talk to this signal server (comma-separated).
// Default: the production app + localhost for dev. Set ALLOWED_ORIGINS to "*"
// to disable the check (NOT recommended in production).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://drk-abstimmung.de,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const ALLOW_ANY_ORIGIN = ALLOWED_ORIGINS.includes('*');
function isAllowedOrigin(origin) {
    if (ALLOW_ANY_ORIGIN)
        return true;
    if (!origin)
        return false;
    return ALLOWED_ORIGINS.includes(origin);
}
const app = (0, express_1.default)();
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOW_ANY_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    else if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
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
const server = http_1.default.createServer(app);
// Use createWebSocketServer to prevent PeerJS from auto-registering an upgrade
// handler on the main server (which would destroy non-/peerjs sockets like /ws).
let peerWss;
const peerServer = (0, peer_1.ExpressPeerServer)(server, {
    path: '/',
    allow_discovery: false,
    createWebSocketServer: () => {
        peerWss = new ws_1.WebSocketServer({ noServer: true });
        return peerWss;
    },
});
peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Client connected: ${client.getId()}`);
});
peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
});
app.use('/', peerServer);
const wsRelay = new ws_relay_1.WebSocketRelay();
// Single unified upgrade handler — routes WebSocket upgrades to the right handler
server.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    if (!isAllowedOrigin(origin)) {
        console.warn(`[upgrade] Rejected WS upgrade from origin: ${origin || '(none)'}`);
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
    }
    const { pathname } = new URL(request.url || '', 'http://d');
    if (pathname === '/ws') {
        wsRelay.handleUpgrade(request, socket, head);
    }
    else if (pathname.startsWith('/peerjs')) {
        peerWss.handleUpgrade(request, socket, head, (ws) => {
            peerWss.emit('connection', ws, request);
        });
    }
    else {
        socket.destroy();
    }
});
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Signal server listening on port ${PORT}`);
    console.log(`  PeerJS signaling: /peerjs`);
    console.log(`  WebSocket relay:  /ws`);
    console.log(`  Health check:     /health`);
    console.log(`  Allowed origins:  ${ALLOW_ANY_ORIGIN ? '* (any)' : ALLOWED_ORIGINS.join(', ')}`);
});
const gracefulShutdown = () => {
    console.log('Shutting down...');
    wsRelay.shutdown();
    server.close(() => process.exit(0));
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
