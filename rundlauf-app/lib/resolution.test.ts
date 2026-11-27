import assert from "node:assert/strict";
import { computeAgendaItemResult, DEFAULT_OPTIONS } from "./resolution";

// Satzungsrelevante Grenzfälle: Quorum zählt alle Stimmen inkl. Enthaltung,
// Mehrheit nur Ja/Nein; "einfach" = > 50 %, "2/3" = >= 66,67 %, "3/4" = >= 75 %.
function run(opts: {
  eligible: number;
  ja?: number;
  nein?: number;
  enthaltung?: number;
  quorumPct?: number;
  mehrheit?: "simple" | "two_thirds" | "three_quarters";
}) {
  return computeAgendaItemResult({
    agendaItem: {
      optionen: DEFAULT_OPTIONS,
      quorumPct: opts.quorumPct ?? 75,
      mehrheit: opts.mehrheit ?? "simple",
    },
    eligibleCount: opts.eligible,
    voteCounts: {
      ja: opts.ja ?? 0,
      nein: opts.nein ?? 0,
      enthaltung: opts.enthaltung ?? 0,
    },
  });
}

// ── Quorum: exakt erreicht gilt als erreicht (keine Float-Artefakte) ─────
assert.equal(run({ eligible: 50, ja: 29, quorumPct: 58 }).quorumReached, true, "29/50 = 58 % erreicht 58 %");
assert.equal(run({ eligible: 50, ja: 28, quorumPct: 58 }).quorumReached, false, "28/50 = 56 % verfehlt 58 %");
assert.equal(run({ eligible: 100, ja: 57, quorumPct: 57 }).quorumReached, true, "57/100 erreicht 57 %");
assert.equal(run({ eligible: 4, ja: 3, quorumPct: 75 }).quorumReached, true, "3/4 erreicht 75 %");
assert.equal(run({ eligible: 4, ja: 2, quorumPct: 75 }).quorumReached, false, "2/4 verfehlt 75 %");
assert.equal(run({ eligible: 3, ja: 2, quorumPct: 75 }).quorumReached, false, "2/3 = 66,7 % verfehlt 75 %");
assert.equal(run({ eligible: 0, quorumPct: 75 }).quorumReached, false, "ohne Stimmberechtigte kein Quorum");

// ── Enthaltungen: zählen fürs Quorum, nicht für die Mehrheit ─────────────
{
  const r = run({ eligible: 4, ja: 1, enthaltung: 3 });
  assert.equal(r.quorumReached, true, "4/4 Beteiligung");
  assert.equal(r.effectiveVotes, 1);
  assert.equal(r.accepted, true, "1 Ja ohne Nein ist angenommen");
}

// ── Einfache Mehrheit: mehr als die Hälfte der Ja/Nein-Stimmen ───────────
assert.equal(run({ eligible: 10, ja: 5, nein: 5 }).accepted, false, "5:5 ist keine Mehrheit");
assert.equal(run({ eligible: 10, ja: 6, nein: 4 }).accepted, true, "6:4 ist Mehrheit");
assert.equal(run({ eligible: 10, ja: 0, nein: 0, enthaltung: 10 }).accepted, false, "nur Enthaltungen: abgelehnt");

// ── Zweidrittelmehrheit: >= 2/3 ───────────────────────────────────────────
assert.equal(run({ eligible: 3, ja: 2, nein: 1, mehrheit: "two_thirds" }).majorityReached, true, "2 von 3 erreicht 2/3");
assert.equal(run({ eligible: 100, ja: 66, nein: 34, mehrheit: "two_thirds" }).majorityReached, false, "66 von 100 verfehlt 2/3");
assert.equal(run({ eligible: 100, ja: 67, nein: 33, mehrheit: "two_thirds" }).majorityReached, true, "67 von 100 erreicht 2/3");
assert.equal(run({ eligible: 6, ja: 4, nein: 2, mehrheit: "two_thirds" }).majorityReached, true, "4 von 6 erreicht 2/3 exakt");

// ── Dreiviertelmehrheit: >= 3/4 ───────────────────────────────────────────
assert.equal(run({ eligible: 4, ja: 3, nein: 1, mehrheit: "three_quarters" }).majorityReached, true, "3 von 4 erreicht 3/4");
assert.equal(run({ eligible: 100, ja: 74, nein: 26, mehrheit: "three_quarters" }).majorityReached, false, "74 von 100 verfehlt 3/4");
assert.equal(run({ eligible: 8, ja: 6, nein: 2, mehrheit: "three_quarters" }).majorityReached, true, "6 von 8 erreicht 3/4 exakt");

// ── Angenommen nur bei Quorum UND Mehrheit ────────────────────────────────
assert.equal(run({ eligible: 10, ja: 2, nein: 0, quorumPct: 75 }).accepted, false, "Mehrheit ohne Quorum: abgelehnt");
assert.equal(run({ eligible: 10, ja: 8, nein: 2, quorumPct: 75 }).accepted, true, "Quorum und Mehrheit: angenommen");

// ── Anzeigewerte ──────────────────────────────────────────────────────────
{
  const r = run({ eligible: 3, ja: 2, mehrheit: "two_thirds" });
  assert.equal(r.participationPct, 66.7, "Beteiligung auf 0,1 gerundet");
  assert.equal(r.thresholdPct, 66.6666, "Schwelle für Anzeige unverändert");
  assert.deepEqual(
    r.perOption.map((o) => o.count),
    [2, 0, 0],
    "Stimmen pro Option in Optionsreihenfolge",
  );
}

console.log("resolution.test.ts: alle Assertions OK");
