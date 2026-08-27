import Link from "next/link";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agendaItems, eligibleVoters, resolutions, votes } from "@/lib/db/schema";
import {
  computeAgendaItemResult,
  type ResolutionResult,
} from "@/lib/resolution";
import { statusBadgeClass, statusLabel } from "@/lib/format";
import { requireTenantContext } from "@/lib/tenant";
import { ResolutionStatus } from "./_components/resolution-status";

export const dynamic = "force-dynamic";

type TopResult = {
  topId: string;
  ordinal: number;
  titel: string;
  quorumPct: number;
  result: ResolutionResult;
};

type ListItem = {
  id: string;
  betreff: string;
  status: string;
  fristEnde: Date;
  topCount: number;
  firstTopTitel: string | null;
  topResults: TopResult[];
};

async function loadResolutions(
  where: ReturnType<typeof and>,
  opts: { withResults?: boolean; limit?: number } = {},
): Promise<ListItem[]> {
  const baseQuery = db
    .select({
      id: resolutions.id,
      betreff: resolutions.betreff,
      status: resolutions.status,
      fristEnde: resolutions.fristEnde,
      createdAt: resolutions.createdAt,
      abgeschlossenAm: resolutions.abgeschlossenAm,
    })
    .from(resolutions)
    .where(where)
    .orderBy(desc(resolutions.createdAt));
  const rows = opts.limit !== undefined ? await baseQuery.limit(opts.limit) : await baseQuery;

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const topsRows = await db
    .select({
      id: agendaItems.id,
      resolutionId: agendaItems.resolutionId,
      ordinal: agendaItems.ordinal,
      titel: agendaItems.titel,
      optionen: agendaItems.optionen,
      quorumPct: agendaItems.quorumPct,
      mehrheit: agendaItems.mehrheit,
    })
    .from(agendaItems)
    .where(inArray(agendaItems.resolutionId, ids));

  const counts = new Map<string, number>();
  const firstTitel = new Map<string, string>();
  for (const t of topsRows) {
    counts.set(t.resolutionId, (counts.get(t.resolutionId) ?? 0) + 1);
    if (t.ordinal === 1) firstTitel.set(t.resolutionId, t.titel);
  }

  const resultsByResolution = new Map<string, TopResult[]>();
  if (opts.withResults && topsRows.length > 0) {
    const topIds = topsRows.map((t) => t.id);
    const voteRows = await db
      .select({
        agendaItemId: votes.agendaItemId,
        optionId: votes.optionId,
        c: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(inArray(votes.agendaItemId, topIds))
      .groupBy(votes.agendaItemId, votes.optionId);

    const countsByTop = new Map<string, Record<string, number>>();
    for (const v of voteRows) {
      if (!countsByTop.has(v.agendaItemId)) countsByTop.set(v.agendaItemId, {});
      countsByTop.get(v.agendaItemId)![v.optionId] = v.c;
    }

    const eligibleRows = await db
      .select({
        resolutionId: eligibleVoters.resolutionId,
        c: sql<number>`count(*)::int`,
      })
      .from(eligibleVoters)
      .where(inArray(eligibleVoters.resolutionId, ids))
      .groupBy(eligibleVoters.resolutionId);
    const eligibleByResolution = new Map<string, number>();
    for (const e of eligibleRows) {
      eligibleByResolution.set(e.resolutionId, e.c);
    }

    const sortedTops = [...topsRows].sort((a, b) => a.ordinal - b.ordinal);
    for (const t of sortedTops) {
      const result = computeAgendaItemResult({
        agendaItem: { optionen: t.optionen, quorumPct: t.quorumPct, mehrheit: t.mehrheit },
        eligibleCount: eligibleByResolution.get(t.resolutionId) ?? 0,
        voteCounts: countsByTop.get(t.id) ?? {},
      });
      const list = resultsByResolution.get(t.resolutionId) ?? [];
      list.push({
        topId: t.id,
        ordinal: t.ordinal,
        titel: t.titel,
        quorumPct: t.quorumPct,
        result,
      });
      resultsByResolution.set(t.resolutionId, list);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    betreff: r.betreff,
    status: r.status,
    fristEnde: r.fristEnde,
    topCount: counts.get(r.id) ?? 0,
    firstTopTitel: firstTitel.get(r.id) ?? null,
    topResults: resultsByResolution.get(r.id) ?? [],
  }));
}

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireTenantContext(kv);

  const [running, drafts, closed] = await Promise.all([
    loadResolutions(
      and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "laufend")),
      { withResults: true },
    ),
    ctx.isAdmin
      ? loadResolutions(
          and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "draft")),
        )
      : Promise.resolve([]),
    loadResolutions(
      and(
        eq(resolutions.tenantId, ctx.tenant.id),
        ne(resolutions.status, "laufend"),
        ne(resolutions.status, "draft"),
      ),
      { limit: 20 },
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Section title={`Laufend (${running.length})`}>
        {running.length === 0 ? (
          <Empty>Aktuell keine laufenden Umlaufverfahren.</Empty>
        ) : (
          <ResolutionList items={running} kv={kv} showResults />
        )}
      </Section>

      {drafts.length > 0 ? (
        <Section title={`Entwürfe (${drafts.length})`}>
          <ResolutionList items={drafts} kv={kv} />
        </Section>
      ) : null}

      <Section title="Abgeschlossen">
        {closed.length === 0 ? (
          <Empty>Noch keine abgeschlossenen Verfahren.</Empty>
        ) : (
          <ResolutionList items={closed} kv={kv} />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="drk-card">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--text-light)" }}>{children}</p>;
}

function ResolutionList({
  items,
  kv,
  showResults = false,
}: {
  items: ListItem[];
  kv: string;
  showResults?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((r) => {
        const title =
          r.betreff.trim() ||
          r.firstTopTitel ||
          `Umlaufverfahren (${r.topCount} TOP${r.topCount === 1 ? "" : "s"})`;
        const href =
          r.status === "draft"
            ? `/${kv}/beschluss/${r.id}/bearbeiten`
            : `/${kv}/beschluss/${r.id}`;
        return (
          <li
            key={r.id}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <Link
              href={href}
              className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold break-words">{title}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                  {r.topCount} TOP{r.topCount === 1 ? "" : "s"} · Frist:{" "}
                  {new Date(r.fristEnde).toLocaleString("de-DE")}
                </div>
              </div>
              <span className={statusBadgeClass(r.status)}>
                {statusLabel(r.status)}
              </span>
            </Link>
            {showResults && r.topResults.length > 0 ? (
              <div
                className="border-t p-4 flex flex-col gap-4"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                {r.topResults.map((t) => (
                  <ResolutionStatus
                    key={t.topId}
                    result={t.result}
                    quorumPct={t.quorumPct}
                    variant="compact"
                    topLabel={
                      r.topResults.length > 1
                        ? `TOP ${t.ordinal} — ${t.titel}`
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
