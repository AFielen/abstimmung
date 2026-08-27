'use client';

import type { SessionMode, TransportMode } from '@/lib/types';

interface InfoBoxProps {
  sessionMode: SessionMode;
  transportMode?: TransportMode;
}

export default function InfoBox({ sessionMode, transportMode }: InfoBoxProps) {
  const isServer = transportMode === 'server';

  return (
    <div className="drk-panel p-6 mb-4 border-l-4" style={{ borderLeftColor: 'var(--drk)' }}>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Neue Abstimmung starten
      </h3>
      {sessionMode === 'open' ? (
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          Erstellen Sie eine neue Abstimmung. Die Teilnehmer koennen ueber den bereits
          geteilten Link oder QR-Code abstimmen. Jedes Geraet kann pro Runde einmal abstimmen.
        </p>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          Erstellen Sie eine neue Abstimmung. Die Teilnehmer geben ihren persoenlichen
          Stimmkarten-Code ein, um ihre Stimme abzugeben. Jeder Code kann pro Runde nur
          einmal verwendet werden.
        </p>
      )}
      {isServer && (
        <div
          className="mt-3 p-3 rounded-lg text-xs"
          style={{ backgroundColor: '#fff8e1', border: '1px solid #ffe082', color: '#6d4c00' }}
        >
          <strong>Server-Modus:</strong> Verbindungen laufen ueber den Signal-Server (WebSocket-Relay).
        </div>
      )}
    </div>
  );
}
