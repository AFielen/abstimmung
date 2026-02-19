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

export class WebSocketRelay {
  private wss: WebSocketServer;
  private rooms = new Map<string, Room>();
  private cleanupTimer: NodeJS.Timeout;
  private connCounter = 0;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
    this.wss.on('connection', (ws) => this.handleConnection(ws));
    this.wss.on('error', (err) => {
      console.error('[WS Relay] Server error:', err.message);
    });
    this.cleanupTimer = setInterval(() => this.cleanupStaleRooms(), CLEANUP_INTERVAL_MS);
    console.log('[WS Relay] Initialized on /ws');
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

  private handleConnection(ws: WebSocket) {
    let member: RoomMember | null = null;
    let room: Room | null = null;

    ws.on('error', (err) => {
      console.error('[WS Relay] WebSocket error:', err.message);
    });

    ws.on('message', (raw) => {
      let msg: ServerInbound;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.send(ws, { type: 'error', message: 'Invalid JSON' });
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
          room.lastActivity = Date.now();
          room.voters.forEach((voter) => {
            this.send(voter.ws, { type: 'host-data', data: msg.data });
          });
          break;
        }

        case 'host-msg-to': {
          if (!room || !member || member.role !== 'host') return;
          room.lastActivity = Date.now();
          const voter = room.voters.get(msg.connectionId);
          if (voter) {
            this.send(voter.ws, { type: 'host-data', data: msg.data });
          }
          break;
        }

        case 'voter-msg': {
          if (!room || !member || member.role !== 'voter') return;
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
