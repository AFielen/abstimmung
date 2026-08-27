export type SessionMode = 'open' | 'stimmkarten';
export type TransportMode = 'p2p' | 'server';
export type VoteType = 'yes-no' | 'custom';
export type VoteOutcome = 'accepted' | 'rejected' | 'tie' | 'custom-winner';

export interface VoteData {
  topic: string;
  description: string;
  type: VoteType;
  options: string[];
  votes: Record<string, number>;
  totalCast: number;
  roundId: string;
  timerEnabled: boolean;
  timerSeconds: number;
  startedAt: Date | null;
}

export interface VoteResult {
  topic: string;
  description: string;
  type: VoteType;
  options: string[];
  votes: Record<string, number>;
  totalCast: number;
  totalVoters: number;
  notVoted: number;
  outcome: VoteOutcome;
  winner?: string;
  startedAt: Date | string | null;
  closedAt: Date | string;
}

export interface TokenInfo {
  votedInRounds: string[];
}

// Shape guard for messages arriving over the wire (PeerJS DataChannel or
// WS relay). Deliberately only checks for a `type` key — the value itself is
// narrowed by the switch statements in the consumers.
export function hasMessageType(value: unknown): value is { type: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value;
}

// Transport message types (used verbatim in P2P and server mode)
export type HostMessage =
  | { type: 'vote-started'; topic: string; description: string; voteType: VoteType; options: string[]; voteRoundId: string; timerSeconds: number; mode: SessionMode }
  | { type: 'vote-closed'; result: VoteResult }
  | { type: 'vote-cancelled' }
  | { type: 'vote-confirmed' }
  | { type: 'already-voted' }
  | { type: 'waiting'; mode: SessionMode }
  | { type: 'session-ended' }
  | { type: 'timer-update'; seconds: number }
  | { type: 'sk-result'; valid: boolean; reason?: string; options?: string[]; voteType?: VoteType; topic?: string }
  | { type: 'sk-vote-result'; success: boolean; reason?: string }
  | { type: 'pong' };

export type VoterMessage =
  | { type: 'cast-vote'; option: string; deviceId: string; fingerprintId: string | null }
  | { type: 'register'; deviceId: string; fingerprintId: string | null }
  | { type: 'sk-validate'; code: string }
  | { type: 'sk-cast-vote'; code: string; option: string }
  | { type: 'ping' };

// Presenter state
export type PresenterPhase = 'setup' | 'connecting' | 'ready' | 'voting' | 'result';

export interface PresenterState {
  phase: PresenterPhase;
  sessionTitle: string;
  voterCount: number;
  sessionMode: SessionMode;
  transportMode: TransportMode;
  currentVote: VoteData | null;
  history: VoteResult[];
  timerSecondsLeft: number;
  tokenCodes: Record<string, TokenInfo>;
}

// Voter state
export type VoterScreen =
  | 'connecting' | 'waiting' | 'voting' | 'confirmed' | 'result' | 'ended'
  | 'reconnecting' | 'error'
  | 'sk-waiting' | 'sk-code' | 'sk-vote' | 'sk-confirmed';

export interface VoterState {
  screen: VoterScreen;
  mode: SessionMode;
  currentRoundId: string | null;
  hasVoted: boolean;
  voteData: {
    topic: string;
    description: string;
    voteType: VoteType;
    options: string[];
    timerSeconds: number;
  } | null;
  resultData: VoteResult | null;
  timerSecondsLeft: number;
  reconnectAttempt: number;
  reconnectMax: number;
}
