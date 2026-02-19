'use client';

import { useState, useMemo } from 'react';
import type { SessionMode, TransportMode, TokenInfo } from '@/lib/types';
import { generateToken } from '@/lib/token';

interface SetupFormProps {
  onStartSession: (
    title: string,
    voterCount: number,
    mode: SessionMode,
    transportMode: TransportMode,
    tokenCodes: Record<string, TokenInfo>,
    generatedCodes: string[],
  ) => void;
}

export default function SetupForm({ onStartSession }: SetupFormProps) {
  const [title, setTitle] = useState('');
  const [voterCount, setVoterCount] = useState<number>(10);
  const [mode, setMode] = useState<SessionMode>('open');
  const [transportMode, setTransportMode] = useState<TransportMode>('p2p');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const canStart = useMemo(() => {
    if (!title.trim()) return false;
    if (voterCount < 1) return false;
    if (mode === 'stimmkarten' && generatedCodes.length === 0) return false;
    return true;
  }, [title, voterCount, mode, generatedCodes]);

  function handleGenerateTokens() {
    const codes: string[] = [];
    const existing = new Set(generatedCodes);
    for (let i = 0; i < voterCount; i++) {
      let code: string;
      do {
        code = generateToken();
      } while (existing.has(code));
      existing.add(code);
      codes.push(code);
    }
    setGeneratedCodes(codes);
  }

  function handlePrintTokens() {
    // Build print content and inject into #print-tokens-area
    const area = document.getElementById('print-tokens-area');
    if (!area) return;

    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

    const cardsPerPage = 9; // 3x3 grid
    let html = '';
    for (let p = 0; p < Math.ceil(generatedCodes.length / cardsPerPage); p++) {
      const pageCodes = generatedCodes.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
      html += '<div class="print-page"><div class="print-grid">';
      pageCodes.forEach((code) => {
        html += `
          <div class="print-card">
            <div class="pc-logo">DRK</div>
            <div class="pc-label">Stimmkarte – ${esc(title || 'Vereinsabstimmung')}</div>
            <div class="pc-code">${esc(code)}</div>
            <div class="pc-footer">Bitte Code bei der Abstimmung eingeben</div>
          </div>`;
      });
      html += '</div></div>';
    }
    area.innerHTML = html;
    setTimeout(() => window.print(), 100);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canStart) return;

    const tokenCodes: Record<string, TokenInfo> = {};
    if (mode === 'stimmkarten') {
      generatedCodes.forEach((code) => {
        tokenCodes[code] = { votedInRounds: [] };
      });
    }

    onStartSession(title.trim(), voterCount, mode, transportMode, tokenCodes, generatedCodes);
  }

  // Active selection state helpers
  const isOpenP2P = mode === 'open' && transportMode === 'p2p';
  const isStimmkartenP2P = mode === 'stimmkarten' && transportMode === 'p2p';
  const isServer = transportMode === 'server';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-[10px] p-6 mb-4 shadow-sm">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>
          Versammlung einrichten
        </h2>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Titel der Versammlung
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Jahreshauptversammlung 2026"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Voter count */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Anzahl Stimmberechtigte
          </label>
          <input
            type="number"
            min={1}
            max={9999}
            value={voterCount}
            onChange={(e) => setVoterCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Mode selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
              Abstimmungsmodus
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: '#f0f0f0',
                color: 'var(--text-light)',
                border: '1px solid var(--border)',
              }}
              title="Info zu den Modi"
            >
              ?
            </button>
          </div>

          {showHelp && (
            <div
              className="rounded-lg p-4 mb-4 text-sm"
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid var(--border)',
                color: 'var(--text-light)',
              }}
            >
              <p className="mb-2">
                <strong>Offene Abstimmung:</strong> Jeder mit dem Link / QR-Code kann abstimmen.
                Ein Geraet = eine Stimme. Geeignet fuer unkomplizierte Abstimmungen.
              </p>
              <p className="mb-2">
                <strong>Stimmkarten:</strong> Jeder Stimmberechtigte bekommt eine Karte mit
                einmaligem Code. Hoechste Sicherheit und Nachvollziehbarkeit. Geeignet fuer
                formelle Abstimmungen.
              </p>
              <p>
                <strong>Server-Modus:</strong> Alle Verbindungen laufen ueber einen zentralen
                Server statt Peer-to-Peer. Zuverlaessiger bei eingeschraenkten Netzwerken
                (Firewalls, NAT), aber die Abstimmungsdaten passieren den Server.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Open mode card (P2P) */}
            <button
              type="button"
              onClick={() => { setMode('open'); setTransportMode('p2p'); }}
              className="rounded-[10px] p-4 text-left transition-all cursor-pointer"
              style={{
                border: isOpenP2P ? '2px solid #2e7d32' : '2px solid var(--border)',
                backgroundColor: isOpenP2P ? '#f0fdf4' : '#fff',
              }}
            >
              <div className="text-2xl mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isOpenP2P ? '#2e7d32' : '#777'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: isOpenP2P ? '#2e7d32' : 'var(--text)' }}>
                Offene Abstimmung
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                Direkt per Link oder QR-Code
              </div>
              <div
                className="text-[10px] mt-2 px-1.5 py-0.5 rounded inline-block"
                style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
              >
                Serverlos (P2P)
              </div>
            </button>

            {/* Stimmkarten mode card (P2P) */}
            <button
              type="button"
              onClick={() => { setMode('stimmkarten'); setTransportMode('p2p'); }}
              className="rounded-[10px] p-4 text-left transition-all cursor-pointer"
              style={{
                border: isStimmkartenP2P ? '2px solid #2e7d32' : '2px solid var(--border)',
                backgroundColor: isStimmkartenP2P ? '#f0fdf4' : '#fff',
              }}
            >
              <div className="text-2xl mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isStimmkartenP2P ? '#2e7d32' : '#777'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: isStimmkartenP2P ? '#2e7d32' : 'var(--text)' }}>
                Stimmkarten
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                Persoenliche Codes pro Teilnehmer
              </div>
              <div
                className="text-[10px] mt-2 px-1.5 py-0.5 rounded inline-block"
                style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
              >
                Serverlos (P2P)
              </div>
            </button>

            {/* Server mode card */}
            <button
              type="button"
              onClick={() => { setTransportMode('server'); }}
              className="rounded-[10px] p-4 text-left transition-all cursor-pointer"
              style={{
                border: isServer ? '2px solid #c62828' : '2px solid var(--border)',
                backgroundColor: isServer ? '#fef2f2' : '#fff',
              }}
            >
              <div className="text-2xl mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isServer ? '#c62828' : '#777'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: isServer ? '#c62828' : 'var(--text)' }}>
                Server-Modus
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                Verbindung ueber Server-Relay
              </div>
              <div
                className="text-[10px] mt-2 px-1.5 py-0.5 rounded inline-block"
                style={{ backgroundColor: '#ffebee', color: '#c62828' }}
              >
                Daten ueber Server
              </div>
            </button>
          </div>
        </div>

        {/* Server mode: warning + sub-mode selection */}
        {isServer && (
          <>
            <div
              className="rounded-lg p-4 mb-4 text-sm flex items-start gap-3"
              style={{
                backgroundColor: '#fff8e1',
                border: '1px solid #ffe082',
                color: 'var(--text)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#f9a825" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>Hinweis:</strong> Im Server-Modus werden alle Abstimmungsdaten ueber den
                Server weitergeleitet. Dies ist weniger datenschutzfreundlich als der
                Peer-to-Peer-Modus, aber zuverlaessiger bei Firewall- oder NAT-Problemen.
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Abstimmungsart im Server-Modus
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="serverSubMode"
                    checked={mode === 'open'}
                    onChange={() => setMode('open')}
                    className="accent-[#c62828]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Offene Abstimmung</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="serverSubMode"
                    checked={mode === 'stimmkarten'}
                    onChange={() => setMode('stimmkarten')}
                    className="accent-[#c62828]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>Stimmkarten</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Token generation (stimmkarten mode) */}
        {mode === 'stimmkarten' && (
          <div
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: '#f8f9fa', border: '1px solid var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Stimmkarten generieren
            </h3>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleGenerateTokens}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--drk)' }}
              >
                {generatedCodes.length > 0 ? 'Neu generieren' : `${voterCount} Codes generieren`}
              </button>

              {generatedCodes.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrintTokens}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: '#fff',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Drucken
                  </span>
                </button>
              )}
            </div>

            {generatedCodes.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-light)' }}>
                  {generatedCodes.length} Codes generiert
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {generatedCodes.map((code) => (
                    <span
                      key={code}
                      className="inline-block px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start button */}
        <button
          type="submit"
          disabled={!canStart}
          className="w-full py-3 rounded-lg text-base font-semibold text-white transition-colors"
          style={{
            backgroundColor: canStart ? 'var(--drk)' : '#ccc',
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          Versammlung starten
        </button>
      </div>

      {/* Hidden print area */}
      <div id="print-tokens-area" />
    </form>
  );
}
