'use client';

import type { VoteResult } from '@/lib/types';
import { BAR_COLORS, CUSTOM_COLORS, OUTCOME_BADGE_COLORS, voteOptionCls } from '@/lib/utils';

interface VoteResultDisplayProps {
  result: VoteResult;
  onNextVote: () => void;
}

function outcomeLabel(result: VoteResult): { text: string; color: string; bg: string } {
  const colors = OUTCOME_BADGE_COLORS[result.outcome] ?? OUTCOME_BADGE_COLORS.default;
  switch (result.outcome) {
    case 'accepted':
      return { text: 'ANGENOMMEN', ...colors };
    case 'rejected':
      return { text: 'ABGELEHNT', ...colors };
    case 'tie':
      return { text: 'STIMMENGLEICHHEIT', ...colors };
    case 'custom-winner':
      return { text: `Gewinner: ${result.winner || ''}`, ...colors };
    default:
      return { text: '', ...colors };
  }
}

export default function VoteResultDisplay({ result, onNextVote }: VoteResultDisplayProps) {
  const outcome = outcomeLabel(result);

  return (
    <div className="drk-panel p-6 mb-4" style={{ animation: 'fade-up 0.4s ease-out' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          {result.topic}
        </h3>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#f0f0f0', color: 'var(--text-light)' }}
        >
          Ergebnis
        </div>
      </div>

      {result.description && (
        <p className="text-sm mb-4" style={{ color: 'var(--text-light)' }}>
          {result.description}
        </p>
      )}

      {/* Result bars */}
      <div className="space-y-3 mb-5">
        {result.options.map((opt, idx) => {
          const count = result.votes[opt] || 0;
          const pct = result.totalCast > 0 ? (count / result.totalCast) * 100 : 0;
          const cls = voteOptionCls(opt, result.type);
          const color =
            result.type === 'custom'
              ? CUSTOM_COLORS[idx % CUSTOM_COLORS.length]
              : BAR_COLORS[cls] || BAR_COLORS.custom;

          return (
            <div key={opt}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {opt}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                  {count} ({pct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-6 rounded overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
                <div
                  className="h-full rounded transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    minWidth: count > 0 ? '2px' : '0',
                    animation: 'pop 0.5s ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Not voted */}
      <div
        className="rounded-lg px-4 py-2.5 mb-4 text-sm"
        style={{ backgroundColor: '#f8f9fa', color: 'var(--text-light)' }}
      >
        Nicht abgestimmt: <span className="font-semibold">{result.notVoted}</span> von{' '}
        {result.totalVoters} Stimmberechtigten
      </div>

      {/* Outcome badge */}
      <div
        className="rounded-lg px-5 py-3 text-center mb-5"
        style={{
          backgroundColor: outcome.bg,
          color: outcome.color,
          border: `1px solid ${outcome.color}20`,
        }}
      >
        <span className="text-lg font-bold">{outcome.text}</span>
      </div>

      {/* Next vote */}
      <button
        onClick={onNextVote}
        className="w-full py-3 rounded-lg text-base font-semibold text-white transition-colors"
        style={{ backgroundColor: 'var(--drk)' }}
      >
        Naechste Abstimmung
      </button>
    </div>
  );
}
