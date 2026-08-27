// Random code generator using crypto.getRandomValues
export function randomCode(len: number): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) r += c[arr[i] % c.length];
  } else {
    for (let i = 0; i < len; i++) r += c[Math.floor(Math.random() * c.length)];
  }
  return r;
}

// CSS class for a vote option; buttons (voter) and result bars (presenter)
// share the same mapping
export function voteOptionCls(opt: string, type: string): string {
  if (type === "yes-no") {
    if (opt === "Ja") return "ja";
    if (opt === "Nein") return "nein";
    return "enthaltung";
  }
  return "custom";
}

// Bar chart colors, shared by ActiveVote and VoteResultDisplay
export const BAR_COLORS: Record<string, string> = {
  ja: "#2e7d32",
  nein: "#c62828",
  enthaltung: "#f9a825",
  custom: "#1565c0",
};

export const CUSTOM_COLORS = [
  "#1565c0", "#2e7d32", "#c62828", "#f9a825",
  "#6a1b9a", "#00838f", "#e65100", "#4e342e",
];

// Badge colors per outcome, shared by VoteResultDisplay and VoteHistory
// (the label texts differ per surface and stay local)
export const OUTCOME_BADGE_COLORS: Record<string, { color: string; bg: string }> = {
  accepted: { color: "#2e7d32", bg: "#e8f5e9" },
  rejected: { color: "#c62828", bg: "#ffebee" },
  tie: { color: "#f57f17", bg: "#fff8e1" },
  "custom-winner": { color: "#2e7d32", bg: "#e8f5e9" },
  default: { color: "var(--text)", bg: "#f5f5f5" },
};

// Format timer time
export function formatTimerTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
