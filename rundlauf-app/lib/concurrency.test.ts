import assert from "node:assert/strict";
import { mapWithConcurrency } from "./concurrency";

async function main() {
  // Reihenfolge bleibt erhalten, auch wenn spätere Items früher fertig sind
  let active = 0;
  let maxActive = 0;
  const delays = [30, 0, 20, 5, 10, 15];
  const out = await mapWithConcurrency(delays, 2, async (d, i) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, d));
    active--;
    return i * 2;
  });
  assert.deepEqual(out, [0, 2, 4, 6, 8, 10], "Ergebnis in Eingabereihenfolge");
  assert.ok(maxActive <= 2, `Parallelität begrenzt auf 2 (war ${maxActive})`);

  assert.deepEqual(await mapWithConcurrency([], 3, async () => 1), [], "leere Liste");

  const single = await mapWithConcurrency(["a"], 10, async (s) => s.toUpperCase());
  assert.deepEqual(single, ["A"], "Limit größer als Item-Anzahl");

  console.log("concurrency.test.ts: alle Assertions OK");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
