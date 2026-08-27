'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import type { HostMessage, VoterMessage } from '@/lib/types';
import { getSignalConfig } from '@/lib/signal-config';

interface HostTransportCallbacks {
  onConnection?: (connectionId: string) => void;
  onData?: (connectionId: string, data: VoterMessage) => void;
  onDisconnect?: (connectionId: string | null) => void;
}

export function useHostTransport(callbacks: HostTransportCallbacks) {
  // --- Refs for mutable state that must survive re-renders without triggering them ---
  const peerRef = useRef<any>(null); // Peer instance from peerjs
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const connDeviceMapRef = useRef<Map<string, string>>(new Map());
  const disconnectedPeersRef = useRef<Map<string, { disconnectedAt: number }>>(new Map());
  const deviceIdToPeerRef = useRef<Map<string, string>>(new Map());
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callbacks in a ref so event handlers always see the latest version
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // --- Reactive state for UI consumption ---
  const [connectionCount, setConnectionCount] = useState(0);
  const [disconnectedCount, setDisconnectedCount] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null);

  // --- Internal helpers ---

  const updateCounts = useCallback(() => {
    setConnectionCount(connectionsRef.current.size);
    setDisconnectedCount(disconnectedPeersRef.current.size);
  }, []);

  const setupConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      connectionsRef.current.set(conn.peer, conn);
      updateCounts();
      callbacksRef.current.onConnection?.(conn.peer);
    });

    conn.on('data', (rawData: unknown) => {
      if (typeof rawData !== 'object' || !rawData || !('type' in rawData)) return;
      const data = rawData as VoterMessage;

      // Heartbeat: respond to ping immediately
      if (data.type === 'ping') {
        try { conn.send({ type: 'pong' }); } catch { /* ignore send errors */ }
        return;
      }

      // Voter registration with persistent device ID + fingerprint
      if (data.type === 'register') {
        const devId = data.deviceId;
        if (devId) {
          connDeviceMapRef.current.set(conn.peer, devId);
          // If this device was previously connected with a different peer ID,
          // clean up the old connection entry
          const oldPeer = deviceIdToPeerRef.current.get(devId);
          if (oldPeer && oldPeer !== conn.peer) {
            connectionsRef.current.delete(oldPeer);
          }
          deviceIdToPeerRef.current.set(devId, conn.peer);
          disconnectedPeersRef.current.delete(devId);
        }
        updateCounts();
        callbacksRef.current.onConnection?.(conn.peer);
      }

      callbacksRef.current.onData?.(conn.peer, data);
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      const devId = connDeviceMapRef.current.get(conn.peer);
      if (devId) {
        disconnectedPeersRef.current.set(devId, { disconnectedAt: Date.now() });
      }
      updateCounts();
      callbacksRef.current.onDisconnect?.(conn.peer);
    });
  }, [updateCounts]);

  // --- Public methods ---

  /**
   * Initialize the PeerJS host. Dynamically imports PeerJS.
   * Returns the assigned peer ID on success.
   */
  const init = useCallback(async (): Promise<string> => {
    const { Peer } = await import('peerjs');
    const signalConfig = getSignalConfig();

    return new Promise((resolve, reject) => {
      let peerIdRetries = 0;
      const maxPeerIdRetries = 3;
      let settled = false;

      function createPeer() {
        const id = 'drk-' + Math.random().toString(36).substring(2, 18);
        const peerOptions = signalConfig ? {
          host: signalConfig.host,
          ...(signalConfig.port !== undefined ? { port: signalConfig.port } : {}),
          path: signalConfig.path,
          secure: signalConfig.secure,
        } : {};
        const peer = new Peer(id, peerOptions);
        peerRef.current = peer;

        peer.on('open', (openId: string) => {
          // Start periodic cleanup of disconnected peers (remove after 60s);
          // clear any interval left over from a previous init first
          if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
          cleanupIntervalRef.current = setInterval(() => {
            const now = Date.now();
            disconnectedPeersRef.current.forEach((info, devId) => {
              if (now - info.disconnectedAt > 60000) {
                disconnectedPeersRef.current.delete(devId);
                updateCounts();
                callbacksRef.current.onDisconnect?.(null);
              }
            });
          }, 15000);

          settled = true;
          setPeerId(openId);
          resolve(openId);
        });

        peer.on('connection', (conn: DataConnection) => {
          setupConnection(conn);
        });

        peer.on('error', (err: { type?: string }) => {
          // After successful init, PeerJS also emits non-fatal errors (e.g.
          // peer-unavailable); those must not tear down the live transport
          // or its cleanup interval.
          if (settled) return;
          if (err.type === 'unavailable-id') {
            peerIdRetries++;
            if (peerIdRetries <= maxPeerIdRetries) {
              peer.destroy();
              createPeer();
            } else {
              reject(new Error('Peer-ID-Kollision nach ' + maxPeerIdRetries + ' Versuchen.'));
            }
          } else {
            reject(err);
          }
        });
      }

      createPeer();
    });
  }, [setupConnection, updateCounts]);

  /**
   * Broadcast a message to all connected voters.
   */
  const broadcast = useCallback((msg: HostMessage) => {
    connectionsRef.current.forEach((conn) => {
      try { conn.send(msg); } catch { /* ignore send errors */ }
    });
  }, []);

  /**
   * Send a message to a specific voter by connection ID.
   */
  const sendTo = useCallback((connectionId: string, msg: HostMessage) => {
    const conn = connectionsRef.current.get(connectionId);
    if (conn) {
      try { conn.send(msg); } catch { /* ignore send errors */ }
    }
  }, []);

  /**
   * Destroy the peer, clear all intervals, and reset all state.
   */
  const destroy = useCallback(() => {
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionsRef.current.clear();
    connDeviceMapRef.current.clear();
    disconnectedPeersRef.current.clear();
    deviceIdToPeerRef.current.clear();
    setPeerId(null);
    setConnectionCount(0);
    setDisconnectedCount(0);
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => { destroy(); };
  }, [destroy]);

  return {
    init,
    broadcast,
    sendTo,
    destroy,
    peerId,
    connectionCount,
    disconnectedCount,
  };
}
