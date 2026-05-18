import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bodies, organizations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/tenant";
import { CreateOrganizationForm } from "./create-organization-form";
import { CreateBodyForm } from "./create-body-form";
import { OrganizationRow } from "./organization-row";
import { BodyRow } from "./body-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "Struktur" };

export default async function StrukturPage({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireAdmin(kv);

  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.tenantId, ctx.tenant.id))
    .orderBy(asc(organizations.createdAt));

  const allBodies = await db
    .select()
    .from(bodies)
    .where(eq(bodies.tenantId, ctx.tenant.id))
    .orderBy(desc(bodies.archivedAt), asc(bodies.name));

  const bodiesByOrg = new Map<string | null, typeof allBodies>();
  for (const b of allBodies) {
    const key = b.organizationId;
    if (!bodiesByOrg.has(key)) bodiesByOrg.set(key, []);
    bodiesByOrg.get(key)!.push(b);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="drk-card">
        <h2 className="text-xl font-bold mb-1">Organisationen &amp; Gremien</h2>
        <p className="text-sm" style={{ color: "var(--text-light)" }}>
          Bilde die Struktur deines Kreisverbands ab: Mutter-Verein, Tochtergesellschaften
          und deren Gremien (Präsidium, Aufsichtsrat, Beirat, …).
        </p>
      </section>

      {orgs.map((org) => (
        <section key={org.id} className="drk-card">
          <OrganizationRow kv={kv} org={org} />
          <div className="mt-4 pl-4 border-l-2" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-light)" }}>
              Gremien
            </h3>
            <ul className="flex flex-col gap-2">
              {(bodiesByOrg.get(org.id) ?? []).map((b) => (
                <BodyRow key={b.id} kv={kv} body={b} />
              ))}
              {(bodiesByOrg.get(org.id) ?? []).length === 0 ? (
                <li className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Noch keine Gremien.
                </li>
              ) : null}
            </ul>
            <details className="mt-3">
              <summary className="text-sm cursor-pointer" style={{ color: "var(--drk)" }}>
                + Neues Gremium in dieser Organisation
              </summary>
              <div className="mt-3">
                <CreateBodyForm kv={kv} organizationId={org.id} />
              </div>
            </details>
          </div>
        </section>
      ))}

      {(bodiesByOrg.get(null) ?? []).length > 0 ? (
        <section className="drk-card">
          <h3 className="text-sm font-bold mb-2" style={{ color: "var(--text-light)" }}>
            Gremien ohne Organisation
          </h3>
          <ul className="flex flex-col gap-2">
            {(bodiesByOrg.get(null) ?? []).map((b) => (
              <BodyRow key={b.id} kv={kv} body={b} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="drk-card">
        <h3 className="text-lg font-bold mb-3">Neue Organisation anlegen</h3>
        <CreateOrganizationForm kv={kv} />
      </section>

      <section className="drk-card">
        <h3 className="text-lg font-bold mb-3">Neues Gremium ohne Organisation</h3>
        <CreateBodyForm kv={kv} />
      </section>
    </div>
  );
}
