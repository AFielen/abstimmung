import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eligibleVoters, votes } from "@/lib/db/schema";

type Row = {
  userId: string;
  name: string;
  email: string;
  votedTops: number;
  lastVotedAt: Date | null;
};

export async function VoterStatusPanel({
  resolutionId,
  topIds,
}: {
  resolutionId: string;
  topIds: string[];
}) {
  const totalTops = topIds.length;

  const eligible = await db
    .select({
      userId: eligibleVoters.userId,
      name: eligibleVoters.nameSnapshot,
      email: eligibleVoters.emailSnapshot,
    })
    .from(eligibleVoters)
    .where(eq(eligibleVoters.resolutionId, resolutionId));

  const voteAgg =
    totalTops > 0
      ? await db
          .select({
            userId: votes.userId,
            votedTops: sql<number>`count(*)::int`,
            lastVotedAt: sql<Date>`max(${votes.updatedAt})`,
          })
          .from(votes)
          .where(inArray(votes.agendaItemId, topIds))
          .groupBy(votes.userId)
      : [];

  const byUser = new Map<string, { votedTops: number; lastVotedAt: Date | null }>();
  for (const v of voteAgg) {
    byUser.set(v.userId, {
      votedTops: Number(v.votedTops) || 0,
      lastVotedAt: v.lastVotedAt ? new Date(v.lastVotedAt) : null,
    });
  }

  const rows: Row[] = eligible.map((e) => {
    const v = byUser.get(e.userId);
    return {
      userId: e.userId,
      name: e.name,
      email: e.email,
      votedTops: v?.votedTops ?? 0,
      lastVotedAt: v?.lastVotedAt ?? null,
    };
  });

  const eligibleCount = rows.length;
  const completedCount = rows.filter((r) => r.votedTops === totalTops && totalTops > 0).length;
  const partialCount = rows.filter((r) => r.votedTops > 0 && r.votedTops < totalTops).length;
  const pendingCount = rows.filter((r) => r.votedTops === 0).length;
  const pct = eligibleCount > 0 ? (completedCount / eligibleCount) * 100 : 0;

  const collator = new Intl.Collator("de", { sensitivity: "base" });
  const pending = rows
    .filter((r) => r.votedTops < totalTops)
    .sort((a, b) => collator.compare(a.name, b.name));
  const voted = rows
    .filter((r) => r.votedTops === totalTops && totalTops > 0)
    .sort((a, b) => {
      const ta = a.lastVotedAt?.getTime() ?? 0;
      const tb = b.lastVotedAt?.getTime() ?? 0;
      return tb - ta;
    });

  return (
    <section className="drk-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold">Teilnahme</h2>
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
          Nur sichtbar für Admins
        </span>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
        Du siehst, <strong>wer</strong> bereits abgegeben hat — die Stimme selbst bleibt geheim.
      </p>

      <div className="rounded-xl p-4 sm:p-5 mb-5" style={{ background: "var(--bg)" }}>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
              Abgegeben
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
                {completedCount}
              </span>
              <span className="text-base sm:text-lg tabular-nums" style={{ color: "var(--text-light)" }}>
                / {eligibleCount}
              </span>
              <span className="text-sm tabular-nums ml-1" style={{ color: "var(--text-light)" }}>
                ({pct.toFixed(1)} %)
              </span>
            </div>
          </div>
          <div className="text-right text-xs leading-relaxed" style={{ color: "var(--text-light)" }}>
            {totalTops > 1 ? (
              <>
                {partialCount > 0 ? (
                  <div>
                    <span className="font-bold tabular-nums" style={{ color: "#b45309" }}>
                      {partialCount}
                    </span>{" "}
                    teilweise
                  </div>
                ) : null}
                <div>
                  <span className="font-bold tabular-nums" style={{ color: "var(--text)" }}>
                    {pendingCount}
                  </span>{" "}
                  offen
                </div>
              </>
            ) : (
              <div>
                <span className="font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {pendingCount}
                </span>{" "}
                noch offen
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-4 h-2 rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              background: "var(--success)",
              transition: "width 600ms ease-out",
            }}
          />
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="mb-5">
          <SubHeader
            dotColor="var(--text-muted)"
            label={totalTops > 1 ? "Offen / Teilweise" : "Noch offen"}
            count={pending.length}
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pending.map((r) => (
              <VoterRow
                key={r.userId}
                row={r}
                totalTops={totalTops}
                state={r.votedTops > 0 ? "partial" : "pending"}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {voted.length > 0 ? (
        <div>
          <SubHeader dotColor="var(--success)" label="Abgegeben" count={voted.length} />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {voted.map((r) => (
              <VoterRow key={r.userId} row={r} totalTops={totalTops} state="done" />
            ))}
          </ul>
        </div>
      ) : null}

      {eligibleCount === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-light)" }}>
          Keine Stimmberechtigten hinterlegt.
        </p>
      ) : null}
    </section>
  );
}

function SubHeader({
  dotColor,
  label,
  count,
}: {
  dotColor: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        aria-hidden
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: dotColor }}
      />
      <span
        className="text-xs uppercase tracking-wide font-semibold"
        style={{ color: "var(--text-light)" }}
      >
        {label}
      </span>
      <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
        ({count})
      </span>
    </div>
  );
}

function VoterRow({
  row,
  totalTops,
  state,
}: {
  row: Row;
  totalTops: number;
  state: "done" | "partial" | "pending";
}) {
  const dotStyle =
    state === "done"
      ? { background: "var(--success)", boxShadow: "0 0 0 3px var(--success-bg)" }
      : state === "partial"
        ? { background: "#fbbf24", boxShadow: "0 0 0 3px var(--warning-bg)" }
        : {
            background: "transparent",
            boxShadow: "inset 0 0 0 2px var(--text-muted)",
          };

  const meta =
    state === "done"
      ? row.lastVotedAt
        ? `Abgegeben am ${new Date(row.lastVotedAt).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })} Uhr`
        : "Abgegeben"
      : state === "partial"
        ? `${row.votedTops} / ${totalTops} TOPs abgegeben`
        : totalTops > 1
          ? `0 / ${totalTops} TOPs`
          : "Noch nicht abgestimmt";

  return (
    <li
      className="flex items-start gap-3 rounded-lg p-3"
      style={{
        background: "var(--white)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden
        className="inline-block w-3 h-3 rounded-full shrink-0 mt-1.5"
        style={dotStyle}
      />
      <div className="min-w-0 flex-1">
        <div className="font-semibold break-words leading-snug" style={{ color: "var(--text)" }}>
          {row.name}
        </div>
        <div
          className="text-xs break-all leading-snug"
          style={{ color: "var(--text-light)" }}
        >
          {row.email}
        </div>
        <div
          className="text-xs mt-1 tabular-nums leading-snug"
          style={{
            color:
              state === "done"
                ? "var(--success)"
                : state === "partial"
                  ? "#b45309"
                  : "var(--text-muted)",
          }}
        >
          {meta}
        </div>
      </div>
    </li>
  );
}
