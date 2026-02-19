export interface SignalConfig {
  host: string;
  port?: number;
  path: string;
  secure: boolean;
}

/**
 * Resolve PeerJS signaling server config.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SIGNAL_SERVER_URL env (e.g. "https://signal.henryagi.de")
 * 2. Auto-detect: same hostname, port 9000
 * 3. null → PeerJS Cloud fallback
 */
export function getSignalConfig(): SignalConfig | null {
  if (typeof window === 'undefined') return null;

  const envUrl = process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL;
  if (envUrl) {
    try {
      const url = new URL(envUrl);
      return {
        host: url.hostname,
        ...(url.port ? { port: parseInt(url.port, 10) } : {}),
        path: '/',
        secure: url.protocol === 'https:',
      };
    } catch {
      console.warn('Invalid NEXT_PUBLIC_SIGNAL_SERVER_URL:', envUrl);
    }
  }

  // Auto-detect: same hostname, port 9000
  // Works for local Docker (localhost:9000) and direct access
  return {
    host: window.location.hostname,
    port: 9000,
    path: '/',
    secure: window.location.protocol === 'https:',
  };
}

/**
 * Resolve WebSocket relay URL for server mode.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SIGNAL_SERVER_URL env
 * 2. Auto-detect: same hostname, port 9000
 */
export function getWsRelayUrl(): string {
  if (typeof window === 'undefined') return '';

  const envUrl = process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL;
  if (envUrl) {
    try {
      const url = new URL(envUrl);
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = url.port ? `:${url.port}` : '';
      return `${wsProto}//${url.hostname}${port}/ws`;
    } catch {
      console.warn('Invalid NEXT_PUBLIC_SIGNAL_SERVER_URL:', envUrl);
    }
  }

  // Auto-detect: same hostname, port 9000
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${window.location.hostname}:9000/ws`;
}
