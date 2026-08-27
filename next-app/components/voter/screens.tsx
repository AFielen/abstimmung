'use client';
import { useState, useCallback } from 'react';
import { formatTimerTime, voteOptionCls } from '@/lib/utils';
import { TOKEN_CHARS } from '@/lib/token';
import type { VoteResult, VoteType } from '@/lib/types';

// ─── Shared helpers ─────────────────────────────────────────────────────────

function timerClasses(seconds: number): string {
  const base = 'text-2xl font-bold tabular-nums';
  if (seconds <= 0) return base + ' text-[var(--danger)] animate-pulse';
  if (seconds <= 10) return base + ' text-[var(--danger)] animate-pulse';
  if (seconds <= 30) return base + ' text-[var(--warning)]';
  return base + ' text-[var(--drk)]';
}

function voteButtonStyle(opt: string, type: VoteType): string {
  const base = 'w-full py-4 px-4 text-lg font-bold rounded-[10px] text-white active:scale-95 transition-transform';
  const cls = voteOptionCls(opt, type);
  if (cls === 'ja') return base + ' bg-[var(--success)]';
  if (cls === 'nein') return base + ' bg-[var(--danger)]';
  if (cls === 'enthaltung') return base + ' bg-[var(--warning)] text-[var(--text)]';
  return base + ' bg-[var(--drk)]';
}

// ─── ConnectingScreen ───────────────────────────────────────────────────────

export function ConnectingScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--drk)] rounded-full animate-spin" />
      <p className="text-xl font-bold">Verbindung wird hergestellt...</p>
      <p className="text-[var(--text-light)]">Bitte warten Sie einen Moment.</p>
    </div>
  );
}

// ─── WaitingScreen ──────────────────────────────────────────────────────────

export function WaitingScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--drk)] text-white flex items-center justify-center text-3xl">
        &#9201;
      </div>
      <p className="text-xl font-bold">Willkommen!</p>
      <p className="text-[var(--text-light)]">
        Die n&auml;chste Abstimmung wird gleich gestartet.
      </p>
    </div>
  );
}

// ─── VotingScreen ───────────────────────────────────────────────────────────

