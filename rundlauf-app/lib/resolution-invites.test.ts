import assert from "node:assert/strict";
import { partitionInviteResults } from "./resolution";

// ── partitionInviteResults ─────────────────────────────────────────────────
const recipients = [
  { userId: "u1", email: "a@example.org" },
  { userId: "u2", email: "b@example.org" },
  { userId: "u3", email: "c@example.org" },
];

// alle erfolgreich → alle in sentUserIds, keine Fehler
{
  const results: PromiseSettledResult<unknown>[] = [
    { status: "fulfilled", value: undefined },
    { status: "fulfilled", value: undefined },
    { status: "fulfilled", value: undefined },
  ];
  const out = partitionInviteResults(recipients, results);
  assert.deepEqual(out.sentUserIds, ["u1", "u2", "u3"]);
  assert.equal(out.failed.length, 0);
}

// gemischt → nur Erfolge markiert, Fehler mit Begründung erfasst
{
  const results: PromiseSettledResult<unknown>[] = [
    { status: "fulfilled", value: undefined },
    { status: "rejected", reason: new Error("Mailjet HTTP 500") },
    { status: "rejected", reason: "timeout" },
  ];
  const out = partitionInviteResults(recipients, results);
  assert.deepEqual(out.sentUserIds, ["u1"]);
  assert.deepEqual(out.failed, [
    { email: "b@example.org", reason: "Mailjet HTTP 500" },
    { email: "c@example.org", reason: "timeout" },
  ]);
}

// alle fehlgeschlagen → niemand wird als versandt markiert
{
  const results: PromiseSettledResult<unknown>[] = [
    { status: "rejected", reason: new Error("x") },
    { status: "rejected", reason: new Error("y") },
    { status: "rejected", reason: new Error("z") },
  ];
  const out = partitionInviteResults(recipients, results);
  assert.equal(out.sentUserIds.length, 0);
  assert.equal(out.failed.length, 3);
}

console.log("resolution-invites.test.ts: alle Assertions OK");
