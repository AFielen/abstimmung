'use client';

import type { SessionMode, TransportMode } from '@/lib/types';

interface InfoBoxProps {
  sessionMode: SessionMode;
  transportMode?: TransportMode;
  context: 'welcome' | 'vote';
}

export default function InfoBox({ sessionMode, transportMode, context }: InfoBoxProps) {
  const isServer = transportMode === 'server';

  if (context === 'welcome') {
    return (
      <div className="bg-white rounded-[10px] p-6 mb-4 shadow-sm border-l-4" style={{ borderLeftColor: 'var(--drk)' }}>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Willkommen zur Abstimmung
        </h3>
        {sessionMode === 'open' ? (
          <div className="text-sm" style={{ color: 'var(--text-light)' }}>
            <p className="mb-2">
              <strong>Offene Abstimmung:</strong> Teilnehmer verbinden sich direkt mit ihrem
              Smartphone oder Computer. Jedes Geraet kann pro Abstimmung einmal abstimmen.
            </p>
            <p className="mb-1">So funktioniert es:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Teilen Sie den QR-Code oder den Link mit den Teilnehmern</li>
              <li>Starten Sie eine Abstimmung mit Thema und Optionen</li>
              <li>Teilnehmer stimmen ueber ihr Geraet ab</li>
              <li>Ergebnisse werden in Echtzeit angezeigt</li>
            </ol>
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--text-light)' }}>
            <p className="mb-2">
              <strong>Stimmkarten-Modus:</strong> Jeder Stimmberechtigte erhaelt eine
              persoenliche Stimmkarte mit einem einmaligen Code. Pro Abstimmungsrunde kann
              jeder Code nur einmal verwendet werden.
            </p>
            <p className="mb-1">So funktioniert es:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Drucken und verteilen Sie die Stimmkarten an die Teilnehmer</li>
              <li>Starten Sie eine Abstimmung</li>
              <li>Teilnehmer geben ihren Code ein und stimmen ab</li>
              <li>Jeder Code gilt nur einmal pro Abstimmung</li>
            </ol>
          </div>
        )}
        {isServer && (
          <div
            className="mt-3 p-3 rounded-lg text-xs"
            style={{ backgroundColor: '#fff8e1', border: '1px solid #ffe082', color: '#6d4c00' }}
          >
            <strong>Server-Modus aktiv:</strong> Alle Daten werden ueber den Signal-Server
            uebertragen. Dies umgeht Firewall- und NAT-Probleme, bedeutet aber, dass die
            Abstimmungsdaten den Server passieren.
          </div>
        )}
      </div>
    );
  }

  // context === 'vote'
  return (
    <div className="bg-white rounded-[10px] p-6 mb-4 shadow-sm border-l-4" style={{ borderLeftColor: 'var(--drk)' }}>
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
