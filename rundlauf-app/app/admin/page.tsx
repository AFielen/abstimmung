import { desc, eq, inArray } from "drizzle-orm";
import { requireSuperadmin } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { ModerationRow } from "./moderation-row";

export const metadata = { title: "Moderation – DRK Rundlaufbeschlüsse" };

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireSuperadmin();

  const pending = await db
    .select()
    .from(tenants)
    .where(eq(tenants.status, "pending"))
    .orderBy(desc(tenants.createdAt));

  const creatorIds = pending.map((t) => t.createdByUserId);
  const creators = creatorIds.length
    ? await db.select().from(users).where(inArray(users.id, creatorIds))
    : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Moderation</h1>

      <section className="drk-card">
        <h2 className="text-xl font-bold mb-4">
          Offene KV-Anträge
          <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-light)" }}>
            ({pending.length})
          </span>
        </h2>

        {pending.length === 0 ? (
          <p style={{ color: "var(--text-light)" }}>Keine offenen Anträge.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((t) => (
              <ModerationRow
                key={t.id}
                tenantId={t.id}
                name={t.name}
                slug={t.slug}
                createdAt={t.createdAt}
                creatorEmail={creatorMap.get(t.createdByUserId)?.email ?? "unbekannt"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
