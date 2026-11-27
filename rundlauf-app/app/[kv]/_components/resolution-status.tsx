import type { ResolutionResult } from "@/lib/resolution";
import { formatPercent } from "@/lib/format";

type Tone = "success" | "warning" | "neutral";

export type ResolutionStatusProps = {
  result: ResolutionResult;
  quorumPct: number;
  /** Wenn gesetzt, wird ein Abschluss-Banner angezeigt. */
  closure?: {
    status: "abgeschlossen" | "zurueckgezogen";
    accepted: boolean;
  } | null;
  /** Optionales TOP-Label oben links, z. B. "TOP 1 — Titel". */
  topLabel?: string;
  /** Variant: kompakter (für Übersicht) oder voll (für Detail). */
  variant?: "full" | "compact";
};

export function ResolutionStatus({
  result,
  quorumPct,
  closure = null,
  topLabel,
  variant = "full",
}: ResolutionStatusProps) {
  const isCompact = variant === "compact";
  // While the vote is running, nothing is "missed" yet – show neutral wording.
  const running = closure === null;
  const withdrawn = closure?.status === "zurueckgezogen";
  const toneFor = (reached: boolean): Tone =>
    withdrawn ? "neutral" : reached ? "success" : running ? "neutral" : "warning";
  return (
    <div className={isCompact ? "" : "border-t pt-4"} style={isCompact ? {} : { borderColor: "var(--border)" }}>
      <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
        <h3 className={isCompact ? "font-bold text-sm" : "font-bold"}>
          {topLabel ? topLabel : "Stand"}
        </h3>
        {topLabel ? (
          <span className="text-xs" style={{ color: "var(--text-light)" }}>
            Stand
          </span>
        ) : null}
      </div>

      <div className={`grid sm:grid-cols-3 gap-${isCompact ? 2 : 3} mb-3`}>
        <Stat
          label="Abgegeben"
          value={`${result.voteCount} / ${result.eligibleCount} (${formatPercent(result.participationPct)})`}
          tone={toneFor(result.quorumReached)}
          compact={isCompact}
        />
        <Stat
          label="Quorum"
          value={
            withdrawn
              ? "Keine Auszählung"
              : result.quorumReached
                ? "Erreicht"
                : running
                  ? `Noch offen (mind. ${quorumPct} %)`
                  : `Verfehlt (mind. ${quorumPct} %)`
          }
          tone={toneFor(result.quorumReached)}
          compact={isCompact}
        />
        <Stat
          label="Mehrheit"
          value={
            withdrawn ? "Keine Auszählung" : result.majorityReached ? "Erreicht" : running ? "Noch offen" : "Verfehlt"
          }
          tone={toneFor(result.majorityReached)}
          compact={isCompact}
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--text-light)" }}>
            <th className="text-left py-2">Option</th>
            <th className="text-right py-2">Stimmen</th>
          </tr>
        </thead>
        <tbody>
          {result.perOption.map((o) => (
            <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-2">{o.label}</td>
              <td className="text-right py-2 font-mono">{o.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {closure ? (
        <div
          className="mt-3 rounded-lg p-3 text-sm"
          style={
            withdrawn
              ? { background: "#eef0f2", color: "#374151" }
              : {
                  background: closure.accepted ? "var(--success-bg)" : "var(--drk-bg)",
                  color: closure.accepted ? "var(--success)" : "var(--drk)",
                }
          }
        >
          <strong>
            {withdrawn
              ? "Verfahren zurückgezogen – keine Auszählung"
              : closure.accepted
                ? "Angenommen"
                : result.quorumReached
                  ? "Nicht angenommen – erforderliche Mehrheit verfehlt"
                  : "Nicht angenommen – Quorum verfehlt"}
          </strong>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: Tone;
  compact: boolean;
}) {
  const bg =
    tone === "success" ? "var(--success-bg)" : tone === "warning" ? "var(--warning-bg)" : "var(--bg)";
  const color =
    tone === "success" ? "var(--success)" : tone === "warning" ? "#b45309" : "var(--text)";
  return (
    <div className={`rounded-lg ${compact ? "p-2" : "p-3"}`} style={{ background: bg, color }}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className={`${compact ? "text-sm" : "text-base"} font-bold mt-1`}>{value}</div>
    </div>
  );
}
