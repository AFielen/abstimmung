'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { HostMessage, VoterMessage } from '@/lib/types';
import { getWsRelayUrl } from '@/lib/signal-config';

interface ServerHostTransportCallbacks {
  onConnection?: (connectionId: string) => void;
  onData?: (connectionId: string, data: VoterMessage) => void;
  onDisconnect?: (connectionId: string | null) => void;
}

export function useServerHostTransport(callbacks: ServerHostTransportCallbacks) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const connDeviceMapRef = useRef<Map<string, string>>(new Map());
  const voterConnectionsRef = useRef<Set<string>>(new Set());
  const disconnectedVotersRef = useRef<Map<string, { disconnectedAt: number }>>(new Map());
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connectionCount, setConnectionCount] = useState(0);
  const [disconnectedCount, setDisconnectedCount] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null); // roomId

  const updateCounts = useCallback(() => {
    setConnectionCount(voterConnectionsRef.current.size);
    setDisconnectedCount(disconnectedVotersRef.current.size);
  }, []);

  const sendTo = useCallback((connectionId: string, msg: HostMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host-msg-to',
        connectionId,
        data: msg,
      }));
    }
  }, []);

  const init = useCallback(async (): Promise<string> => {
    // Clean up any previous state
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWsRelayUrl();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'create-room' }));
      };

      let resolved = false;

      ws.onclose = () => {
        if (resolved) {
          // Connection lost after init — host is disconnected
          console.warn('[WS Host] Connection lost to signal server');
        }
      };

      ws.onmessage = (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }

        switch (msg.type) {
          case 'room-created':
            setPeerId(msg.roomId);
            // Start cleanup interval
            if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
            cleanupIntervalRef.current = setInterval(() => {
              const now = Date.now();
              const toDelete: string[] = [];
              disconnectedVotersRef.current.forEach((info, connId) => {
                if (now - info.disconnectedAt > 60000) {
                  toDelete.push(connId);
                }
              });
              if (toDelete.length > 0) {
                toDelete.forEach(connId => disconnectedVotersRef.current.delete(connId));
                updateCounts();
                callbacksRef.current.onDisconnect?.(null);
              }
            }, 15000);
            resolved = true;
            resolve(msg.roomId);
            break;

          case 'voter-connected':
            voterConnectionsRef.current.add(msg.connectionId);
            disconnectedVotersRef.current.delete(msg.connectionId);
            updateCounts();
            callbacksRef.current.onConnection?.(msg.connectionId);
            break;

          case 'voter-disconnected':
            voterConnectionsRef.current.delete(msg.connectionId);
            disconnectedVotersRef.current.set(msg.connectionId, {
              disconnectedAt: Date.now(),
            });
            updateCounts();
            callbacksRef.current.onDisconnect?.(msg.connectionId);
            break;

          case 'voter-data': {
            if (typeof msg.data !== 'object' || !msg.data || !('type' in msg.data)) break;
            const voterMsg = msg.data as VoterMessage;

            // Handle ping internally
            if (voterMsg.type === 'ping') {
              sendTo(msg.connectionId, { type: 'pong' });
              break;
            }

            // Handle register: track device mapping
            if (voterMsg.type === 'register') {
              if (voterMsg.deviceId) {
                connDeviceMapRef.current.set(msg.connectionId, voterMsg.deviceId);
              }
              if (voterMsg.fingerprintId) {
                connDeviceMapRef.current.set(msg.connectionId + ':fp', voterMsg.fingerprintId);
              }
              updateCounts();
              callbacksRef.current.onConnection?.(msg.connectionId);
            }

            callbacksRef.current.onData?.(msg.connectionId, voterMsg);
            break;
          }

          case 'error':
            console.error('[WS Host]', msg.message);
            if (!resolved) {
              resolved = true;
              reject(new Error(msg.message));
            }
            break;
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('WebSocket-Verbindung zum Signal-Server fehlgeschlagen'));
        }
      };
    });
  }, [updateCounts, sendTo]);

  const broadcast = useCallback((msg: HostMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host-msg', data: msg }));
    }
  }, []);

  const getConnDeviceMap = useCallback(() => connDeviceMapRef.current, []);

  const destroy = useCallback(() => {
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    voterConnectionsRef.current.clear();
    connDeviceMapRef.current.clear();
    disconnectedVotersRef.current.clear();
    setPeerId(null);
    setConnectionCount(0);
    setDisconnectedCount(0);
  }, []);

  useEffect(() => {
    return () => { destroy(); };
  }, [destroy]);

  return {
    init,
    broadcast,
    sendTo,
    getConnDeviceMap,
    destroy,
    peerId,
    connectionCount,
    disconnectedCount,
  };
}
