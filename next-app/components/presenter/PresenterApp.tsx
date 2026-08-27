'use client';

import { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  SessionMode,
  TransportMode,
  VoteType,
  VoteData,
  VoteResult,
  VoteOutcome,
  TokenInfo,
  VoterMessage,
} from '@/lib/types';
import { randomCode } from '@/lib/utils';
import { generatePdf } from '@/lib/pdf-export';
import {
  presenterReducer,
  initialPresenterState,
} from '@/lib/presenter-reducer';
import { useHostTransport } from '@/hooks/useHostTransport';
import { useServerHostTransport } from '@/hooks/useServerHostTransport';

import SetupForm from './SetupForm';
import NewVoteForm from './NewVoteForm';
import ActiveVote from './ActiveVote';
import VoteResultDisplay from './VoteResultDisplay';
import VoteHistory from './VoteHistory';
import EndSessionModal from './EndSessionModal';
import InfoBox from './InfoBox';

export default function PresenterApp() {
  const [state, dispatch] = useReducer(presenterReducer, initialPresenterState);
  const [showEndModal, setShowEndModal] = useState(false);
  const router = useRouter();

  // Refs for mutable tracking that must survive across re-renders
  const votedDevices = useRef<Set<string>>(new Set());
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const voteClosingRef = useRef(false);

  // Ref to hold the active transport so callbacks can access it
  const transportRef = useRef<{
    broadcast: (msg: any) => void;
    sendTo: (id: string, msg: any) => void;
  }>(null!);

  // --- Transport callbacks (shared between P2P and Server) ---
  const handleConnection = useCallback((connectionId: string) => {
    const t = transportRef.current;
    const s = stateRef.current;
    if (s.phase === 'voting' && s.currentVote) {
      t.sendTo(connectionId, {
        type: 'vote-started',
        topic: s.currentVote.topic,
        description: s.currentVote.description,
        voteType: s.currentVote.type,
        options: s.currentVote.options,
        voteRoundId: s.currentVote.roundId,
        timerSeconds: s.currentVote.timerEnabled ? s.timerSecondsLeft : 0,
        mode: s.sessionMode,
      });
    } else {
      t.sendTo(connectionId, { type: 'waiting', mode: s.sessionMode });
    }
  }, []);

  const handleData = useCallback((connectionId: string, data: VoterMessage) => {
    const s = stateRef.current;
    const t = transportRef.current;

    switch (data.type) {
      case 'register': {
        // Already handled in transport hook
        break;
      }

      case 'cast-vote': {
        // Open mode voting
        if (s.sessionMode !== 'open') return;
        if (s.phase !== 'voting' || !s.currentVote) return;

        const lsId = data.deviceId;
        const fpId = data.fingerprintId;
        // connectionId is assigned by the transport layer (PeerJS peer ID or
        // ws-relay connId) — voters cannot spoof it across submissions.
        const connKey = 'conn:' + connectionId;

        if (votedDevices.current.has(connKey)) {
          t.sendTo(connectionId, { type: 'already-voted' });
          return;
        }
        if (lsId && votedDevices.current.has('ls:' + lsId)) {
          t.sendTo(connectionId, { type: 'already-voted' });
          return;
        }
        if (fpId && votedDevices.current.has('fp:' + fpId)) {
          t.sendTo(connectionId, { type: 'already-voted' });
          return;
        }

        // Validate option
        if (!s.currentVote.options.includes(data.option)) return;

        // Record vote
        votedDevices.current.add(connKey);
        if (lsId) votedDevices.current.add('ls:' + lsId);
        if (fpId) votedDevices.current.add('fp:' + fpId);

        dispatch({ type: 'RECORD_VOTE', option: data.option });
        t.sendTo(connectionId, { type: 'vote-confirmed' });
        break;
      }

      case 'sk-validate': {
        // Stimmkarten mode: validate code
        if (s.sessionMode !== 'stimmkarten') return;
        const code = data.code?.toUpperCase().trim();
        if (!code) {
          t.sendTo(connectionId, { type: 'sk-result', valid: false, reason: 'Kein Code angegeben.' });
          return;
        }

        const tokenInfo = s.tokenCodes[code];
        if (!tokenInfo) {
          t.sendTo(connectionId, { type: 'sk-result', valid: false, reason: 'Ungueltiger Code.' });
          return;
        }

        if (s.phase !== 'voting' || !s.currentVote) {
          t.sendTo(connectionId, { type: 'sk-result', valid: false, reason: 'Aktuell keine Abstimmung aktiv.' });
          return;
        }

        if (tokenInfo.votedInRounds.includes(s.currentVote.roundId)) {
          t.sendTo(connectionId, { type: 'sk-result', valid: false, reason: 'Dieser Code wurde bereits verwendet.' });
          return;
        }

        t.sendTo(connectionId, {
          type: 'sk-result',
          valid: true,
          options: s.currentVote.options,
          voteType: s.currentVote.type,
          topic: s.currentVote.topic,
        });
        break;
      }

      case 'sk-cast-vote': {
        // Stimmkarten mode: cast vote with code
        if (s.sessionMode !== 'stimmkarten') return;
        if (s.phase !== 'voting' || !s.currentVote) {
          t.sendTo(connectionId, { type: 'sk-vote-result', success: false, reason: 'Keine aktive Abstimmung.' });
          return;
        }

        const code = data.code?.toUpperCase().trim();
        if (!code) {
          t.sendTo(connectionId, { type: 'sk-vote-result', success: false, reason: 'Kein Code angegeben.' });
          return;
        }

        const token = s.tokenCodes[code];
        if (!token) {
          t.sendTo(connectionId, { type: 'sk-vote-result', success: false, reason: 'Ungueltiger Code.' });
          return;
        }

        if (token.votedInRounds.includes(s.currentVote.roundId)) {
          t.sendTo(connectionId, { type: 'sk-vote-result', success: false, reason: 'Code bereits verwendet.' });
          return;
        }

        if (!s.currentVote.options.includes(data.option)) {
          t.sendTo(connectionId, { type: 'sk-vote-result', success: false, reason: 'Ungueltige Option.' });
          return;
        }

        dispatch({ type: 'MARK_TOKEN_USED', code, roundId: s.currentVote.roundId });
        dispatch({ type: 'RECORD_VOTE', option: data.option });
        t.sendTo(connectionId, { type: 'sk-vote-result', success: true });
        break;
      }

      case 'ping': {
        // Handled internally by transport hook
        break;
      }
    }
  }, []);

  const handleDisconnect = useCallback((_connectionId: string | null) => {
    // Connection counts are synced via the useEffect below
  }, []);

  // --- Both transports are always instantiated (React Rules of Hooks) ---
  const p2pTransport = useHostTransport({
    onConnection: handleConnection,
    onData: handleData,
    onDisconnect: handleDisconnect,
  });

  const serverTransport = useServerHostTransport({
    onConnection: handleConnection,
    onData: handleData,
    onDisconnect: handleDisconnect,
  });

  // Active transport based on state
  const transport = state.transportMode === 'server' ? serverTransport : p2pTransport;
  transportRef.current = transport;

  // Keep connection counts in sync
  useEffect(() => {
    dispatch({
      type: 'SET_CONNECTIONS',
      connected: transport.connectionCount,
      disconnected: transport.disconnectedCount,
    });
  }, [transport.connectionCount, transport.disconnectedCount]);

  // --- Beforeunload warning ---
  useEffect(() => {
    if (state.phase === 'setup') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.phase]);

  // Stop a running vote timer on unmount (e.g. navigation away mid-vote);
  // uses the ref directly since stopTimer is a plain function
  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  // --- Timer management ---
  function startTimer() {
    stopTimer();
    voteClosingRef.current = false;
    timerInterval.current = setInterval(() => {
      dispatch({ type: 'TIMER_TICK' });
      const s = stateRef.current;
      // dispatch is async — stateRef still holds the pre-tick value
      const newSeconds = s.timerSecondsLeft - 1;
      if (newSeconds <= 0 && !voteClosingRef.current) {
        // Auto-close when timer expires
        voteClosingRef.current = true;
        stopTimer();
        if (s.currentVote) {
          closeVote();
        }
      } else {
        // Broadcast timer update to voters
        transportRef.current.broadcast({ type: 'timer-update', seconds: newSeconds });
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }

  // --- Session lifecycle ---
  async function handleStartSession(
    title: string,
    voterCount: number,
    mode: SessionMode,
    transportMode: TransportMode,
    tokenCodes: Record<string, TokenInfo>,
    generatedCodes: string[],
  ) {
    dispatch({
      type: 'START_SESSION',
      title,
      voterCount,
      mode,
      transportMode,
      tokenCodes,
      generatedCodes,
    });

    try {
      const activeTransport = transportMode === 'server' ? serverTransport : p2pTransport;
      await activeTransport.init();
      dispatch({ type: 'SET_PHASE', phase: 'ready' });
    } catch (err) {
      console.error('Failed to initialize transport:', err);
      dispatch({ type: 'RESET' });
      alert('Verbindung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  }

  function handleStartVote(
    topic: string,
    desc: string,
    vtype: VoteType,
    options: string[],
    timerEnabled: boolean,
    timerMin: number,
  ) {
    // Clear voted devices for this round
    votedDevices.current.clear();

    const roundId = randomCode(12);
    const timerSeconds = timerEnabled ? timerMin * 60 : 0;

    const voteData: VoteData = {
      topic,
      description: desc,
      type: vtype,
      options,
      votes: Object.fromEntries(options.map((o) => [o, 0])),
      totalCast: 0,
      roundId,
      timerEnabled,
      timerSeconds,
      startedAt: new Date(),
    };

    dispatch({ type: 'START_VOTE', vote: voteData });

    // Broadcast vote-started to all voters
    transport.broadcast({
      type: 'vote-started',
      topic,
      description: desc,
      voteType: vtype,
      options,
      voteRoundId: roundId,
      timerSeconds,
      mode: state.sessionMode,
    });

    if (timerEnabled) {
      startTimer();
    }
  }

  function closeVote() {
    stopTimer();
    const s = stateRef.current;
    if (!s.currentVote) return;

    const cv = s.currentVote;
    // Clamp to 0: totalCast can briefly exceed voterCount (e.g. a voter casts a
    // vote, then disconnects and lowers voterCount), which must not surface as a
    // negative "nicht abgestimmt" count.
    const notVoted = Math.max(0, s.voterCount - cv.totalCast);

    // Determine outcome
    let outcome: VoteOutcome;
    let winner: string | undefined;

    if (cv.type === 'yes-no') {
      const ja = cv.votes['Ja'] || 0;
      const nein = cv.votes['Nein'] || 0;
      if (ja > nein) outcome = 'accepted';
      else if (nein > ja) outcome = 'rejected';
      else outcome = 'tie';
    } else {
      // Custom: find the option with the most votes
      let maxVotes = 0;
      let maxOption = '';
      let isTie = false;
      cv.options.forEach((opt) => {
        const count = cv.votes[opt] || 0;
        if (count > maxVotes) {
          maxVotes = count;
          maxOption = opt;
          isTie = false;
        } else if (count === maxVotes && count > 0) {
          isTie = true;
        }
      });
      if (isTie || maxVotes === 0) {
        outcome = 'tie';
      } else {
        outcome = 'custom-winner';
        winner = maxOption;
      }
    }

    const result: VoteResult = {
      topic: cv.topic,
      description: cv.description,
      type: cv.type,
      options: cv.options,
      votes: { ...cv.votes },
      totalCast: cv.totalCast,
      totalVoters: s.voterCount,
      notVoted,
      outcome,
      winner,
      startedAt: cv.startedAt,
      closedAt: new Date(),
    };

    dispatch({ type: 'CLOSE_VOTE', result });
    transport.broadcast({ type: 'vote-closed', result });
  }

  function cancelVote() {
    stopTimer();
    votedDevices.current.clear();
    dispatch({ type: 'CANCEL_VOTE' });
    transport.broadcast({ type: 'vote-cancelled' });
  }

  function handleNextVote() {
    dispatch({ type: 'NEXT_VOTE' });
    transport.broadcast({ type: 'waiting', mode: state.sessionMode });
  }

  function handleEndSession() {
    stopTimer();

    // Collect stats before resetting
    const totalVotes = state.history.length;
    const totalParticipants = state.connectedCount;
    const totalCast = state.history.reduce((sum, r) => sum + r.totalCast, 0);

    transport.broadcast({ type: 'session-ended' });
    transport.destroy();
    // Also destroy the inactive transport
    if (state.transportMode === 'server') {
      p2pTransport.destroy();
    } else {
      serverTransport.destroy();
    }
    dispatch({ type: 'RESET' });
    setShowEndModal(false);

    // Navigate to danke page with session stats
    const params = new URLSearchParams({
      votes: String(totalVotes),
      participants: String(totalParticipants),
      total: String(totalCast),
    });
    router.push(`/danke?${params.toString()}`);
  }

  async function handleExportPdf() {
    await generatePdf(state.history, state.sessionTitle, state.voterCount, state.sessionMode);
  }

  // --- Render ---
  const isSessionActive = state.phase !== 'setup';

  // Transport mode label for session bar
  const modeLabel = state.transportMode === 'server'
    ? `Server-Modus (${state.sessionMode === 'stimmkarten' ? 'Stimmkarten' : 'Offen'})`
    : (state.sessionMode === 'stimmkarten' ? 'Stimmkarten' : 'Offene Abstimmung');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Setup phase */}
      {state.phase === 'setup' && (
        <SetupForm onStartSession={handleStartSession} />
      )}

      {/* Connecting phase */}
      {state.phase === 'connecting' && (
        <div className="drk-panel p-8 mb-4 text-center">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-4"
            style={{
              border: '3px solid var(--border)',
              borderTopColor: 'var(--drk)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Verbindung wird hergestellt...
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-light)' }}>
            {state.transportMode === 'server' ? 'Signal-Server wird kontaktiert' : 'PeerJS-Server wird kontaktiert'}
          </p>
        </div>
      )}

      {/* Session bar */}
      {isSessionActive && state.phase !== 'connecting' && (
        <div className="drk-panel px-5 py-3 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {state.sessionTitle}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-light)' }}>
              {modeLabel} |{' '}
              {state.voterCount} Stimmberechtigte |{' '}
              <span style={{ color: 'var(--success)' }}>{state.connectedCount} verbunden</span>
              {state.disconnectedCount > 0 && (
                <span style={{ color: 'var(--warning)' }}> | {state.disconnectedCount} getrennt</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: '#ffebee',
              color: 'var(--danger)',
              border: '1px solid #ef9a9a',
            }}
          >
            Beenden
          </button>
        </div>
      )}

      {/* Ready phase */}
      {state.phase === 'ready' && (
        <>
          <InfoBox sessionMode={state.sessionMode} transportMode={state.transportMode} context="vote" />
          <NewVoteForm onStartVote={handleStartVote} />
        </>
      )}

      {/* Voting phase */}
      {state.phase === 'voting' && state.currentVote && (
        <ActiveVote
          vote={state.currentVote}
          voterCount={state.voterCount}
          peerId={transport.peerId}
          sessionMode={state.sessionMode}
          transportMode={state.transportMode}
          connectedCount={state.connectedCount}
          disconnectedCount={state.disconnectedCount}
          timerSecondsLeft={state.timerSecondsLeft}
          onCloseVote={closeVote}
          onCancelVote={cancelVote}
        />
      )}

      {/* Result phase */}
      {state.phase === 'result' && state.history.length > 0 && (
        <VoteResultDisplay
          result={state.history[state.history.length - 1]}
          onNextVote={handleNextVote}
        />
      )}

      {/* Vote history (shown when session active) */}
      {isSessionActive && state.phase !== 'connecting' && (
        <VoteHistory
          history={state.history}
          sessionMode={state.sessionMode}
          sessionTitle={state.sessionTitle}
          voterCount={state.voterCount}
        />
      )}

      {/* End session modal */}
      <EndSessionModal
        isOpen={showEndModal}
        hasHistory={state.history.length > 0}
        onConfirm={handleEndSession}
        onCancel={() => setShowEndModal(false)}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
}
