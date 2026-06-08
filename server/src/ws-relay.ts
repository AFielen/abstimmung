import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface RoomMember {
  ws: WebSocket;
  id: string;
  role: 'host' | 'voter';
}

interface Room {
  id: string;
  host: RoomMember | null;
  voters: Map<string, RoomMember>;
  createdAt: number;
  lastActivity: number;
}

// Wire protocol (JSON over WebSocket)
type ServerInbound =
  | { type: 'create-room' }
  | { type: 'join-room'; roomId: string }
  | { type: 'host-msg'; data: unknown }
  | { type: 'host-msg-to'; connectionId: string; data: unknown }
  | { type: 'voter-msg'; data: unknown };

type ServerOutbound =
  | { type: 'room-created'; roomId: string }
  | { type: 'room-joined'; connectionId: string }
  | { type: 'voter-connected'; connectionId: string }
  | { type: 'voter-disconnected'; connectionId: string }
  | { type: 'host-data'; data: unknown }
  | { type: 'voter-data'; connectionId: string; data: unknown }
  | { type: 'error'; message: string };

const ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity
const CLEANUP_INTERVAL_MS = 60 * 1000;

const MAX_ROOMS = 100;
const MAX_VOTERS_PER_ROOM = 300;

// Per-IP connection cap. Assemblies frequently place many devices behind a
// single NAT/router (venue WiFi), so a low cap would lock out legitimate
// voters. The default is generous while still bounding abuse; override via
// the WS_MAX_CONNECTIONS_PER_IP env var.
const DEFAULT_MAX_CONNECTIONS_PER_IP = 200;

export function parseMaxConnectionsPerIp(raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  return DEFAULT_MAX_CONNECTIONS_PER_IP;
}

const MAX_CONNECTIONS_PER_IP = parseMaxConnectionsPerIp(process.env.WS_MAX_CONNECTIONS_PER_IP);

// Rate-limit per WS connection (sliding 1-second window).
const MAX_MESSAGES_PER_SECOND = 20;

// Bounds for the application payload inside `host-msg` / `host-msg-to` / `voter-msg`.
// The wrapper itself is already capped by `maxPayload` (64 KB) on the ws server.
const MAX_DATA_STRING_LENGTH = 1024;
const MAX_DATA_KEYS = 32;
const MAX_DATA_DEPTH = 4;

export function validateDataPayload(data: unknown, depth = 0): boolean {
  if (depth > MAX_DATA_DEPTH) return false;
  if (data === null) return true;
  const t = typeof data;
  if (t === 'string') return (data as string).length <= MAX_DATA_STRING_LENGTH;
  if (t === 'number' || t === 'boolean') return true;
  if (Array.isArray(data)) {
    if (data.length > MAX_DATA_KEYS) return false;
    return data.every((v) => validateDataPayload(v, depth + 1));
  }
  if (t === 'object') {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length > MAX_DATA_KEYS) return false;
    for (const k of keys) {
      if (k.length > MAX_DATA_STRING_LENGTH) return false;
      if (!validateDataPayload(obj[k], depth + 1)) return false;
    }
    return true;
  }
  return false;
}

export class WebSocketRelay {
  private wss: WebSocketServer;
  private rooms = new Map<string, Room>();
  private cleanupTimer: NodeJS.Timeout;
  private connCounter = 0;
  private connsPerIp = new Map<string, number>();

  constructor() {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
    this.wss.on('connection', (ws, request: http.IncomingMessage) => {
      this.handleConnection(ws, request);
    });
    this.wss.on('error', (err) => {
      console.error('[WS Relay] Server error:', err.message);
    });
    this.cleanupTimer = setInterval(() => this.cleanupStaleRooms(), CLEANUP_INTERVAL_MS);
    console.log('[WS Relay] Initialized');
  }

  private clientIp(request: http.IncomingMessage): string {
    const fwd = request.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
      return fwd.split(',')[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
  }

  handleUpgrade(request: http.IncomingMessage, socket: unknown, head: Buffer) {
    const ip = this.clientIp(request);
    const current = this.connsPerIp.get(ip) || 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
      console.warn(`[WS Relay] Rejected upgrade from ${ip}: per-IP cap reached (${current})`);
      const s = socket as { write: (data: string) => void; destroy: () => void };
      s.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
      s.destroy();
      return;
    }
    this.wss.handleUpgrade(request, socket as never, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 100; attempt++) {
      let id = '';
      for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
      if (!this.rooms.has(id)) return id;
    }
    throw new Error('Failed to generate unique room ID');
  }

  private generateConnId(): string {
    return `conn-${++this.connCounter}`;
  }

  private handleConnection(ws: WebSocket, request: http.IncomingMessage) {
    let member: RoomMember | null = null;
    let room: Room | null = null;

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
      if (windowCount > MAX_MESSAGES_PER_SECOND) {
        console.warn(`[WS Relay] Rate limit exceeded for ${ip}, closing connection`);
        this.send(ws, { type: 'error', message: 'Rate limit exceeded' });
        ws.close();
        return;
      }

      let msg: ServerInbound;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      if (!msg || typeof msg !== 'object' || typeof (msg as { type?: unknown }).type !== 'string') {
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
          if (!room || !member || member.role !== 'host') return;
          if (!validateDataPayload(msg.data)) {
            this.send(ws, { type: 'error', message: 'Invalid data payload' });
            return;
          }
          room.lastActivity = Date.now();
          room.voters.forEach((voter) => {
            this.send(voter.ws, { type: 'host-data', data: msg.data });
          });
          break;
        }

        case 'host-msg-to': {
          if (!room || !member || member.role !== 'host') return;
          if (typeof msg.connectionId !== 'string' || msg.connectionId.length > 64) return;
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
          if (!room || !member || member.role !== 'voter') return;
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
      } else {
        this.connsPerIp.set(ip, remaining);
      }

      if (!room || !member) return;
      if (member.role === 'host') {
        console.log(`[WS Relay] Host disconnected, closing room ${room.id}`);
        room.voters.forEach((voter) => {
          this.send(voter.ws, { type: 'error', message: 'Host disconnected' });
          voter.ws.close();
        });
        this.rooms.delete(room.id);
      } else {
        console.log(`[WS Relay] Voter ${member.id} disconnected from room ${room.id}`);
        room.voters.delete(member.id);
        if (room.host) {
          this.send(room.host.ws, { type: 'voter-disconnected', connectionId: member.id });
        }
      }
    });
  }

  private send(ws: WebSocket, msg: ServerOutbound) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error('[WS Relay] send error:', (err as Error).message);
      }
    }
  }

  private cleanupStaleRooms() {
    const now = Date.now();
    this.rooms.forEach((room, id) => {
      if (now - room.lastActivity > ROOM_TTL_MS) {
        console.log(`[WS Relay] Cleaning up stale room: ${id}`);
        room.voters.forEach((voter) => {
          this.send(voter.ws, { type: 'error', message: 'Room expired' });
          voter.ws.close();
        });
        if (room.host) {
          this.send(room.host.ws, { type: 'error', message: 'Room expired' });
          room.host.ws.close();
        }
        this.rooms.delete(id);
      }
    });
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  shutdown() {
    clearInterval(this.cleanupTimer);
    this.rooms.forEach((room) => {
      room.voters.forEach((v) => v.ws.close());
      if (room.host) room.host.ws.close();
    });
    this.wss.close();
  }
}
