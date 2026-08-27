'use client';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { hasMessageType, type HostMessage, type VoterMessage } from '@/lib/types';
import { getWsRelayUrl } from '@/lib/signal-config';

interface ServerVoterTransportCallbacks {
  onData?: (data: HostMessage) => void;
  onConnected?: () => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onReconnectFailed?: () => void;
}

const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 20000];
const HEARTBEAT_INTERVAL_MS = 15000;

export function useServerVoterTransport(callbacks: ServerVoterTransportCallbacks) {
  const wsRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const sessionEndedRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const reconnAttemptRef = useRef(0);
  const reconnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Ref-based indirection to break circular useCallback dependencies
  const startReconnectRef = useRef<() => void>(() => {});

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'voter-msg',
          data: { type: 'ping' },
        }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopHeartbeat]);

  const connectWs = useCallback((roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (sessionEndedRef.current) { reject(new Error('Session ended')); return; }

      // Close any existing WebSocket before creating a new one
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = getWsRelayUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let resolved = false;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join-room', roomId }));
      };

      ws.onmessage = (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }

        switch (msg.type) {
          case 'room-joined':
            isReconnectingRef.current = false;
            reconnAttemptRef.current = 0;
            startHeartbeat();
            if (!resolved) {
              resolved = true;
              resolve();
            }
            callbacksRef.current.onConnected?.();
            break;

          case 'host-data':
            if (hasMessageType(msg.data)) {
              const hostMsg = msg.data as HostMessage;
              if (hostMsg.type === 'pong') return;
              callbacksRef.current.onData?.(hostMsg);
            }
            break;

          case 'error':
            console.error('[WS Voter]', msg.message);
            if (!resolved) {
              resolved = true;
              reject(new Error(msg.message));
            }
            break;
        }
      };

      ws.onclose = () => {
        stopHeartbeat();
        if (!sessionEndedRef.current && !isReconnectingRef.current) {
          startReconnectRef.current();
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('WebSocket error'));
        }
      };
    });
  }, [startHeartbeat, stopHeartbeat]);

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
      if (sessionEndedRef.current || !roomIdRef.current) return;
      connectWs(roomIdRef.current).catch(() => attemptReconnect());
    }, delay);
  }, [connectWs]);

  const startReconnect = useCallback(() => {
    if (sessionEndedRef.current || isReconnectingRef.current) return;
    isReconnectingRef.current = true;
    reconnAttemptRef.current = 0;
    attemptReconnect();
  }, [attemptReconnect]);

  // Keep startReconnectRef in sync
  useEffect(() => {
    startReconnectRef.current = startReconnect;
  }, [startReconnect]);

  const init = useCallback(async (roomId: string): Promise<void> => {
    roomIdRef.current = roomId;
    sessionEndedRef.current = false;
    await connectWs(roomId);
  }, [connectWs]);

  const send = useCallback((msg: VoterMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'voter-msg', data: msg }));
    }
  }, []);

  const markSessionEnded = useCallback(() => {
    sessionEndedRef.current = true;
    stopHeartbeat();
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
  }, [stopHeartbeat]);

  const retryConnect = useCallback(() => {
    startReconnectRef.current();
  }, []);

  const checkConnection = useCallback(() => {
    if (!roomIdRef.current) return; // Not initialized, skip
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (!isReconnectingRef.current) startReconnectRef.current();
    }
  }, []);

  const destroy = useCallback(() => {
    sessionEndedRef.current = true;
    stopHeartbeat();
    if (reconnTimerRef.current) {
      clearTimeout(reconnTimerRef.current);
      reconnTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopHeartbeat]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkConnection();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkConnection]);

  useEffect(() => {
    return () => { destroy(); };
  }, [destroy]);

  // Stable object identity so consumers can use the transport in dependency arrays
  return useMemo(
    () => ({ init, send, markSessionEnded, retryConnect, checkConnection, destroy }),
    [init, send, markSessionEnded, retryConnect, checkConnection, destroy],
  );
}
