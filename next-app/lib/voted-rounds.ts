const VOTED_ROUND_TTL_MS = 86400000; // 24 hours
const LS_KEY = "drk-voted-rounds";

/**
 * Entfernt abgelaufene Runden. Werte sind der Zeitpunkt der Stimmabgabe in
 * ms. Frueher stand hier `true` und der Zeitstempel wurde aus dem Schluessel
 * geparst (`<id>-<ts>`) — Round-IDs sind aber reine Zufallscodes ohne
 * Bindestrich, sodass JEDE Runde als abgelaufen galt und der Schutz vor
 * Doppelabstimmung in neuen Tabs wirkungslos war. Legacy-`true` bekommt
 * deshalb `now`, statt verworfen zu werden.
 */
export function pruneVotedRounds(
  stored: Record<string, unknown>,
  now: number,
): Record<string, number> {
  const kept: Record<string, number> = {};
  for (const [roundId, value] of Object.entries(stored)) {
    const ts = value === true ? now : typeof value === "number" ? value : NaN;
    if (!Number.isNaN(ts) && now - ts < VOTED_ROUND_TTL_MS) kept[roundId] = ts;
  }
  return kept;
}

function readRounds(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function cleanupVotedRounds(): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(pruneVotedRounds(readRounds(), Date.now())));
  } catch { /* ignore */ }
}

export function hasVotedInRound(roundId: string | null): boolean {
  if (!roundId) return false;
  try {
    if (sessionStorage.getItem("drk-voted-" + roundId)) return true;
  } catch { /* ignore */ }
  return Boolean(readRounds()[roundId]);
}

export function markVoted(roundId: string | null): void {
  if (!roundId) return;
  try { sessionStorage.setItem("drk-voted-" + roundId, "1"); } catch { /* ignore */ }
  try {
    const rounds = readRounds();
    rounds[roundId] = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(rounds));
  } catch { /* ignore */ }
}
