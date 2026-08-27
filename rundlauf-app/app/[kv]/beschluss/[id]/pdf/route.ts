import { NextResponse, type NextRequest } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  agendaItems,
  attachments,
  bodies,
  eligibleVoters,
  organizations,
  resolutions,
  users,
  votes,
} from "@/lib/db/schema";
import { buildProtokollPdf } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";
import { requireTenantContext } from "@/lib/tenant";
import { belongsToTenant } from "@/lib/action-helpers";

export const dynamic = "force-dynamic";

async function persistProtokoll(
  tenantSlug: string,
  resolutionId: string,
  buf: Buffer,
): Promise<void> {
  const baseDir = process.env.PROTOKOLLE_DIR || "/data/protokolle";
  try {
    const dir = join(baseDir, tenantSlug);
    await fs.mkdir(dir, { recursive: true });
    const file = join(dir, `${resolutionId}.pdf`);
    await fs.writeFile(file, buf);
  } catch (e) {
    console.warn("[pdf] Konnte Protokoll nicht persistieren:", e);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kv: string; id: string }> },
) {
  const { kv, id } = await params;
  const ctx = await requireTenantContext(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) {
    return new NextResponse("Beschluss nicht gefunden", { status: 404 });
  }

  const tops = await db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, r.id))
    .orderBy(asc(agendaItems.ordinal));

  const eligible = await db
    .select({
      userId: eligibleVoters.userId,
      nameSnapshot: eligibleVoters.nameSnapshot,
      emailSnapshot: eligibleVoters.emailSnapshot,
      roleSnapshot: eligibleVoters.roleSnapshot,
    })
    .from(eligibleVoters)
    .where(eq(eligibleVoters.resolutionId, r.id));

  const topIds = tops.map((t) => t.id);
  const voteRows =
    topIds.length === 0
      ? []
      : await db
          .select({
            userId: votes.userId,
            agendaItemId: votes.agendaItemId,
            optionId: votes.optionId,
            submittedAt: votes.submittedAt,
            updatedAt: votes.updatedAt,
          })
          .from(votes)
          .where(inArray(votes.agendaItemId, topIds));

  const attRows = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      sizeBytes: attachments.sizeBytes,
      sha256: attachments.sha256,
      agendaItemId: attachments.agendaItemId,
    })
    .from(attachments)
    .where(eq(attachments.resolutionId, r.id))
    .orderBy(asc(attachments.uploadedAt));

  const creator = (
    await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, r.createdByUserId))
      .limit(1)
  )[0] ?? null;

  const bodyInfo = r.bodyId
    ? (
        await db
          .select({ name: bodies.name, organizationName: organizations.name })
          .from(bodies)
          .leftJoin(organizations, eq(organizations.id, bodies.organizationId))
          .where(eq(bodies.id, r.bodyId))
          .limit(1)
      )[0] ?? null
    : null;

  const buf = buildProtokollPdf({
    tenant: ctx.tenant,
    resolution: r,
    createdBy: creator,
    agendaItems: tops,
    eligible,
    votes: voteRows,
    attachments: attRows,
    body: bodyInfo,
  });

  if (r.status === "abgeschlossen" || r.status === "zurueckgezogen") {
    await persistProtokoll(ctx.tenant.slug, r.id, buf);
  }

  await logAudit({
    action: "resolution.pdf_downloaded",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r.id,
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="protokoll-${r.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