export function VotingScreen({
  topic,
  description,
  options,
  voteType,
  timerSecondsLeft,
  onVote,
}: {
  topic: string;
  description: string;
  options: string[];
  voteType: VoteType;
  timerSecondsLeft: number;
  onVote: (option: string) => void;
}) {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      {timerSecondsLeft > 0 && (
        <div className={timerClasses(timerSecondsLeft)}>
          {formatTimerTime(timerSecondsLeft)}
        </div>
      )}
      <h2 className="text-xl font-bold text-center">{topic}</h2>
      {description && (
        <p className="text-[var(--text-light)] text-center text-sm">{description}</p>
      )}
      <div className="w-full flex flex-col gap-3 mt-2">
        {options.map((opt) => (
          <button
            key={opt}
            className={voteButtonStyle(opt, voteType)}
            onClick={() => onVote(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ConfirmedScreen ────────────────────────────────────────────────────────

export function ConfirmedScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-[var(--success)] text-white flex items-center justify-center text-4xl animate-[pop_0.4s_ease]">
        &#10003;
      </div>
      <p className="text-xl font-bold">Stimme abgegeben!</p>
      <p className="text-[var(--text-light)]">
        Vielen Dank. Bitte warten Sie auf das Ergebnis.
      </p>
    </div>
  );
}

// ─── ResultScreen ───────────────────────────────────────────────────────────

export function ResultScreen({ result }: { result: VoteResult }) {
  const outcomeLabel = (): string => {
    switch (result.outcome) {
      case 'accepted':
        return 'Angenommen';
      case 'rejected':
        return 'Abgelehnt';
      case 'tie':
        return 'Stimmengleichheit';
      case 'custom-winner':
        return result.winner ? `Gewinner: ${result.winner}` : 'Ergebnis';
      default:
        return 'Ergebnis';
    }
  };

  const outcomeColor = (): string => {
    switch (result.outcome) {
      case 'accepted':
        return 'text-[var(--success)]';
      case 'rejected':
        return 'text-[var(--danger)]';
      case 'tie':
        return 'text-[var(--warning)]';
      default:
        return 'text-[var(--drk)]';
    }
  };

  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <h2 className="text-xl font-bold text-center">{result.topic}</h2>
      <p className={`text-2xl font-bold ${outcomeColor()}`}>{outcomeLabel()}</p>
      <div className="w-full flex flex-col gap-2">
        {result.options.map((opt) => {
          const count = result.votes[opt] || 0;
          const pct = result.totalCast > 0 ? Math.round((count / result.totalCast) * 100) : 0;
          return (
            <div key={opt} className="flex items-center gap-2">
              <span className="w-24 text-right text-sm font-medium truncate">{opt}</span>
              <div className="flex-1 h-6 bg-[var(--border)] rounded-[5px] overflow-hidden">
                <div
                  className="h-full rounded-[5px] transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      opt === 'Ja'
                        ? 'var(--success)'
                        : opt === 'Nein'
                          ? 'var(--danger)'
                          : opt === 'Enthaltung'
                            ? 'var(--warning)'
                            : 'var(--drk)',
                  }}
                />
              </div>
              <span className="w-16 text-sm tabular-nums">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[var(--text-light)] text-sm">
        Abgegeben: {result.totalCast} / {result.totalVoters}
        {result.notVoted > 0 && ` | Nicht abgestimmt: ${result.notVoted}`}
      </p>
    </div>
  );
}

// ─── EndedScreen ────────────────────────────────────────────────────────────

export function EndedScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--drk)] text-white flex items-center justify-center text-3xl">
        &#128077;
      </div>
      <p className="text-xl font-bold">Versammlung beendet</p>
      <p className="text-[var(--text-light)]">Vielen Dank f&uuml;r Ihre Teilnahme!</p>
    </div>
  );
}

// ─── ReconnectingScreen ─────────────────────────────────────────────────────

export function ReconnectingScreen({ attempt, max }: { attempt: number; max: number }) {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--drk)] rounded-full animate-spin" />
      <p className="text-xl font-bold">Verbindung wird wiederhergestellt...</p>
      <p className="text-[var(--text-light)]">
        Versuch {attempt} von {max}
      </p>
    </div>
  );
}

// ─── ErrorScreen ────────────────────────────────────────────────────────────

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--danger)] text-white flex items-center justify-center text-3xl">
        &#9888;
      </div>
      <p className="text-xl font-bold">Verbindung fehlgeschlagen</p>
      <p className="text-[var(--text-light)]">
        Die Verbindung konnte nicht wiederhergestellt werden.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-3 bg-[var(--drk)] text-white font-bold rounded-[10px] active:scale-95 transition-transform"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

// ─── SkWaitingScreen ────────────────────────────────────────────────────────

export function SkWaitingScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[var(--drk)] text-white flex items-center justify-center text-3xl">
        &#127915;
      </div>
      <p className="text-xl font-bold">Stimmkarten-Modus</p>
      <p className="text-[var(--text-light)]">
        Bitte warten Sie, bis die n&auml;chste Abstimmung gestartet wird.
      </p>
    </div>
  );
}

// ─── SkCodeEntryScreen ──────────────────────────────────────────────────────

