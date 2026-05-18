import Link from "next/link";
import { and, asc, desc, eq, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bodies,
  eligibleVoters,
  memberships,
  organizations,
  resolutions,
  users,
} from "@/lib/db/schema";
import { MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";
import { CreateForm, type BodyChoice, type MemberChoice } from "./form";

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
      organizationId: bodies.organizationId,
      organizationName: organizations.name,
      defaultQuorumPct: bodies.defaultQuorumPct,
      defaultMehrheit: bodies.defaultMehrheit,
    })
    .from(bodies)
    .leftJoin(organizations, eq(organizations.id, bodies.organizationId))
    .where(and(eq(bodies.tenantId, ctx.tenant.id), isNull(bodies.archivedAt)))
    .orderBy(asc(bodies.name));

  const bodyChoices: BodyChoice[] = bodyRows.map((b) => ({
    id: b.id,
    name: b.name,
    organizationName: b.organizationName,
    defaultQuorumPct: b.defaultQuorumPct,
    defaultMehrheit: b.defaultMehrheit,
  }));

  // Alle aktiven Mitglieder des Tenants
  const memberRows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.tenantId, ctx.tenant.id), eq(memberships.status, "active")))
    .orderBy(asc(users.name), asc(users.email));

  const members: MemberChoice[] = memberRows.map((m) => ({
    userId: m.userId,
    displayName: m.name ?? m.email,
    email: m.email,
    role: m.role,
  }));

  // Für jedes Gremium: Mitglieder aus dem letzten Beschluss als Vorschlag
  const suggestionsByBody: Record<string, string[]> = {};
  if (bodyChoices.length > 0) {
    const bodyIds = bodyChoices.map((b) => b.id);
    const lastPerBody = await db
      .select({
        bodyId: resolutions.bodyId,
        resolutionId: resolutions.id,
        createdAt: resolutions.createdAt,
      })
      .from(resolutions)
      .where(and(eq(resolutions.tenantId, ctx.tenant.id), inArray(resolutions.bodyId, bodyIds)))
      .orderBy(desc(resolutions.createdAt));

    const seen = new Set<string>();
    const targetResolutionIds: string[] = [];
    const byResolution = new Map<string, string>();
    for (const r of lastPerBody) {
      if (!r.bodyId || seen.has(r.bodyId)) continue;
      seen.add(r.bodyId);
      targetResolutionIds.push(r.resolutionId);
      byResolution.set(r.resolutionId, r.bodyId);
    }
    if (targetResolutionIds.length > 0) {
      const ev = await db
        .select({
          resolutionId: eligibleVoters.resolutionId,
          userId: eligibleVoters.userId,
        })
        .from(eligibleVoters)
        .where(inArray(eligibleVoters.resolutionId, targetResolutionIds));
      const memberIdSet = new Set(members.map((m) => m.userId));
      for (const e of ev) {
        const bid = byResolution.get(e.resolutionId);
        if (!bid) continue;
        if (!memberIdSet.has(e.userId)) continue; // ehemalige Mitglieder rausfiltern
        if (!suggestionsByBody[bid]) suggestionsByBody[bid] = [];
        suggestionsByBody[bid].push(e.userId);
      }
    }
  }

  if (bodyChoices.length === 0) {
    return (
      <div className="drk-card max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Neuer Umlaufbeschluss</h1>
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

  if (members.length < 2) {
    return (
      <div className="drk-card max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Neuer Umlaufbeschluss</h1>
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
      <h1 className="text-2xl font-bold mb-2">Neuer Umlaufbeschluss</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-light)" }}>
        Wähle das Gremium und die Stimmberechtigten. Vorgeschlagen werden Mitglieder
        aus dem letzten Beschluss desselben Gremiums – beim ersten Mal manuell auswählen.
        Frist mindestens {MIN_FRIST_DAYS} Tage (§ 21 Abs. 6).
      </p>
      <CreateForm
        kv={kv}
        minDays={MIN_FRIST_DAYS}
        bodies={bodyChoices}
        members={members}
        suggestionsByBody={suggestionsByBody}
      />
    </div>
  );
}
