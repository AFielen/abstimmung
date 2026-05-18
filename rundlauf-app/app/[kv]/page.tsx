import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { resolutions } from "@/lib/db/schema";
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

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireTenantContext(kv);

  const running = await db
    .select()
    .from(resolutions)
    .where(and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "laufend")))
    .orderBy(desc(resolutions.fristEnde));

  const drafts = await db
    .select()
    .from(resolutions)
    .where(and(eq(resolutions.tenantId, ctx.tenant.id), eq(resolutions.status, "draft")))
    .orderBy(desc(resolutions.createdAt));

  const closed = await db
    .select()
    .from(resolutions)
    .where(and(eq(resolutions.tenantId, ctx.tenant.id), ne(resolutions.status, "laufend"), ne(resolutions.status, "draft")))
    .orderBy(desc(resolutions.abgeschlossenAm))
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <Section title={`Laufend (${running.length})`}>
        {running.length === 0 ? (
          <Empty>Aktuell keine laufenden Beschlüsse.</Empty>
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
          <Empty>Noch keine abgeschlossenen Beschlüsse.</Empty>
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

type R = { id: string; titel: string; status: string; fristEnde: Date };

function ResolutionList({ items, kv }: { items: R[]; kv: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/${kv}/beschluss/${r.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div className="font-bold">{r.titel}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                Frist: {new Date(r.fristEnde).toLocaleString("de-DE")}
              </div>
            </div>
            <span className={STATUS_BADGE[r.status] ?? "drk-badge-warning"}>
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
