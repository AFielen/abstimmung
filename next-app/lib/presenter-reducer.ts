import type {
  PresenterState,
  PresenterPhase,
  SessionMode,
  TransportMode,
  VoteData,
  VoteResult,
  TokenInfo,
} from './types';

export const initialPresenterState: PresenterState = {
  phase: 'setup',
  sessionTitle: '',
  voterCount: 0,
  sessionMode: 'open',
  transportMode: 'p2p',
  currentVote: null,
  history: [],
  timerSecondsLeft: 0,
  connectedCount: 0,
  disconnectedCount: 0,
  tokenCodes: {},
};

export type PresenterAction =
  | { type: 'SET_PHASE'; phase: PresenterPhase }
  | { type: 'START_SESSION'; title: string; voterCount: number; mode: SessionMode; transportMode: TransportMode; tokenCodes: Record<string, TokenInfo> }
  | { type: 'START_VOTE'; vote: VoteData }
  | { type: 'RECORD_VOTE'; option: string }
  | { type: 'CLOSE_VOTE'; result: VoteResult }
  | { type: 'CANCEL_VOTE' }
  | { type: 'TIMER_TICK' }
  | { type: 'SET_CONNECTIONS'; connected: number; disconnected: number }
  | { type: 'MARK_TOKEN_USED'; code: string; roundId: string }
  | { type: 'NEXT_VOTE' }
  | { type: 'RESET' };

export function presenterReducer(
  state: PresenterState,
  action: PresenterAction,
): PresenterState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'START_SESSION':
      return {
        ...state,
        phase: 'connecting',
        sessionTitle: action.title,
        voterCount: action.voterCount,
        sessionMode: action.mode,
        transportMode: action.transportMode,
        tokenCodes: action.tokenCodes,
      };

    case 'START_VOTE':
      return {
        ...state,
        phase: 'voting',
        currentVote: action.vote,
        timerSecondsLeft: action.vote.timerEnabled ? action.vote.timerSeconds : 0,
      };

    case 'RECORD_VOTE':
      if (!state.currentVote) return state;
      return {
        ...state,
        currentVote: {
          ...state.currentVote,
          votes: {
            ...state.currentVote.votes,
            [action.option]: (state.currentVote.votes[action.option] || 0) + 1,
          },
          totalCast: state.currentVote.totalCast + 1,
        },
      };

    case 'CLOSE_VOTE':
      return {
        ...state,
        phase: 'result',
        currentVote: null,
        history: [...state.history, action.result],
        timerSecondsLeft: 0,
      };

    case 'CANCEL_VOTE':
      return {
        ...state,
        phase: 'ready',
        currentVote: null,
        timerSecondsLeft: 0,
      };

    case 'TIMER_TICK':
      return {
        ...state,
        timerSecondsLeft: Math.max(0, state.timerSecondsLeft - 1),
      };

    case 'SET_CONNECTIONS':
      return {
        ...state,
        connectedCount: action.connected,
        disconnectedCount: action.disconnected,
      };

    case 'MARK_TOKEN_USED': {
      const token = state.tokenCodes[action.code];
      if (!token) return state;
      return {
        ...state,
        tokenCodes: {
          ...state.tokenCodes,
          [action.code]: {
            ...token,
            votedInRounds: [...token.votedInRounds, action.roundId],
          },
        },
      };
    }

    case 'NEXT_VOTE':
      return { ...state, phase: 'ready', currentVote: null };

    case 'RESET':
      return initialPresenterState;

    default:
      return state;
  }
}