export function SkCodeEntryScreen({
  topic,
  description,
  timerSecondsLeft,
  onSubmitCode,
}: {
  topic: string;
  description: string;
  timerSecondsLeft: number;
  onSubmitCode: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleChar = useCallback(
    (ch: string) => {
      setError('');
      setCode((prev) => {
        // Strip dashes for length check
        const raw = prev.replace(/-/g, '');
        if (raw.length >= 6) return prev;
        const newRaw = raw + ch;
        // Auto-insert dash after 3 chars
        if (newRaw.length > 3) {
          return newRaw.slice(0, 3) + '-' + newRaw.slice(3);
        }
        return newRaw;
      });
    },
    []
  );

  const handleDelete = useCallback(() => {
    setError('');
    setCode((prev) => {
      const raw = prev.replace(/-/g, '');
      if (raw.length === 0) return '';
      const newRaw = raw.slice(0, -1);
      if (newRaw.length > 3) {
        return newRaw.slice(0, 3) + '-' + newRaw.slice(3);
      }
      return newRaw;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const raw = code.replace(/-/g, '');
    if (raw.length !== 6) {
      setError('Bitte geben Sie einen vollst\u00e4ndigen Code ein.');
      return;
    }
    // Validate all characters
    for (const ch of raw) {
      if (!TOKEN_CHARS.includes(ch)) {
        setError('Ung\u00fcltiges Zeichen im Code.');
        return;
      }
    }
    onSubmitCode(code);
  }, [code, onSubmitCode]);

  // Build numpad characters: 2-9, then A-Z excluding I, L, O
  const numpadChars = TOKEN_CHARS.split('');

  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-3">
      {timerSecondsLeft > 0 && (
        <div className={timerClasses(timerSecondsLeft)}>
          {formatTimerTime(timerSecondsLeft)}
        </div>
      )}
      <h2 className="text-xl font-bold text-center">{topic}</h2>
      {description && (
        <p className="text-[var(--text-light)] text-center text-sm">{description}</p>
      )}
      <p className="text-sm text-[var(--text-light)]">Geben Sie Ihren Stimmkarten-Code ein:</p>

      {/* Code display */}
      <div className="w-full flex justify-center">
        <div className="text-3xl font-bold font-mono tracking-[0.2em] bg-white border-2 border-[var(--border)] rounded-[10px] px-6 py-3 min-w-[200px] text-center">
          {code || <span className="text-[var(--border)]">___-___</span>}
        </div>
      </div>

      {error && <p className="text-[var(--danger)] text-sm font-medium">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
        {numpadChars.map((ch) => (
          <button
            key={ch}
            className="p-4 text-xl font-bold border-2 border-[var(--border)] rounded-[10px] bg-white active:bg-[var(--bg)] transition-colors"
            onClick={() => handleChar(ch)}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-[320px]">
        <button
          className="flex-1 py-3 text-lg font-bold border-2 border-[var(--border)] rounded-[10px] bg-white active:bg-[var(--bg)] transition-colors"
          onClick={handleDelete}
        >
          &#9003; L&ouml;schen
        </button>
        <button
          className="flex-1 py-3 text-lg font-bold rounded-[10px] bg-[var(--drk)] text-white active:scale-95 transition-transform disabled:opacity-50"
          onClick={handleSubmit}
          disabled={code.replace(/-/g, '').length !== 6}
        >
          Best&auml;tigen
        </button>
      </div>
    </div>
  );
}

// ─── SkVoteScreen ───────────────────────────────────────────────────────────

export function SkVoteScreen({
  topic,
  options,
  voteType,
  onVote,
}: {
  topic: string;
  options: string[];
  voteType: VoteType;
  onVote: (option: string) => void;
}) {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-[var(--success)] text-white flex items-center justify-center text-2xl animate-[pop_0.4s_ease]">
        &#10003;
      </div>
      <p className="text-sm text-[var(--text-light)]">Code akzeptiert</p>
      <h2 className="text-xl font-bold text-center">{topic}</h2>
      <div className="w-full flex flex-col gap-3 mt-2">
        {options.map((opt) => (
          <button
            key={opt}
            className={voteButtonStyle(opt, voteType)}
            onClick={() => onVote(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SkConfirmedScreen ──────────────────────────────────────────────────────

export function SkConfirmedScreen() {
  return (
    <div className="w-full max-w-[420px] flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-[var(--success)] text-white flex items-center justify-center text-4xl animate-[pop_0.4s_ease]">
        &#10003;
      </div>
      <p className="text-xl font-bold">Stimme abgegeben!</p>
      <p className="text-[var(--text-light)]">
        Vielen Dank. Ihre Stimme wurde erfolgreich erfasst.
      </p>
    </div>
  );
}
