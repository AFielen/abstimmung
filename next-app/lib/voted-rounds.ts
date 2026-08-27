const VOTED_ROUND_TTL_MS = 86400000; // 24 hours

export function cleanupVotedRounds(): void {
  try {
    const stored = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}") as Record<string, boolean>;
    const now = Date.now();
    const cleaned: Record<string, boolean> = {};
    Object.keys(stored).forEach((key) => {
      const parts = key.split("-");
      const ts = parts.length >= 2 ? parseInt(parts[1], 10) : NaN;
      if (!isNaN(ts) && now - ts < VOTED_ROUND_TTL_MS) cleaned[key] = true;
    });
    localStorage.setItem("drk-voted-rounds", JSON.stringify(cleaned));
  } catch { /* ignore */ }
}

export function hasVotedInRound(roundId: string | null): boolean {
  if (!roundId) return false;
  if (sessionStorage.getItem("drk-voted-" + roundId)) return true;
  try {
    const rounds = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}") as Record<string, boolean>;
    if (rounds[roundId]) return true;
  } catch { /* ignore */ }
  return false;
}

export function markVoted(roundId: string | null): void {
  if (!roundId) return;
  try { sessionStorage.setItem("drk-voted-" + roundId, "1"); } catch { /* ignore */ }
  try {
    const rounds = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}") as Record<string, boolean>;
    rounds[roundId] = true;
    localStorage.setItem("drk-voted-rounds", JSON.stringify(rounds));
  } catch { /* ignore */ }
}
