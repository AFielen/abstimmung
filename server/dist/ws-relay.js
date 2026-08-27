"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketRelay = void 0;
exports.parseMaxConnectionsPerIp = parseMaxConnectionsPerIp;
exports.maxMessagesPerSecond = maxMessagesPerSecond;
exports.validateDataPayload = validateDataPayload;
const ws_1 = require("ws");
const ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_ROOMS = 100;
const MAX_VOTERS_PER_ROOM = 300;
// Per-IP connection cap. Assemblies frequently place many devices behind a
// single NAT/router (venue WiFi), so a low cap would lock out legitimate
// voters. The default is generous while still bounding abuse; override via
// the WS_MAX_CONNECTIONS_PER_IP env var.
const DEFAULT_MAX_CONNECTIONS_PER_IP = 200;
function parseMaxConnectionsPerIp(raw) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0)
        return n;
    return DEFAULT_MAX_CONNECTIONS_PER_IP;
}
const MAX_CONNECTIONS_PER_IP = parseMaxConnectionsPerIp(process.env.WS_MAX_CONNECTIONS_PER_IP);
// Rate-limit per WS connection (sliding 1-second window).
const MAX_MESSAGES_PER_SECOND = 20;
// The host answers up to one pong per voter per heartbeat interval; after a
// mass (re)connect all voters may ping within the same second, so the host
// ceiling must cover a full room plus timer ticks and control messages.
function maxMessagesPerSecond(role) {
    return role === 'host' ? MAX_MESSAGES_PER_SECOND + MAX_VOTERS_PER_ROOM : MAX_MESSAGES_PER_SECOND;
}
// Bounds for the application payload inside `host-msg` / `host-msg-to` / `voter-msg`.
// The wrapper itself is already capped by `maxPayload` (64 KB) on the ws server.
const MAX_DATA_STRING_LENGTH = 1024;
const MAX_DATA_KEYS = 32;
const MAX_DATA_DEPTH = 4;
function validateDataPayload(data, depth = 0) {
    if (depth > MAX_DATA_DEPTH)
        return false;
    if (data === null)
        return true;
    const t = typeof data;
    if (t === 'string')
        return data.length <= MAX_DATA_STRING_LENGTH;
    if (t === 'number' || t === 'boolean')
        return true;
    if (Array.isArray(data)) {
        if (data.length > MAX_DATA_KEYS)
            return false;
        return data.every((v) => validateDataPayload(v, depth + 1));
    }
    if (t === 'object') {
        const obj = data;
        const keys = Object.keys(obj);
        if (keys.length > MAX_DATA_KEYS)
            return false;
        for (const k of keys) {
            if (k.length > MAX_DATA_STRING_LENGTH)
                return false;
            if (!validateDataPayload(obj[k], depth + 1))
                return false;
        }
        return true;
    }
    return false;
}
class WebSocketRelay {
    constructor() {
        this.rooms = new Map();
        this.connCounter = 0;
        this.connsPerIp = new Map();
        this.wss = new ws_1.WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });
        this.wss.on('error', (err) => {
            console.error('[WS Relay] Server error:', err.message);
        });
        this.cleanupTimer = setInterval(() => this.cleanupStaleRooms(), CLEANUP_INTERVAL_MS);
        console.log('[WS Relay] Initialized');
    }
    clientIp(request) {
        const fwd = request.headers['x-forwarded-for'];
        if (typeof fwd === 'string' && fwd.length > 0) {
            return fwd.split(',')[0].trim();
        }
        return request.socket.remoteAddress || 'unknown';
    }
    handleUpgrade(request, socket, head) {
        const ip = this.clientIp(request);
        const current = this.connsPerIp.get(ip) || 0;
        if (current >= MAX_CONNECTIONS_PER_IP) {
            console.warn(`[WS Relay] Rejected upgrade from ${ip}: per-IP cap reached (${current})`);
            const s = socket;
            s.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
            s.destroy();
            return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }
    generateRoomId() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        for (let attempt = 0; attempt < 100; attempt++) {
            let id = '';
            for (let i = 0; i < 6; i++) {
                id += chars[Math.floor(Math.random() * chars.length)];
            }
            if (!this.rooms.has(id))
                return id;
        }
        throw new Error('Failed to generate unique room ID');
    }
    generateConnId() {
        return `conn-${++this.connCounter}`;
    }
    handleConnection(ws, request) {
        let member = null;
        let room = null;
        const ip = this.clientIp(request);
        this.connsPerIp.set(ip, (this.connsPerIp.get(ip) || 0) + 1);
        // Sliding 1-second window for message rate limiting
        let windowStart = Date.now();
        let windowCount = 0;
        ws.on('error', (err) => {
            console.error('[WS Relay] WebSocket error:', err.message);
        });
        ws.on('message', (raw) => {
            const now = Date.now();
            if (now - windowStart >= 1000) {
                windowStart = now;
                windowCount = 0;
            }
            windowCount++;
            if (windowCount > maxMessagesPerSecond(member?.role ?? null)) {
                console.warn(`[WS Relay] Rate limit exceeded for ${ip}, closing connection`);
                this.send(ws, { type: 'error', message: 'Rate limit exceeded' });
                ws.close();
                return;
            }
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            }
            catch {
                this.send(ws, { type: 'error', message: 'Invalid JSON' });
                return;
            }
            if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
                this.send(ws, { type: 'error', message: 'Invalid message' });
                return;
            }
            switch (msg.type) {
                case 'create-room': {
                    if (member || room) {
                        this.send(ws, { type: 'error', message: 'Already in a room' });
                        return;
                    }
                    if (this.rooms.size >= MAX_ROOMS) {
                        this.send(ws, { type: 'error', message: 'Server at capacity' });
                        return;
                    }
                    const roomId = this.generateRoomId();
                    const connId = this.generateConnId();
                    member = { ws, id: connId, role: 'host' };
                    room = {
                        id: roomId,
                        host: member,
                        voters: new Map(),
                        createdAt: Date.now(),
                        lastActivity: Date.now(),
                    };
                    this.rooms.set(roomId, room);
                    this.send(ws, { type: 'room-created', roomId });
                    console.log(`[WS Relay] Room created: ${roomId}`);
                    break;
                }
                case 'join-room': {
                    if (member || room) {
                        this.send(ws, { type: 'error', message: 'Already in a room' });
                        return;
                    }
                    const targetRoom = this.rooms.get(msg.roomId);
                    if (!targetRoom || !targetRoom.host) {
                        this.send(ws, { type: 'error', message: 'Room not found' });
                        return;
                    }
                    if (targetRoom.voters.size >= MAX_VOTERS_PER_ROOM) {
                        this.send(ws, { type: 'error', message: 'Room is full' });
                        return;
                    }
                    const connId = this.generateConnId();
                    member = { ws, id: connId, role: 'voter' };
                    room = targetRoom;
                    room.voters.set(connId, member);
                    room.lastActivity = Date.now();
                    this.send(ws, { type: 'room-joined', connectionId: connId });
                    if (room.host) {
                        this.send(room.host.ws, { type: 'voter-connected', connectionId: connId });
                    }
                    console.log(`[WS Relay] Voter ${connId} joined room ${msg.roomId} (${room.voters.size} voters)`);
                    break;
                }
                case 'host-msg': {
                    if (!room || !member || member.role !== 'host')
                        return;
                    if (!validateDataPayload(msg.data)) {
                        this.send(ws, { type: 'error', message: 'Invalid data payload' });
                        return;
                    }
                    room.lastActivity = Date.now();
                    const raw = JSON.stringify({ type: 'host-data', data: msg.data });
                    room.voters.forEach((voter) => {
                        this.sendRaw(voter.ws, raw);
                    });
                    break;
                }
                case 'host-msg-to': {
                    if (!room || !member || member.role !== 'host')
                        return;
                    if (typeof msg.connectionId !== 'string' || msg.connectionId.length > 64)
                        return;
                    if (!validateDataPayload(msg.data)) {
                        this.send(ws, { type: 'error', message: 'Invalid data payload' });
                        return;
                    }
                    room.lastActivity = Date.now();
                    const voter = room.voters.get(msg.connectionId);
                    if (voter) {
                        this.send(voter.ws, { type: 'host-data', data: msg.data });
                    }
                    break;
                }
                case 'voter-msg': {
                    if (!room || !member || member.role !== 'voter')
                        return;
                    if (!validateDataPayload(msg.data)) {
                        this.send(ws, { type: 'error', message: 'Invalid data payload' });
                        return;
                    }
                    room.lastActivity = Date.now();
                    if (room.host) {
                        this.send(room.host.ws, {
                            type: 'voter-data',
                            connectionId: member.id,
                            data: msg.data,
                        });
                    }
                    break;
                }
            }
        });
        ws.on('close', () => {
            const remaining = (this.connsPerIp.get(ip) || 1) - 1;
            if (remaining <= 0) {
                this.connsPerIp.delete(ip);
            }
            else {
                this.connsPerIp.set(ip, remaining);
            }
            if (!room || !member)
                return;
            if (member.role === 'host') {
                console.log(`[WS Relay] Host disconnected, closing room ${room.id}`);
                const raw = JSON.stringify({ type: 'error', message: 'Host disconnected' });
                room.voters.forEach((voter) => {
                    this.sendRaw(voter.ws, raw);
                    voter.ws.close();
                });
                this.rooms.delete(room.id);
            }
            else {
                console.log(`[WS Relay] Voter ${member.id} disconnected from room ${room.id}`);
                room.voters.delete(member.id);
                if (room.host) {
                    this.send(room.host.ws, { type: 'voter-disconnected', connectionId: member.id });
                }
            }
        });
    }
    // Pre-serialized variant so fan-outs to a whole room stringify only once.
    sendRaw(ws, raw) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            try {
                ws.send(raw);
            }
            catch (err) {
                console.error('[WS Relay] send error:', err.message);
            }
        }
    }
    send(ws, msg) {
        this.sendRaw(ws, JSON.stringify(msg));
    }
    cleanupStaleRooms() {
        const now = Date.now();
        this.rooms.forEach((room, id) => {
            if (now - room.lastActivity > ROOM_TTL_MS) {
                console.log(`[WS Relay] Cleaning up stale room: ${id}`);
                const raw = JSON.stringify({ type: 'error', message: 'Room expired' });
                room.voters.forEach((voter) => {
                    this.sendRaw(voter.ws, raw);
                    voter.ws.close();
                });
                if (room.host) {
                    this.sendRaw(room.host.ws, raw);
                    room.host.ws.close();
                }
                this.rooms.delete(id);
            }
        });
    }
    shutdown() {
        clearInterval(this.cleanupTimer);
        this.rooms.forEach((room) => {
            room.voters.forEach((v) => v.ws.close());
            if (room.host)
                room.host.ws.close();
        });
        this.wss.close();
    }
}
exports.WebSocketRelay = WebSocketRelay;
