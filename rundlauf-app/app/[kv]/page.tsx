import Link from "next/link";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agendaItems, resolutions } from "@/lib/db/schema";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  laufend: "Laufend",
  abgeschlossen: "Abgeschlossen",
  zurueckgezogen: "Zurückgezogen",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "drk-badge-warning",
  laufend: "drk-badge-success",
  abgeschlossen: "drk-badge-error",
  zurueckgezogen: "drk-badge-warning",
};

type ListItem = {
  id: string;
  betreff: string;
  status: string;
  fristEnde: Date;
  topCount: number;
  firstTopTitel: string | null;
};

async function loadResolutions(where: ReturnType<typeof and>): Promise<ListItem[]> {
  const rows = await db
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

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const topsRows = await db
    .select({
      resolutionId: agendaItems.resolutionId,
      ordinal: agendaItems.ordinal,
      titel: agendaItems.titel,
      c: sql<number>`count(*) over (partition by ${agendaItems.resolutionId})::int`,
    })
    .from(agendaItems)
    .where(inArray(agendaItems.resolutionId, ids));

  const counts = new Map<string, number>();
  const firstTitel = new Map<string, string>();
  for (const t of topsRows) {
    counts.set(t.resolutionId, t.c);
    if (t.ordinal === 1) firstTitel.set(t.resolutionId, t.titel);
  }

  return rows.map((r) => ({
    id: r.id,
    betreff: r.betreff,
    status: r.status,
    fristEnde: r.fristEnde,
    topCount: counts.get(r.id) ?? 0,
    firstTopTitel: firstTitel.get(r.id) ?? null,
  }));
}

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireTenantContext(kv);

  const running = await loadResolutions(
    and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "laufend")),
  );
  const drafts = ctx.isAdmin
    ? await loadResolutions(
        and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "draft")),
      )
    : [];
  const closed = (
    await loadResolutions(
      and(
        eq(resolutions.tenantId, ctx.tenant.id),
        ne(resolutions.status, "laufend"),
        ne(resolutions.status, "draft"),
      ),
    )
  ).slice(0, 20);

  return (
    <div className="flex flex-col gap-6">
      <Section title={`Laufend (${running.length})`}>
        {running.length === 0 ? (
          <Empty>Aktuell keine laufenden Umlaufverfahren.</Empty>
        ) : (
          <ResolutionList items={running} kv={kv} />
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

function ResolutionList({ items, kv }: { items: ListItem[]; kv: string }) {
  return (
    <ul className="flex flex-col gap-2">
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
          <li key={r.id}>
            <Link
              href={href}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 hover:bg-gray-50 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <div className="font-bold break-words">{title}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                  {r.topCount} TOP{r.topCount === 1 ? "" : "s"} · Frist:{" "}
                  {new Date(r.fristEnde).toLocaleString("de-DE")}
                </div>
              </div>
              <span className={STATUS_BADGE[r.status] ?? "drk-badge-warning"}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
