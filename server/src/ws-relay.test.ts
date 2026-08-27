import assert from 'node:assert/strict';
import { maxMessagesPerSecond, parseMaxConnectionsPerIp, validateDataPayload } from './ws-relay';

// ── maxMessagesPerSecond ────────────────────────────────────────────────────
// Host limit must cover a full room's worth of pong replies arriving in the
// same second (MAX_VOTERS_PER_ROOM) on top of the base budget.
assert.equal(maxMessagesPerSecond('host'), 320, 'host limit covers full room');
assert.equal(maxMessagesPerSecond('voter'), 20, 'voter limit stays strict');
assert.equal(maxMessagesPerSecond(null), 20, 'pre-join sockets stay strict');

// ── parseMaxConnectionsPerIp ────────────────────────────────────────────────
assert.equal(parseMaxConnectionsPerIp(undefined), 200, 'default when unset');
assert.equal(parseMaxConnectionsPerIp(''), 200, 'default when empty');
assert.equal(parseMaxConnectionsPerIp('abc'), 200, 'default when non-numeric');
assert.equal(parseMaxConnectionsPerIp('0'), 200, 'default when zero');
assert.equal(parseMaxConnectionsPerIp('-5'), 200, 'default when negative');
assert.equal(parseMaxConnectionsPerIp('10.5'), 200, 'default when non-integer');
assert.equal(parseMaxConnectionsPerIp('10'), 10, 'override honoured');
assert.equal(parseMaxConnectionsPerIp('500'), 500, 'large override honoured');

// ── validateDataPayload: realistic vote-started payload passes ──────────────
// Mirrors the client-side limits in NewVoteForm.tsx (topic 200, description
// 1000, options ≤200 chars / ≤30 entries) so a maxed-out vote is never dropped
// by the relay's payload validation.
const maxedVoteStarted = {
  type: 'vote-started',
  voteRoundId: 'round-123',
  topic: 'T'.repeat(200),
  description: 'D'.repeat(1000),
  voteType: 'custom',
  options: Array.from({ length: 30 }, (_, i) => `Option ${i} ` + 'x'.repeat(190)),
  timerSeconds: 300,
  mode: 'open',
};
assert.equal(validateDataPayload(maxedVoteStarted), true, 'maxed vote-started passes');

// A yes/no vote-started payload passes.
assert.equal(
  validateDataPayload({
    type: 'vote-started',
    voteRoundId: 'r1',
    topic: 'Genehmigung des Jahresberichts',
    description: '',
    voteType: 'yes-no',
    options: ['Ja', 'Nein', 'Enthaltung'],
    timerSeconds: 0,
    mode: 'open',
  }),
  true,
  'yes-no vote-started passes',
);

// Guards still bite: an over-long string is rejected.
assert.equal(validateDataPayload({ s: 'x'.repeat(1025) }), false, 'over-long string rejected');

console.log('ws-relay.test.ts: alle Assertions OK');
