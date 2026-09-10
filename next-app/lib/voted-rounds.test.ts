import assert from "node:assert/strict";
import { pruneVotedRounds } from "./voted-rounds";

const now = 1_700_000_000_000;
const H = 3_600_000;

// Frische Runde bleibt mit ihrem Zeitstempel erhalten
assert.deepEqual(pruneVotedRounds({ abc123: now - H }, now), { abc123: now - H });

// Aelter als 24h wird entfernt
assert.deepEqual(pruneVotedRounds({ old: now - 25 * H }, now), {});

// Regression: Legacy-`true` (Round-ID ohne Bindestrich) wurde bisher als
// abgelaufen verworfen — jetzt bleibt sie und bekommt einen Zeitstempel
assert.deepEqual(pruneVotedRounds({ v27gwww26v8z: true }, now), { v27gwww26v8z: now });

// Unbrauchbare oder uralte Werte werden verworfen
assert.deepEqual(pruneVotedRounds({ x: "nope", y: null, z: -1 }, now), {});
assert.deepEqual(pruneVotedRounds({}, now), {});

console.log("voted-rounds: ok");
