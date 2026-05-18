import type { Resolution } from "@/lib/db/schema";

export type ResolutionOption = {
  id: string;
  label: string;
  /** Enthaltung: zählt fürs Quorum, nicht für die Mehrheit */
  isAbstain?: boolean;
};

export const DEFAULT_OPTIONS: ResolutionOption[] = [
  { id: "ja", label: "Ja" },
  { id: "nein", label: "Nein" },
  { id: "enthaltung", label: "Enthaltung", isAbstain: true },
];

export type ResolutionResult = {
  /** Anzahl Stimmberechtigte (Snapshot) */
  eligibleCount: number;
  /** Anzahl abgegebener Stimmen */
  voteCount: number;
  /** Beteiligungsquote in Prozent (0-100, gerundet auf 0.1) */
  participationPct: number;
  /** Quorum erreicht (≥ quorumPct) */
  quorumReached: boolean;
  /** Stimmen pro Option */
  perOption: Array<{ id: string; label: string; count: number }>;
  /** Nur "Nicht-Enthaltung"-Stimmen */
  effectiveVotes: number;
  /** Stimmen für "Ja" (erste Nicht-Enthaltung-Option) */
  yesCount: number;
  /** Stimmen für "Nein" (zweite Nicht-Enthaltung-Option) */
  noCount: number;
  /** Erforderliche Mehrheits-Schwelle in Prozent */
  thresholdPct: number;
  /** Mehrheit erreicht */
  majorityReached: boolean;
  /** Beschluss angenommen */
  accepted: boolean;
};

const MAJORITY_THRESHOLD: Record<string, number> = {
  simple: 50.0,
  two_thirds: 66.6666,
  three_quarters: 75.0,
};

export function parseOptions(raw: unknown): ResolutionOption[] {
  if (!Array.isArray(raw)) return DEFAULT_OPTIONS;
  const out: ResolutionOption[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      "label" in item &&
      typeof (item as { id: unknown }).id === "string" &&
      typeof (item as { label: unknown }).label === "string"
    ) {
      out.push({
        id: (item as { id: string }).id,
        label: (item as { label: string }).label,
        isAbstain: Boolean((item as { isAbstain?: unknown }).isAbstain),
      });
    }
  }
  return out.length > 0 ? out : DEFAULT_OPTIONS;
}

export function computeResult(opts: {
  resolution: Pick<Resolution, "optionen" | "quorumPct" | "mehrheit">;
  eligibleCount: number;
  /** Map optionId → Anzahl Stimmen */
  voteCounts: Record<string, number>;
}): ResolutionResult {
  const options = parseOptions(opts.resolution.optionen);
  const perOption = options.map((o) => ({
    id: o.id,
    label: o.label,
    count: opts.voteCounts[o.id] ?? 0,
  }));
  const voteCount = perOption.reduce((s, o) => s + o.count, 0);
  const eligibleCount = Math.max(opts.eligibleCount, 0);
  const participationPct = eligibleCount === 0 ? 0 : (voteCount / eligibleCount) * 100;
  const quorumPct = opts.resolution.quorumPct ?? 75;
  const quorumReached = participationPct >= quorumPct;

  const nonAbstain = options.filter((o) => !o.isAbstain);
  const yesOpt = nonAbstain[0];
  const noOpt = nonAbstain[1];
  const yesCount = yesOpt ? (opts.voteCounts[yesOpt.id] ?? 0) : 0;
  const noCount = noOpt ? (opts.voteCounts[noOpt.id] ?? 0) : 0;
  const effectiveVotes = yesCount + noCount;
  const thresholdPct = MAJORITY_THRESHOLD[opts.resolution.mehrheit] ?? 50;
  const yesPct = effectiveVotes === 0 ? 0 : (yesCount / effectiveVotes) * 100;
  const majorityReached =
    opts.resolution.mehrheit === "simple" ? yesPct > thresholdPct : yesPct >= thresholdPct;

  return {
    eligibleCount,
    voteCount,
    participationPct: Math.round(participationPct * 10) / 10,
    quorumReached,
    perOption,
    effectiveVotes,
    yesCount,
    noCount,
    thresholdPct,
    majorityReached,
    accepted: quorumReached && majorityReached,
  };
}

export function isPastDeadline(fristEnde: Date): boolean {
  return new Date(fristEnde).getTime() <= Date.now();
}

export const MIN_FRIST_DAYS = 14;
