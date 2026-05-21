export interface SignalConfig {
  host: string;
  port?: number;
  path: string;
  secure: boolean;
}

// Accept both https:/wss: (secure) and http:/ws: (insecure) so a misconfigured
// SIGNAL_URL with the wss:// scheme still resolves to a working WSS connection.
function isSecureScheme(protocol: string): boolean {
  return protocol === 'https:' || protocol === 'wss:';
}

/**
 * Resolve PeerJS signaling server config.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SIGNAL_SERVER_URL env (e.g. "https://signal.drk-abstimmung.de")
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
        secure: isSecureScheme(url.protocol),
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
      const wsProto = isSecureScheme(url.protocol) ? 'wss:' : 'ws:';
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
