import Link from "next/link";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/tenant";
import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireAdmin(kv);

  const all = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.tenantId, ctx.tenant.id), ne(memberships.status, "removed")))
    .orderBy(desc(memberships.invitedAt));

  const userIds = all.map((m) => m.userId);
  const usersList = userIds.length
    ? await db.select().from(users).where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(usersList.map((u) => [u.id, u]));

  return (
    <div className="flex flex-col gap-6">
      <section className="drk-card">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">Mitglied einladen</h2>
          <Link
            href={`/${kv}/mitglieder/import`}
            className="drk-btn-secondary"
            style={{ padding: "0.5rem 0.9rem", minHeight: 0 }}
          >
            CSV/Excel-Import
          </Link>
        </div>
        <InviteForm kv={kv} />
      </section>

      <section className="drk-card">
        <h2 className="text-xl font-bold mb-4">
          Mitglieder ({all.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {all.map((m) => {
            const u = userMap.get(m.userId);
            return (
              <MemberRow
                key={m.id}
                kv={kv}
                membershipId={m.id}
                email={u?.email ?? "unbekannt"}
                name={u?.name ?? null}
                role={m.role}
                status={m.status}
                canModify={m.role !== "owner"}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
