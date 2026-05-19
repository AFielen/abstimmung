import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bodies, memberships, organizations } from "@/lib/db/schema";
import { MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";
import { CreateForm, type BodyChoice } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Neuer Beschluss" };

export default async function NewResolutionPage({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireAdmin(kv);

  // Aktive Gremien (nicht archiviert) inkl. Organisation
  const bodyRows = await db
    .select({
      id: bodies.id,
      name: bodies.name,
      organizationName: organizations.name,
    })
    .from(bodies)
    .leftJoin(organizations, eq(organizations.id, bodies.organizationId))
    .where(and(eq(bodies.tenantId, ctx.tenant.id), isNull(bodies.archivedAt)))
    .orderBy(asc(bodies.name));

  const bodyChoices: BodyChoice[] = bodyRows.map((b) => ({
    id: b.id,
    name: b.name,
    organizationName: b.organizationName,
  }));

  const activeMemberCount = (
    await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, ctx.tenant.id),
          eq(memberships.status, "active"),
        ),
      )
  ).length;

  if (bodyChoices.length === 0) {
    return (
      <div className="drk-card max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Neues Umlaufverfahren</h1>
        <p className="mb-4" style={{ color: "var(--text-light)" }}>
          Du hast noch keine Gremien angelegt. Lege zuerst mindestens ein Gremium an,
          z.B. &bdquo;Pr&auml;sidium&ldquo;.
        </p>
        <Link href={`/${kv}/struktur`} className="drk-btn-primary inline-flex">
          Zur Struktur-Verwaltung
        </Link>
      </div>
    );
  }

  if (activeMemberCount < 2) {
    return (
      <div className="drk-card max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Neues Umlaufverfahren</h1>
        <p className="mb-4" style={{ color: "var(--text-light)" }}>
          Der KV hat zu wenige aktive Mitglieder. Lade zuerst Mitglieder ein.
        </p>
        <Link href={`/${kv}/mitglieder`} className="drk-btn-primary inline-flex">
          Mitglieder einladen
        </Link>
      </div>
    );
  }

  return (
    <div className="drk-card max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Neues Umlaufverfahren</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-light)" }}>
        Lege zunächst Gremium und Frist fest. Im nächsten Schritt erfasst du die
        einzelnen Tagesordnungspunkte (TOPs), hängst PDF-Anlagen an, wählst
        Stimmberechtigte und eröffnest dann das Verfahren. Frist mindestens
        {" "}{MIN_FRIST_DAYS} Tage (§ 21 Abs. 6).
      </p>
      <CreateForm
        kv={kv}
        minDays={MIN_FRIST_DAYS}
        bodies={bodyChoices}
      />
    </div>
  );
}
