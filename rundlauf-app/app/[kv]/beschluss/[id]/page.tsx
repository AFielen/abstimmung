import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaItems,
  attachments,
  bodies,
  eligibleVoters,
  organizations,
  resolutions,
  votes,
} from "@/lib/db/schema";
import {
  computeAgendaItemResult,
  isPastDeadline,
  parseOptions,
  type ResolutionResult,
} from "@/lib/resolution";
import { formatBytes, mehrheitLabel, statusBadgeClass, statusLabel } from "@/lib/format";
import { requireTenantContext } from "@/lib/tenant";
import { VoteForm } from "./vote-form";
import { AdminActions } from "./admin-actions";
import { VoterStatusPanel } from "./voter-status";
import { ResolutionStatus } from "../../_components/resolution-status";
import { CollapsibleMarkdown } from "../../_components/collapsible-markdown";

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

  // Drafts: nur Admin darf rein, sonst zurück
  if (r.status === "draft") {
    if (ctx.isAdmin) {
      return (
        <div className="drk-card max-w-2xl mx-auto">
          <span className="drk-badge-warning">Entwurf</span>
          <h1 className="text-2xl font-bold mt-2">Dieser Beschluss ist noch ein Entwurf</h1>
          <p className="mt-3" style={{ color: "var(--text-light)" }}>
            Ergänze Tagesordnungspunkte und Anlagen, dann eröffne das Verfahren.
          </p>
          <Link
            href={`/${kv}/beschluss/${r.id}/bearbeiten`}
            className="drk-btn-primary inline-flex mt-4"
          >
            Entwurf bearbeiten
          </Link>
        </div>
      );
    }
    notFound();
  }

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

  const tops = await db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, r.id))
    .orderBy(asc(agendaItems.ordinal));

  // Eligibility
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

  // Stimmen des aktuellen Users (pro TOP)
  const topIds = tops.map((t) => t.id);
  const myVotes: Record<string, { optionId: string; updatedAt: Date }> = {};
  if (topIds.length > 0 && isEligible) {
    const rows = await db
      .select({
        agendaItemId: votes.agendaItemId,
        optionId: votes.optionId,
        updatedAt: votes.updatedAt,
      })
      .from(votes)
      .where(and(inArray(votes.agendaItemId, topIds), eq(votes.userId, ctx.user.id)));
    for (const row of rows) {
      myVotes[row.agendaItemId] = { optionId: row.optionId, updatedAt: row.updatedAt };
    }
  }

  const eligibleCount = (
    await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eligibleVoters)
      .where(eq(eligibleVoters.resolutionId, r.id))
  )[0]?.count ?? 0;

  // Stimmenzahlen pro TOP
  const countsByTop = new Map<string, Record<string, number>>();
  if (topIds.length > 0) {
    const rows = await db
      .select({
        agendaItemId: votes.agendaItemId,
        optionId: votes.optionId,
        c: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(inArray(votes.agendaItemId, topIds))
      .groupBy(votes.agendaItemId, votes.optionId);
    for (const row of rows) {
      if (!countsByTop.has(row.agendaItemId)) countsByTop.set(row.agendaItemId, {});
      countsByTop.get(row.agendaItemId)![row.optionId] = row.c;
    }
  }

  // Anlagen
  const attRows = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      sizeBytes: attachments.sizeBytes,
      sha256: attachments.sha256,
      agendaItemId: attachments.agendaItemId,
      uploadedAt: attachments.uploadedAt,
    })
    .from(attachments)
    .where(eq(attachments.resolutionId, r.id))
    .orderBy(asc(attachments.uploadedAt));

  const attByTop = new Map<string, typeof attRows>();
  const overallAttachments: typeof attRows = [];
  for (const a of attRows) {
    if (a.agendaItemId) {
      if (!attByTop.has(a.agendaItemId)) attByTop.set(a.agendaItemId, []);
      attByTop.get(a.agendaItemId)!.push(a);
    } else {
      overallAttachments.push(a);
    }
  }

  const past = isPastDeadline(r.fristEnde);
  const stoppedEarly = r.status === "abgeschlossen" || r.status === "zurueckgezogen";
  const canVote = r.status === "laufend" && !past && isEligible;
  const title = r.betreff?.trim() || `Umlaufverfahren (${tops.length} TOP${tops.length === 1 ? "" : "s"})`;

  return (
    <div className="flex flex-col gap-6">
      <header className="drk-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
            {bodyInfo ? (
              <div className="text-xs uppercase tracking-wide mt-2" style={{ color: "var(--text-light)" }}>
                {bodyInfo.organizationName ? `${bodyInfo.organizationName} · ` : ""}
                {bodyInfo.bodyName}
              </div>
            ) : null}
            <h1 className="text-2xl font-bold mt-1 break-words">{title}</h1>
            <div className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
              Frist: {new Date(r.fristEnde).toLocaleString("de-DE")} ·{" "}
              {past ? "abgelaufen" : "noch offen"}
              {" · "}
              {r.voteChangeMode === "fest" ? "Feste Stimmen" : "Änderbar bis Frist"}
              {" · "}
              {tops.length} TOP{tops.length === 1 ? "" : "s"}
              {" · "}
              {eligibleCount} Stimmberechtigte
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
      </header>

      {!isEligible && r.status === "laufend" ? (
        <section className="drk-card">
          <p style={{ color: "var(--text-light)" }}>
            Du bist für diesen Beschluss nicht stimmberechtigt. (Mitgliedschaft wurde nach
            Eröffnung angelegt oder ist nicht aktiv.)
          </p>
        </section>
      ) : null}

      {overallAttachments.length > 0 ? (
        <section className="drk-card">
          <h2 className="text-lg font-bold mb-3">Anlagen zum Umlauf</h2>
          <AttachmentList kv={kv} resolutionId={r.id} items={overallAttachments} />
        </section>
      ) : null}

      {tops.map((top) => {
        const counts = countsByTop.get(top.id) ?? {};
        const result: ResolutionResult =
          (top.ergebnis as ResolutionResult | null) ??
          computeAgendaItemResult({
            agendaItem: top,
            eligibleCount,
            voteCounts: counts,
          });
        const options = parseOptions(top.optionen);
        const myVote = myVotes[top.id] ?? null;
        const topAtts = attByTop.get(top.id) ?? [];
        return (
          <section key={top.id} className="drk-card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  TOP {top.ordinal}
                </div>
                <h2 className="text-xl font-bold mt-1 break-words">{top.titel}</h2>
              </div>
            </div>

            <div className="mt-2 mb-4">
              <ResolutionStatus
                result={result}
                quorumPct={top.quorumPct}
                closure={
                  stoppedEarly
                    ? {
                        status: r.status as "abgeschlossen" | "zurueckgezogen",
                        accepted: result.accepted,
                      }
                    : null
                }
              />
            </div>

            {top.beschlussvorschlagMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Beschlussvorschlag
                </div>
                <CollapsibleMarkdown
                  markdown={top.beschlussvorschlagMd}
                  collapsedLines={10}
                  className="mt-1"
                />
              </div>
            ) : null}

            {top.sachlageMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Sachlage
                </div>
                <CollapsibleMarkdown
                  markdown={top.sachlageMd}
                  collapsedLines={10}
                  className="mt-1"
                />
              </div>
            ) : null}

            {(top.finanzielleAuswirkungen || top.auskunftErteilen) ? (
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                {top.finanzielleAuswirkungen ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                      Finanzielle Auswirkungen
                    </div>
                    <div className="mt-1">{top.finanzielleAuswirkungen}</div>
                  </div>
                ) : null}
                {top.auskunftErteilen ? (
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                      Auskunft erteilen
                    </div>
                    <div className="mt-1">{top.auskunftErteilen}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {topAtts.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-light)" }}>
                  Anlagen
                </div>
                <AttachmentList kv={kv} resolutionId={r.id} items={topAtts} />
              </div>
            ) : null}

            <div className="mt-4 text-xs" style={{ color: "var(--text-light)" }}>
              Quorum {top.quorumPct} % · {mehrheitLabel(top.mehrheit)}
            </div>

            {canVote ? (
              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-bold mb-2">Deine Stimme</h3>
                <VoteForm
                  kv={kv}
                  resolutionId={r.id}
                  agendaItemId={top.id}
                  options={options}
                  currentOptionId={myVote?.optionId ?? null}
                  mode={r.voteChangeMode}
                  alreadyVoted={Boolean(myVote)}
                />
              </div>
            ) : null}

            {!canVote && isEligible ? (
              <div className="mt-4 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-bold mb-2">Deine Stimme</h3>
                {myVote ? (
                  <p>
                    Abgestimmt:{" "}
                    <strong>
                      {options.find((o) => o.id === myVote.optionId)?.label ?? myVote.optionId}
                    </strong>{" "}
                    <span style={{ color: "var(--text-light)" }}>
                      ({new Date(myVote.updatedAt).toLocaleString("de-DE")})
                    </span>
                  </p>
                ) : (
                  <p style={{ color: "var(--text-light)" }}>Nicht abgestimmt.</p>
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {tops.length === 0 ? (
        <section className="drk-card">
          <p style={{ color: "var(--text-light)" }}>
            Dieses Umlaufverfahren enthält keine Tagesordnungspunkte.
          </p>
        </section>
      ) : null}

      {ctx.isAdmin && (r.status === "laufend" || r.status === "abgeschlossen") ? (
        <VoterStatusPanel resolutionId={r.id} topIds={topIds} />
      ) : null}

      {ctx.isAdmin && r.status === "laufend" ? (
        <section className="drk-card">
          <h2 className="text-lg font-bold mb-3">Administration</h2>
          <AdminActions kv={kv} resolutionId={r.id} pastDeadline={past} />
        </section>
      ) : null}
    </div>
  );
}

function AttachmentList({
  kv,
  resolutionId,
  items,
}: {
  kv: string;
  resolutionId: string;
  items: Array<{
    id: string;
    filename: string;
    sizeBytes: number;
    sha256: string;
  }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li key={a.id}>
          <a
            href={`/${kv}/beschluss/${resolutionId}/anlagen/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-gray-50"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-medium" style={{ color: "var(--drk)" }}>
              📄 {a.filename}
            </span>
            <span className="text-xs" style={{ color: "var(--text-light)" }}>
              {formatBytes(a.sizeBytes)} · SHA-256 {a.sha256.slice(0, 12)}…
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

