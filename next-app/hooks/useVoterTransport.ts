'use client';
import { useRef, useCallback, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import type { HostMessage, VoterMessage } from '@/lib/types';
import { getSignalConfig } from '@/lib/signal-config';

interface VoterTransportCallbacks {
  onData?: (data: HostMessage) => void;
  onConnected?: () => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onReconnectFailed?: () => void;
}

const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 20000];
const HEARTBEAT_INTERVAL_MS = 15000;
const RECONNECT_PEER_WAIT_MS = 2000;
const CONNECTION_TIMEOUT_MS = 8000;

/** Helper: create a PeerJS Peer with own signaling server config */
async function createPeerInstance(id?: string) {
  const { Peer } = await import('peerjs');
  const signalConfig = getSignalConfig();
  const opts = signalConfig ? {
    host: signalConfig.host,
    port: signalConfig.port,
    path: signalConfig.path,
    secure: signalConfig.secure,
  } : {};
  return id ? new Peer(id, opts) : new Peer(opts);
}

export function useVoterTransport(callbacks: VoterTransportCallbacks) {
  // --- Refs for mutable state ---
  const peerRef = useRef<any>(null); // Peer instance from peerjs
  const connRef = useRef<DataConnection | null>(null);
  const presenterPeerIdRef = useRef<string | null>(null);
  const sessionEndedRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const reconnAttemptRef = useRef(0);
  const reconnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callbacks in a ref so event handlers always see the latest version
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // --- Internal helpers ---

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (connRef.current && connRef.current.open) {
        try { connRef.current.send({ type: 'ping' } as VoterMessage); } catch { /* ignore */ }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopHeartbeat]);

  const setupDataHandler = useCallback((c: DataConnection) => {
    c.on('data', (rawData: unknown) => {
      if (typeof rawData !== 'object' || !rawData || !('type' in rawData)) return;
      const data = rawData as HostMessage;
      // Filter out heartbeat pong responses
      if (data.type === 'pong') return;
      callbacksRef.current.onData?.(data);
    });
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const onConnectionEstablished = useCallback(() => {
    isReconnectingRef.current = false;
    reconnAttemptRef.current = 0;
    clearConnectionTimeout();
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
    startHeartbeat();
    callbacksRef.current.onConnected?.();
  }, [startHeartbeat, clearConnectionTimeout]);

  // Forward declarations via refs for mutual recursion between
  // onConnectionLost -> startReconnect -> attemptReconnect -> doConnect -> onConnectionLost
  const startReconnectRef = useRef<() => void>(() => {});
  const attemptReconnectRef = useRef<() => void>(() => {});
  const doConnectRef = useRef<() => void>(() => {});

  const onConnectionLost = useCallback(() => {
    stopHeartbeat();
    clearConnectionTimeout();
    if (sessionEndedRef.current) return;
    connRef.current = null;
    startReconnectRef.current();
  }, [stopHeartbeat, clearConnectionTimeout]);

  // doConnect: attempt to connect to the presenter peer
  const doConnect = useCallback(() => {
    if (sessionEndedRef.current) return;
    clearConnectionTimeout();
    try {
      const c = peerRef.current.connect(presenterPeerIdRef.current!, { reliable: true });
      connRef.current = c;

      c.on('open', () => { onConnectionEstablished(); });
      setupDataHandler(c);
      c.on('close', () => { onConnectionLost(); });
      c.on('error', () => {
        if (!isReconnectingRef.current) onConnectionLost();
      });

      // Timeout: if connection doesn't open within 8 seconds during reconnect, retry
      connectionTimeoutRef.current = setTimeout(() => {
        if (connRef.current && !connRef.current.open && isReconnectingRef.current) {
          try { connRef.current.close(); } catch { /* ignore */ }
          attemptReconnectRef.current();
        }
      }, CONNECTION_TIMEOUT_MS);
    } catch {
      attemptReconnectRef.current();
    }
  }, [onConnectionEstablished, setupDataHandler, onConnectionLost, clearConnectionTimeout]);

  // attemptReconnect: try one reconnection attempt with delay
  const attemptReconnect = useCallback(() => {
    if (sessionEndedRef.current) return;
    if (reconnAttemptRef.current >= RECONNECT_MAX_ATTEMPTS) {
      isReconnectingRef.current = false;
      callbacksRef.current.onReconnectFailed?.();
      return;
    }

    const delay = RECONNECT_DELAYS[reconnAttemptRef.current] ?? 20000;
    reconnAttemptRef.current++;
    callbacksRef.current.onReconnecting?.(reconnAttemptRef.current, RECONNECT_MAX_ATTEMPTS);

    reconnTimerRef.current = setTimeout(() => {
      if (sessionEndedRef.current) return;

      if (!peerRef.current || peerRef.current.destroyed) {
        // Peer was destroyed, create a new one
        createPeerInstance().then((peer) => {
          if (sessionEndedRef.current) return;
          peerRef.current = peer;
          peer.on('open', () => { doConnectRef.current(); });
          peer.on('error', () => { attemptReconnectRef.current(); });
        }).catch(() => {
          attemptReconnectRef.current();
        });
      } else if (peerRef.current.disconnected) {
        // Peer is disconnected from signaling server, try to reconnect
        try {
          peerRef.current.reconnect();
          setTimeout(() => {
            if (sessionEndedRef.current) return;
            if (peerRef.current && peerRef.current.open) {
              doConnectRef.current();
            } else {
              // Reconnect to signaling server failed, create fresh peer
              createPeerInstance().then((peer) => {
                if (sessionEndedRef.current) return;
                peerRef.current = peer;
                peer.on('open', () => { doConnectRef.current(); });
                peer.on('error', () => { attemptReconnectRef.current(); });
              }).catch(() => {
                attemptReconnectRef.current();
              });
            }
          }, RECONNECT_PEER_WAIT_MS);
        } catch {
          // reconnect() threw, create fresh peer
          createPeerInstance().then((peer) => {
            if (sessionEndedRef.current) return;
            peerRef.current = peer;
            peer.on('open', () => { doConnectRef.current(); });
            peer.on('error', () => { attemptReconnectRef.current(); });
          }).catch(() => {
            attemptReconnectRef.current();
          });
        }
      } else {
        // Peer is connected to signaling server, just connect to presenter
        doConnectRef.current();
      }
    }, delay);
  }, []);

  // startReconnect: begin reconnection sequence
  const startReconnect = useCallback(() => {
    if (sessionEndedRef.current || isReconnectingRef.current) return;
    isReconnectingRef.current = true;
    reconnAttemptRef.current = 0;
    attemptReconnectRef.current();
  }, []);

  // Wire up the mutual-recursion refs
  useEffect(() => {
    startReconnectRef.current = startReconnect;
    attemptReconnectRef.current = attemptReconnect;
    doConnectRef.current = doConnect;
  }, [startReconnect, attemptReconnect, doConnect]);

  // --- Public methods ---

  /**
   * Initialize the voter transport. Dynamically imports PeerJS,
   * creates a Peer, and connects to the presenter's peer ID.
   */
  const init = useCallback(async (targetPeerId: string): Promise<void> => {
    presenterPeerIdRef.current = targetPeerId;
    sessionEndedRef.current = false;

    const peer = await createPeerInstance();

    return new Promise<void>((resolve, reject) => {
      peerRef.current = peer;

      peer.on('open', () => {
        const c = peer.connect(targetPeerId, { reliable: true });
        connRef.current = c;

        c.on('open', () => {
          onConnectionEstablished();
          resolve();
        });
        setupDataHandler(c);
        c.on('close', () => { onConnectionLost(); });
        c.on('error', () => {
          if (!isReconnectingRef.current) onConnectionLost();
        });
      });

      peer.on('error', (err: { type?: string }) => {
        if (sessionEndedRef.current) return;
        if (!isReconnectingRef.current) startReconnectRef.current();
      });
    });
  }, [onConnectionEstablished, setupDataHandler, onConnectionLost]);

  /**
   * Send a message to the host/presenter.
   */
  const send = useCallback((msg: VoterMessage) => {
    if (connRef.current && connRef.current.open) {
      try { connRef.current.send(msg); } catch { /* ignore */ }
    }
  }, []);

  /**
   * Mark the session as ended. Prevents further reconnection attempts.
   */
  const markSessionEnded = useCallback(() => {
    sessionEndedRef.current = true;
    stopHeartbeat();
    clearConnectionTimeout();
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
  }, [stopHeartbeat, clearConnectionTimeout]);

  /**
   * Manually trigger a reconnection attempt (e.g. from a "Retry" button).
   */
  const retryConnect = useCallback(() => {
    startReconnectRef.current();
  }, []);

  /**
   * Check if the connection is alive; if not, start reconnecting.
   * Useful to call on visibility change (tab becomes visible).
   */
  const checkConnection = useCallback(() => {
    if (!connRef.current || !connRef.current.open) {
      if (!isReconnectingRef.current) startReconnectRef.current();
    }
  }, []);

  /**
   * Destroy the peer, clear all timers, and prevent reconnection.
   */
  const destroy = useCallback(() => {
    sessionEndedRef.current = true;
    stopHeartbeat();
    clearConnectionTimeout();
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connRef.current = null;
  }, [stopHeartbeat, clearConnectionTimeout]);

  // --- Visibility change handler ---
  // When the browser tab becomes visible again, check the connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkConnection]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => { destroy(); };
  }, [destroy]);

  return {
    init,
    send,
    markSessionEnded,
    retryConnect,
    checkConnection,
    destroy,
  };
}
