'use client';

import { useState, useEffect } from 'react';
import type { VoteData, SessionMode, TransportMode } from '@/lib/types';
import { barCls, formatTimerTime } from '@/lib/utils';
import QRCode from 'qrcode';

interface ActiveVoteProps {
  vote: VoteData;
  voterCount: number;
  peerId: string | null;
  sessionMode: SessionMode;
  transportMode: TransportMode;
  connectedCount: number;
  disconnectedCount: number;
  timerSecondsLeft: number;
  onCloseVote: () => void;
  onCancelVote: () => void;
}

const BAR_COLORS: Record<string, string> = {
  ja: '#2e7d32',
  nein: '#c62828',
  enthaltung: '#f9a825',
  custom: '#1565c0',
};

const CUSTOM_COLORS = [
  '#1565c0', '#2e7d32', '#c62828', '#f9a825',
  '#6a1b9a', '#00838f', '#e65100', '#4e342e',
];

export default function ActiveVote({
  vote,
  voterCount,
  peerId,
  sessionMode,
  transportMode,
  connectedCount,
  disconnectedCount,
  timerSecondsLeft,
  onCloseVote,
  onCancelVote,
}: ActiveVoteProps) {
  const [svgHtml, setSvgHtml] = useState('');

  const voteUrl = typeof window !== 'undefined' && peerId
    ? (transportMode === 'server'
      ? `${window.location.origin}/?vote=${encodeURIComponent(peerId)}&mode=server`
      : `${window.location.origin}/?vote=${encodeURIComponent(peerId)}`)
    : '';

  useEffect(() => {
    if (!voteUrl) return;
    let mounted = true;
    QRCode.toDataURL(voteUrl, { margin: 1, width: 256, color: { dark: '#e30613', light: '#ffffff' } })
      .then((url) => { if (mounted) setSvgHtml(url); })
      .catch(() => { if (mounted) setSvgHtml(''); });
    return () => { mounted = false; };
  }, [voteUrl]);

  const progressPct = voterCount > 0 ? Math.min(100, (vote.totalCast / voterCount) * 100) : 0;

  return (
    <div className="drk-panel p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {vote.topic}
          </h3>
          {vote.description && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-light)' }}>
              {vote.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {transportMode === 'server' && (
            <span
              className="px-2 py-1 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: '#ffebee', color: '#c62828' }}
            >
              Server
            </span>
          )}
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: '#fef2f2', color: 'var(--drk)' }}
          >
            Aktiv
          </div>
        </div>
      </div>

      {/* QR Code + URL */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-shrink-0">
          {svgHtml ? (
            <img
              src={svgHtml}
              alt="QR-Code zur Abstimmung"
              className="w-36 h-36 rounded-lg"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : (
            <div
              className="w-36 h-36 rounded-lg flex items-center justify-center"
              style={{ border: '1px solid var(--border)', backgroundColor: '#f8f9fa' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-light)' }}>QR-Code...</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-light)' }}>
            Abstimmungslink:
          </div>
          <div
            className="px-3 py-2 rounded-lg text-sm break-all font-mono"
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {voteUrl || '...'}
          </div>

          {/* Connection count */}
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span style={{ color: 'var(--success)' }}>
              {connectedCount} verbunden
            </span>
            {disconnectedCount > 0 && (
              <span className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--warning)', animation: 'pulse 1.5s infinite' }}
                />
                {disconnectedCount} verbindet wieder
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span style={{ color: 'var(--text-light)' }}>Fortschritt</span>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            {vote.totalCast} / {voterCount} abgestimmt
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: 'var(--drk)',
            }}
          />
        </div>
      </div>

      {/* Live vote bars */}
      <div className="mb-5">
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Live-Ergebnis
        </div>
        <div className="space-y-2">
          {vote.options.map((opt, idx) => {
            const count = vote.votes[opt] || 0;
            const pct = vote.totalCast > 0 ? (count / vote.totalCast) * 100 : 0;
            const cls = barCls(opt, vote.type);
            const color =
              vote.type === 'custom'
                ? CUSTOM_COLORS[idx % CUSTOM_COLORS.length]
                : BAR_COLORS[cls] || BAR_COLORS.custom;

            return (
              <div key={opt}>
                <div className="flex items-center justify-between text-sm mb-0.5">
                  <span style={{ color: 'var(--text)' }}>{opt}</span>
                  <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                    {count} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-5 rounded overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      minWidth: count > 0 ? '2px' : '0',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timer */}
      {vote.timerEnabled && (
        <div className="text-center mb-4">
          <div
            className="inline-block px-5 py-2 rounded-lg text-lg font-mono font-bold"
            style={{
              backgroundColor: timerSecondsLeft <= 30 ? '#ffebee' : '#f8f9fa',
              color: timerSecondsLeft <= 30 ? 'var(--danger)' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            {formatTimerTime(timerSecondsLeft)}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCloseVote}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--drk)' }}
        >
          Abstimmung schliessen
        </button>
        <button
          onClick={onCancelVote}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: '#f5f5f5',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
