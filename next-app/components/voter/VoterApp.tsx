'use client';
import { useReducer, useEffect, useRef, useCallback } from 'react';
import { voterReducer, initialVoterState } from '@/lib/voter-reducer';
import type { VoterAction } from '@/lib/voter-reducer';
import type { HostMessage, VoteType, TransportMode } from '@/lib/types';
import { useVoterTransport } from '@/hooks/useVoterTransport';
import { useServerVoterTransport } from '@/hooks/useServerVoterTransport';
import { randomCode } from '@/lib/utils';
import { generateDeviceFingerprint } from '@/lib/fingerprint';
import { cleanupVotedRounds, hasVotedInRound, markVoted } from '@/lib/voted-rounds';
import {
  ConnectingScreen,
  WaitingScreen,
  VotingScreen,
  ConfirmedScreen,
  ResultScreen,
  EndedScreen,
  ReconnectingScreen,
  ErrorScreen,
  SkWaitingScreen,
  SkCodeEntryScreen,
  SkVoteScreen,
  SkConfirmedScreen,
} from './screens';

interface VoterAppProps {
  presenterPeerId: string;
  transportMode: TransportMode;
}

export default function VoterApp({ presenterPeerId, transportMode }: VoterAppProps) {
  const [state, dispatch] = useReducer(voterReducer, initialVoterState);

  // Persistent device ID
  const deviceIdRef = useRef<string>('');
  const fingerprintRef = useRef<string | null>(null);

  // Timer interval ref
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stimmkarten mode refs
  const skCurrentCodeRef = useRef<string>('');
  const skVoteDataRef = useRef<{ options: string[]; voteType: VoteType; topic: string } | null>(null);

  // Keep dispatch accessible via ref for transport callbacks
  const dispatchRef = useRef<React.Dispatch<VoterAction>>(dispatch);
  dispatchRef.current = dispatch;

  // Track the current round ID in a ref for use inside callbacks
  const currentRoundIdRef = useRef<string | null>(null);
  currentRoundIdRef.current = state.currentRoundId;

  // Ref for the active transport so callbacks can reference it
  const transportRef = useRef<{ send: (msg: any) => void; markSessionEnded: () => void }>(null!);

  // --- Timer management ---

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      dispatchRef.current({ type: 'TIMER_UPDATE', seconds });
      timerIntervalRef.current = setInterval(() => {
        dispatchRef.current({
          type: 'TIMER_UPDATE',
          seconds: Math.max(0, --seconds),
        });
        if (seconds <= 0) {
          stopTimer();
        }
      }, 1000);
    },
    [stopTimer]
  );

  // --- Transport callbacks ---

  const handleData = useCallback(
    (data: HostMessage) => {
      switch (data.type) {
        case 'waiting': {
          stopTimer();
          dispatchRef.current({ type: 'WAITING', mode: data.mode });
          break;
        }

        case 'vote-started': {
          const alreadyVoted = hasVotedInRound(data.voteRoundId);
          dispatchRef.current({
            type: 'VOTE_STARTED',
            topic: data.topic,
            description: data.description,
            voteType: data.voteType,
            options: data.options,
            voteRoundId: data.voteRoundId,
            timerSeconds: data.timerSeconds,
            mode: data.mode,
          });
          if (alreadyVoted) {
            dispatchRef.current({ type: 'MARK_VOTED' });
          }
          if (data.timerSeconds > 0) {
            startTimer(data.timerSeconds);
          }
          break;
        }

        case 'vote-confirmed': {
          if (currentRoundIdRef.current) markVoted(currentRoundIdRef.current);
          stopTimer();
          dispatchRef.current({ type: 'VOTE_CONFIRMED' });
          break;
        }

        case 'already-voted': {
          if (currentRoundIdRef.current) markVoted(currentRoundIdRef.current);
          dispatchRef.current({ type: 'ALREADY_VOTED' });
          break;
        }

        case 'vote-closed': {
          stopTimer();
          dispatchRef.current({ type: 'VOTE_CLOSED', result: data.result });
          break;
        }

        case 'vote-cancelled': {
          stopTimer();
          dispatchRef.current({ type: 'VOTE_CANCELLED' });
          break;
        }

        case 'timer-update': {
          // Sync local timer with host timer
          dispatchRef.current({ type: 'TIMER_UPDATE', seconds: data.seconds });
          // If we have a running local timer, restart it from the synced value
          if (data.seconds > 0 && timerIntervalRef.current) {
            startTimer(data.seconds);
          }
          break;
        }

        case 'session-ended': {
          stopTimer();
          transportRef.current.markSessionEnded();
          dispatchRef.current({ type: 'SESSION_ENDED' });
          // Redirect voter to danke page
          window.location.href = '/danke';
          break;
        }

        case 'redirect': {
          transportRef.current.markSessionEnded();
          window.location.href = data.url;
          break;
        }

        case 'sk-result': {
          if (data.valid && data.options && data.voteType && data.topic) {
            // Code was valid — show vote screen
            skVoteDataRef.current = {
              options: data.options,
              voteType: data.voteType,
              topic: data.topic,
            };
            dispatchRef.current({ type: 'SET_SCREEN', screen: 'sk-vote' });
          } else {
            // Code invalid — stay on code entry, user will see error from SkCodeEntryScreen
            dispatchRef.current({ type: 'SET_SCREEN', screen: 'sk-code' });
          }
          break;
        }

        case 'sk-vote-result': {
          if (data.success) {
            skCurrentCodeRef.current = '';
            skVoteDataRef.current = null;
            dispatchRef.current({ type: 'SET_SCREEN', screen: 'sk-confirmed' });
          } else {
            // Vote failed (e.g., code already used) — go back to code entry
            skCurrentCodeRef.current = '';
            skVoteDataRef.current = null;
            dispatchRef.current({ type: 'SET_SCREEN', screen: 'sk-code' });
          }
          break;
        }

        default:
          break;
      }
    },
    [startTimer, stopTimer] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleConnected = useCallback(() => {
    dispatchRef.current({ type: 'CONNECTED' });
    // Register with the presenter
    transportRef.current.send({
      type: 'register',
      deviceId: deviceIdRef.current,
      fingerprintId: fingerprintRef.current,
    });
  }, []);

  const handleReconnecting = useCallback((attempt: number, max: number) => {
    dispatchRef.current({ type: 'RECONNECTING', attempt, max });
  }, []);

  const handleReconnectFailed = useCallback(() => {
    dispatchRef.current({ type: 'RECONNECT_FAILED' });
  }, []);

  // --- Both transports always instantiated (React Rules of Hooks) ---
  const p2pTransport = useVoterTransport({
    onData: handleData,
    onConnected: handleConnected,
    onReconnecting: handleReconnecting,
    onReconnectFailed: handleReconnectFailed,
  });

  const serverTransport = useServerVoterTransport({
    onData: handleData,
    onConnected: handleConnected,
    onReconnecting: handleReconnecting,
    onReconnectFailed: handleReconnectFailed,
  });

  const transport = transportMode === 'server' ? serverTransport : p2pTransport;
  transportRef.current = transport;

  // --- Initialization ---

  useEffect(() => {
    // Set up device ID
    let storedDeviceId = '';
    try {
      storedDeviceId = localStorage.getItem('drk-device-id') || '';
    } catch { /* ignore */ }
    if (!storedDeviceId) {
      storedDeviceId = 'dev-' + randomCode(16);
      try {
        localStorage.setItem('drk-device-id', storedDeviceId);
      } catch { /* ignore */ }
    }
    deviceIdRef.current = storedDeviceId;

    // Compute fingerprint
    generateDeviceFingerprint()
      .then((fp) => {
        fingerprintRef.current = fp;
      })
      .catch(() => {
        fingerprintRef.current = null;
      });

    // Cleanup old voted rounds
    cleanupVotedRounds();

    // Initialize the active transport and connect to presenter
    const activeTransport = transportMode === 'server' ? serverTransport : p2pTransport;
    activeTransport.init(presenterPeerId);

    return () => {
      stopTimer();
    };
  }, [presenterPeerId, transportMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Visibility change is already handled internally by both transport hooks

  // --- Vote handler (open mode) ---

  const handleVote = useCallback(
    (option: string) => {
      if (state.hasVoted) return;
      transport.send({
        type: 'cast-vote',
        option,
        deviceId: deviceIdRef.current,
        fingerprintId: fingerprintRef.current,
      });
    },
    [state.hasVoted, transport]
  );

  // --- Stimmkarten: submit code ---

  const handleSkSubmitCode = useCallback(
    (code: string) => {
      skCurrentCodeRef.current = code;
      transport.send({
        type: 'sk-validate',
        code,
      });
    },
    [transport]
  );

  // --- Stimmkarten: cast vote ---

  const handleSkVote = useCallback(
    (option: string) => {
      transport.send({
        type: 'sk-cast-vote',
        code: skCurrentCodeRef.current,
        option,
      });
    },
    [transport]
  );

  // --- Retry from error screen ---

  const handleRetry = useCallback(() => {
    transport.retryConnect();
  }, [transport]);

  // --- Render the appropriate screen ---

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
      {state.screen === 'connecting' && <ConnectingScreen />}

      {state.screen === 'waiting' && <WaitingScreen />}

      {state.screen === 'voting' && state.voteData && (
        <VotingScreen
          topic={state.voteData.topic}
          description={state.voteData.description}
          options={state.voteData.options}
          voteType={state.voteData.voteType}
          timerSecondsLeft={state.timerSecondsLeft}
          onVote={handleVote}
        />
      )}

      {state.screen === 'confirmed' && <ConfirmedScreen />}

      {state.screen === 'result' && state.resultData && (
        <ResultScreen result={state.resultData} />
      )}

      {state.screen === 'ended' && <EndedScreen />}

      {state.screen === 'reconnecting' && (
        <ReconnectingScreen
          attempt={state.reconnectAttempt}
          max={state.reconnectMax}
        />
      )}

      {state.screen === 'error' && <ErrorScreen onRetry={handleRetry} />}

      {state.screen === 'sk-waiting' && <SkWaitingScreen />}

      {state.screen === 'sk-code' && state.voteData && (
        <SkCodeEntryScreen
          topic={state.voteData.topic}
          description={state.voteData.description}
          timerSecondsLeft={state.timerSecondsLeft}
          onSubmitCode={handleSkSubmitCode}
        />
      )}

      {state.screen === 'sk-vote' && skVoteDataRef.current && (
        <SkVoteScreen
          topic={skVoteDataRef.current.topic}
          options={skVoteDataRef.current.options}
          voteType={skVoteDataRef.current.voteType}
          onVote={handleSkVote}
        />
      )}

      {state.screen === 'sk-confirmed' && <SkConfirmedScreen />}
    </div>
  );
}
