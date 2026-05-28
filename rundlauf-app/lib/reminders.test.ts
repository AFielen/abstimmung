import assert from "node:assert/strict";
import { classifyVoter, isPastHalftime } from "./reminders";

// ── isPastHalftime ────────────────────────────────────────────────────────
{
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-15T00:00:00Z"); // 14 Tage Laufzeit
  const halftime = new Date("2026-01-08T00:00:00Z");

  assert.equal(isPastHalftime(start, end, new Date("2026-01-07T23:59:00Z")), false);
  assert.equal(isPastHalftime(start, end, halftime), true);
  assert.equal(isPastHalftime(start, end, new Date("2026-01-10T00:00:00Z")), true);
  assert.equal(isPastHalftime(null, end, halftime), false); // kein startedAt
  assert.equal(isPastHalftime(end, start, halftime), false); // entartet: end <= start
}

// ── classifyVoter ─────────────────────────────────────────────────────────
const halftime = new Date("2026-01-08T00:00:00Z");
const beforeHalf = new Date("2026-01-05T00:00:00Z");
const afterHalf = new Date("2026-01-10T00:00:00Z");

// removed / kein Membership → skip
assert.equal(
  classifyVoter({ membershipStatus: "removed", voteCount: 0, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);
assert.equal(
  classifyVoter({ membershipStatus: null, voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "skip",
);
// vollständig abgestimmt → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 2, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);
// eingeladen (nie beigetreten) → invite_reminder, auch bei inviteEmailSentAt = null
assert.equal(
  classifyVoter({ membershipStatus: "invited", voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "invite_reminder",
);
// aktiv, unvollständig, vor Halbzeit benachrichtigt → vote_reminder
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 1, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "vote_reminder",
);
// aktiv, unvollständig, inviteEmailSentAt null (Anomalie) → vote_reminder (Sicherheitsnetz)
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "vote_reminder",
);
// Guard: aktiv, nach Halbzeit benachrichtigt (spät beigetreten) → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 2, inviteEmailSentAt: afterHalf, halftime }),
  "skip",
);
// entartet: topCount 0 → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 0, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);

console.log("reminders.test.ts: alle Assertions OK");
