import type { VoterState, VoteResult, SessionMode, VoteType } from './types';

export type VoterAction =
  | { type: 'SET_SCREEN'; screen: VoterState['screen'] }
  | { type: 'SET_MODE'; mode: SessionMode }
  | { type: 'VOTE_STARTED'; topic: string; description: string; voteType: VoteType; options: string[]; voteRoundId: string; timerSeconds: number; mode: SessionMode }
  | { type: 'VOTE_CONFIRMED' }
  | { type: 'ALREADY_VOTED' }
  | { type: 'VOTE_CLOSED'; result: VoteResult }
  | { type: 'VOTE_CANCELLED' }
  | { type: 'SESSION_ENDED' }
  | { type: 'RECONNECTING'; attempt: number; max: number }
  | { type: 'RECONNECT_FAILED' }
  | { type: 'CONNECTED' }
  | { type: 'TIMER_UPDATE'; seconds: number }
  | { type: 'WAITING'; mode: SessionMode }
  | { type: 'MARK_VOTED' };

export const initialVoterState: VoterState = {
  screen: 'connecting',
  mode: 'open',
  currentRoundId: null,
  hasVoted: false,
  voteData: null,
  resultData: null,
  timerSecondsLeft: 0,
  reconnectAttempt: 0,
  reconnectMax: 5,
};

export function voterReducer(state: VoterState, action: VoterAction): VoterState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'WAITING':
      return {
        ...state,
        mode: action.mode,
        screen: action.mode === 'stimmkarten' ? 'sk-waiting' : 'waiting',
      };
    case 'VOTE_STARTED':
      return {
        ...state,
        mode: action.mode,
        currentRoundId: action.voteRoundId,
        hasVoted: false,
        voteData: {
          topic: action.topic,
          description: action.description,
          voteType: action.voteType,
          options: action.options,
          timerSeconds: action.timerSeconds,
        },
        timerSecondsLeft: action.timerSeconds,
        screen: action.mode === 'stimmkarten' ? 'sk-code' : 'voting',
      };
    case 'VOTE_CONFIRMED':
    case 'ALREADY_VOTED':
    case 'MARK_VOTED':
      return { ...state, hasVoted: true, screen: 'confirmed' };
    case 'VOTE_CLOSED':
      return {
        ...state,
        resultData: action.result,
        screen: state.mode === 'stimmkarten' ? 'sk-waiting' : 'result',
        timerSecondsLeft: 0,
      };
    case 'VOTE_CANCELLED':
      return {
        ...state,
        hasVoted: false,
        currentRoundId: null,
        timerSecondsLeft: 0,
        screen: state.mode === 'stimmkarten' ? 'sk-waiting' : 'waiting',
      };
    case 'SESSION_ENDED':
      return { ...state, screen: 'ended', timerSecondsLeft: 0 };
    case 'RECONNECTING':
      return {
        ...state,
        screen: 'reconnecting',
        reconnectAttempt: action.attempt,
        reconnectMax: action.max,
      };
    case 'RECONNECT_FAILED':
      return { ...state, screen: 'error' };
    case 'CONNECTED':
      return { ...state, reconnectAttempt: 0 };
    case 'TIMER_UPDATE':
      // Unveraendert -> gleicher State, damit React den Re-Render ueberspringt
      if (state.timerSecondsLeft === action.seconds) return state;
      return { ...state, timerSecondsLeft: action.seconds };
    default:
      return state;
  }
}
