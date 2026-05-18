import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bodies, eligibleVoters, organizations, resolutions, votes } from "@/lib/db/schema";
import { computeResult, isPastDeadline, parseOptions } from "@/lib/resolution";
import { requireTenantContext } from "@/lib/tenant";
import { VoteForm } from "./vote-form";
import { AdminActions } from "./admin-actions";

export const dynamic = "force-dynamic";

export default async function ResolutionPage({
  params,
}: {
  params: Promise<{ kv: string; id: string }>;
}) {
  const { kv, id } = await params;
  const ctx = await requireTenantContext(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) notFound();

  // Body + Organisation laden (für Anzeige)
  const bodyInfo = r.bodyId
    ? (
        await db
          .select({
            bodyName: bodies.name,
            organizationName: organizations.name,
          })
          .from(bodies)
          .leftJoin(organizations, eq(organizations.id, bodies.organizationId))
          .where(eq(bodies.id, r.bodyId))
          .limit(1)
      )[0]
    : null;

  // Berechtigung & aktuelle Stimme
  const eligibleRow = (
    await db
      .select()
      .from(eligibleVoters)
      .where(
        and(eq(eligibleVoters.resolutionId, r.id), eq(eligibleVoters.userId, ctx.user.id)),
      )
      .limit(1)
  )[0];
  const isEligible = Boolean(eligibleRow);

  const myVote = isEligible
    ? (
        await db
          .select()
          .from(votes)
          .where(and(eq(votes.resolutionId, r.id), eq(votes.userId, ctx.user.id)))
          .limit(1)
      )[0]
    : undefined;

  // Live-Ergebnis
  const eligibleCount = (
    await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eligibleVoters)
      .where(eq(eligibleVoters.resolutionId, r.id))
  )[0]?.count ?? 0;

  const rows = await db
    .select({ optionId: votes.optionId, c: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.resolutionId, r.id))
    .groupBy(votes.optionId);
  const voteCounts: Record<string, number> = {};
  for (const row of rows) voteCounts[row.optionId] = row.c;

  const result = computeResult({ resolution: r, eligibleCount, voteCounts });
  const options = parseOptions(r.optionen);
  const past = isPastDeadline(r.fristEnde);
  const stoppedEarly = r.status === "abgeschlossen" || r.status === "zurueckgezogen";
  const canVote = r.status === "laufend" && !past && isEligible;

  return (
    <div className="flex flex-col gap-6">
      <header className="drk-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
            {bodyInfo ? (
              <div className="text-xs uppercase tracking-wide mt-2" style={{ color: "var(--text-light)" }}>
                {bodyInfo.organizationName ? `${bodyInfo.organizationName} · ` : ""}{bodyInfo.bodyName}
              </div>
            ) : null}
            <h1 className="text-2xl font-bold mt-1">{r.titel}</h1>
            <div className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
              Frist: {new Date(r.fristEnde).toLocaleString("de-DE")} ·{" "}
              {past ? "abgelaufen" : "noch offen"}
              {" · "}
              {r.voteChangeMode === "fest" ? "Feste Stimmen" : "Änderbar bis Frist"}
              {" · "}
              Quorum {r.quorumPct} %
              {" · "}
              {mehrheitLabel(r.mehrheit)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {r.status === "abgeschlossen" ? (
              <Link
                href={`/${kv}/beschluss/${r.id}/pdf`}
                className="drk-btn-secondary"
                target="_blank"
              >
                Protokoll-PDF
              </Link>
            ) : null}
          </div>
        </div>

        {r.begruendungMd ? (
          <div className="mt-4 whitespace-pre-wrap text-sm">{r.begruendungMd}</div>
        ) : null}
      </header>

      {canVote ? (
        <section className="drk-card">
          <h2 className="text-lg font-bold mb-3">Deine Stimme</h2>
          <VoteForm
            kv={kv}
            resolutionId={r.id}
            options={options}
            currentOptionId={myVote?.optionId ?? null}
            mode={r.voteChangeMode}
            alreadyVoted={Boolean(myVote)}
          />
        </section>
      ) : null}

      {!canVote && isEligible ? (
        <section className="drk-card">
          <h2 className="text-lg font-bold mb-3">Deine Stimme</h2>
          {myVote ? (
            <p>
              Du hast abgestimmt: <strong>{options.find((o) => o.id === myVote.optionId)?.label ?? myVote.optionId}</strong>
              {" · "}
              <span style={{ color: "var(--text-light)" }}>
                {new Date(myVote.updatedAt).toLocaleString("de-DE")}
              </span>
            </p>
          ) : (
            <p style={{ color: "var(--text-light)" }}>
              Du hast nicht abgestimmt.
            </p>
          )}
        </section>
      ) : null}

      {!isEligible ? (
        <section className="drk-card">
          <p style={{ color: "var(--text-light)" }}>
            Du bist für diesen Beschluss nicht stimmberechtigt. (Mitgliedschaft wurde nach
            Beschluss-Eröffnung angelegt oder ist nicht aktiv.)
          </p>
        </section>
      ) : null}

      <section className="drk-card">
        <h2 className="text-lg font-bold mb-3">Aktueller Stand</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Stimmberechtigt" value={result.eligibleCount.toString()} />
          <Stat
            label="Abgegeben"
            value={`${result.voteCount} (${result.participationPct.toFixed(1)} %)`}
            tone={result.quorumReached ? "success" : "warning"}
          />
          <Stat
            label="Quorum"
            value={result.quorumReached ? "Erreicht" : `Min. ${r.quorumPct} %`}
            tone={result.quorumReached ? "success" : "warning"}
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

        {stoppedEarly && r.ergebnis ? (
          <div
            className="mt-4 rounded-lg p-4"
            style={{
              background: (r.ergebnis as { accepted?: boolean }).accepted
                ? "var(--success-bg)"
                : "var(--drk-bg)",
              color: (r.ergebnis as { accepted?: boolean }).accepted
                ? "var(--success)"
                : "var(--drk)",
            }}
          >
            <strong>
              {(r.ergebnis as { accepted?: boolean }).accepted
                ? "Beschluss angenommen"
                : r.status === "zurueckgezogen"
                  ? "Beschluss zurückgezogen"
                  : "Beschluss abgelehnt / Quorum verfehlt"}
            </strong>
          </div>
        ) : null}
      </section>

      {ctx.isAdmin && r.status === "laufend" ? (
        <section className="drk-card">
          <h2 className="text-lg font-bold mb-3">Administration</h2>
          <AdminActions kv={kv} resolutionId={r.id} />
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const bg =
    tone === "success" ? "var(--success-bg)" : tone === "warning" ? "var(--warning-bg)" : "var(--bg)";
  const color =
    tone === "success" ? "var(--success)" : tone === "warning" ? "#b45309" : "var(--text)";
  return (
    <div className="rounded-lg p-4" style={{ background: bg, color }}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function statusLabel(s: string) {
  return {
    draft: "Entwurf",
    laufend: "Laufend",
    abgeschlossen: "Abgeschlossen",
    zurueckgezogen: "Zurückgezogen",
  }[s] ?? s;
}

function badgeClass(s: string) {
  return {
    draft: "drk-badge-warning",
    laufend: "drk-badge-success",
    abgeschlossen: "drk-badge-error",
    zurueckgezogen: "drk-badge-warning",
  }[s] ?? "drk-badge-warning";
}

function mehrheitLabel(m: string) {
  return {
    simple: "Einfache Mehrheit",
    two_thirds: "2/3-Mehrheit",
    three_quarters: "3/4-Mehrheit",
  }[m] ?? m;
}
