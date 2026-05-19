import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaItems,
  attachments,
  bodies,
  eligibleVoters,
  memberships,
  organizations,
  resolutions,
  users,
} from "@/lib/db/schema";
import { MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";
import { DraftEditor, type DraftMember, type DraftTop, type DraftAttachment } from "./draft-editor";

export const dynamic = "force-dynamic";

export default async function DraftEditPage({
  params,
}: {
  params: Promise<{ kv: string; id: string }>;
}) {
  const { kv, id } = await params;
  const ctx = await requireAdmin(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) notFound();
  if (r.status !== "draft") {
    return (
      <div className="drk-card max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Bearbeitung nicht möglich</h1>
        <p style={{ color: "var(--text-light)" }}>
          Dieser Beschluss ist nicht (mehr) im Entwurfsstadium.
        </p>
        <Link href={`/${kv}/beschluss/${r.id}`} className="drk-btn-primary inline-flex mt-4">
          Zur Detail-Ansicht
        </Link>
      </div>
    );
  }

  const bodyInfo = r.bodyId
    ? (
        await db
          .select({
            id: bodies.id,
            name: bodies.name,
            organizationName: organizations.name,
            defaultQuorumPct: bodies.defaultQuorumPct,
            defaultMehrheit: bodies.defaultMehrheit,
          })
          .from(bodies)
          .leftJoin(organizations, eq(organizations.id, bodies.organizationId))
          .where(eq(bodies.id, r.bodyId))
          .limit(1)
      )[0] ?? null
    : null;

  const tops: DraftTop[] = (
    await db
      .select()
      .from(agendaItems)
      .where(eq(agendaItems.resolutionId, r.id))
      .orderBy(asc(agendaItems.ordinal))
  ).map((t) => ({
    id: t.id,
    ordinal: t.ordinal,
    titel: t.titel,
    beschlussvorschlagMd: t.beschlussvorschlagMd,
    sachlageMd: t.sachlageMd ?? "",
    finanzielleAuswirkungen: t.finanzielleAuswirkungen ?? "",
    auskunftErteilen: t.auskunftErteilen ?? "",
    quorumPct: t.quorumPct,
    mehrheit: t.mehrheit,
  }));

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
    .orderBy(desc(attachments.uploadedAt));

  const attList: DraftAttachment[] = attRows.map((a) => ({
    id: a.id,
    filename: a.filename,
    sizeBytes: a.sizeBytes,
    sha256: a.sha256,
    agendaItemId: a.agendaItemId,
    uploadedAt: a.uploadedAt,
  }));

  // Mitglieder
  const memberRows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(eq(memberships.tenantId, ctx.tenant.id), eq(memberships.status, "active")),
    )
    .orderBy(asc(users.name), asc(users.email));

  const members: DraftMember[] = memberRows.map((m) => ({
    userId: m.userId,
    displayName: m.name ?? m.email,
    email: m.email,
    role: m.role,
  }));

  // Vorschlag für Stimmberechtigte: aus letztem laufenden / abgeschlossenen
  // Umlaufverfahren desselben Gremiums.
  let suggestedIds: string[] = [];
  if (r.bodyId) {
    const lastResolution = (
      await db
        .select({ id: resolutions.id })
        .from(resolutions)
        .where(
          and(
            eq(resolutions.tenantId, ctx.tenant.id),
            eq(resolutions.bodyId, r.bodyId),
            inArray(resolutions.status, ["laufend", "abgeschlossen", "zurueckgezogen"]),
          ),
        )
        .orderBy(desc(resolutions.createdAt))
        .limit(1)
    )[0];
    if (lastResolution) {
      const ev = await db
        .select({ userId: eligibleVoters.userId })
        .from(eligibleVoters)
        .where(eq(eligibleVoters.resolutionId, lastResolution.id));
      const memberIdSet = new Set(members.map((m) => m.userId));
      suggestedIds = ev.map((e) => e.userId).filter((id) => memberIdSet.has(id));
    }
  }
  if (suggestedIds.length === 0) {
    suggestedIds = members.map((m) => m.userId);
  }

  // Frist im datetime-local Format
  const fristIso = (() => {
    const offset = r.fristEnde.getTimezoneOffset() * 60_000;
    return new Date(r.fristEnde.getTime() - offset).toISOString().slice(0, 16);
  })();

  return (
    <DraftEditor
      kv={kv}
      resolutionId={r.id}
      bodyName={
        bodyInfo
          ? bodyInfo.organizationName
            ? `${bodyInfo.organizationName} · ${bodyInfo.name}`
            : bodyInfo.name
          : "—"
      }
      defaultQuorum={bodyInfo?.defaultQuorumPct ?? 75}
      defaultMehrheit={bodyInfo?.defaultMehrheit ?? "simple"}
      betreff={r.betreff}
      fristEnde={fristIso}
      voteChangeMode={r.voteChangeMode}
      tops={tops}
      attachments={attList}
      members={members}
      suggestedEligibleIds={suggestedIds}
      minDays={MIN_FRIST_DAYS}
    />
  );
}
