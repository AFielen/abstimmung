'use client';

import { useState } from 'react';
import type { VoteResult, SessionMode } from '@/lib/types';
import { generatePdf } from '@/lib/pdf-export';
import { OUTCOME_BADGE_COLORS } from '@/lib/utils';

interface VoteHistoryProps {
  history: VoteResult[];
  sessionMode: SessionMode;
  sessionTitle: string;
  voterCount: number;
}

function outcomeBadge(result: VoteResult): { text: string; color: string; bg: string } {
  const colors = OUTCOME_BADGE_COLORS[result.outcome] ?? OUTCOME_BADGE_COLORS.default;
  switch (result.outcome) {
    case 'accepted':
      return { text: 'Angenommen', ...colors };
    case 'rejected':
      return { text: 'Abgelehnt', ...colors };
    case 'tie':
      return { text: 'Gleichstand', ...colors };
    case 'custom-winner':
      return { text: result.winner || 'Gewinner', ...colors };
    default:
      return { text: '', ...colors };
  }
}

export default function VoteHistory({
  history,
  sessionMode,
  sessionTitle,
  voterCount,
}: VoteHistoryProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await generatePdf(history, sessionTitle, voterCount, sessionMode);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="drk-panel p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
          Bisherige Abstimmungen
        </h3>
        {history.length > 0 && (
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: exporting ? '#f0f0f0' : '#fef2f2',
              color: exporting ? 'var(--text-light)' : 'var(--drk)',
              border: '1px solid',
              borderColor: exporting ? 'var(--border)' : '#e3061330',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {exporting ? 'Exportiere...' : 'PDF Export'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: 'var(--text-light)' }}>
            Noch keine Abstimmungen durchgefuehrt.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((result, idx) => {
            const badge = outcomeBadge(result);
            return (
              <div
                key={idx}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {idx + 1}. {result.topic}
                  </span>
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {badge.text}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-light)' }}>
                  {result.options.map((opt) => {
                    const count = result.votes[opt] || 0;
                    return (
                      <span key={opt}>
                        {opt}: {count}
                      </span>
                    );
                  })}
                  <span>|</span>
                  <span>
                    Abgestimmt: {result.totalCast}/{result.totalVoters}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
