import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { attachments, eligibleVoters, resolutions } from "@/lib/db/schema";
import { requireTenantContext } from "@/lib/tenant";
import { belongsToTenant } from "@/lib/action-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ kv: string; id: string; attachmentId: string }>;
  },
) {
  const { kv, id, attachmentId } = await params;
  const ctx = await requireTenantContext(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) {
    return new NextResponse("Beschluss nicht gefunden", { status: 404 });
  }

  // Zugriff: Admins immer, sonst Stimmberechtigte des Umlaufs
  let canAccess = ctx.isAdmin;
  if (!canAccess) {
    const ev = (
      await db
        .select({ id: eligibleVoters.id })
        .from(eligibleVoters)
        .where(
          and(
            eq(eligibleVoters.resolutionId, r.id),
            eq(eligibleVoters.userId, ctx.user.id),
          ),
        )
        .limit(1)
    )[0];
    canAccess = Boolean(ev);
  }
  if (!canAccess) {
    return new NextResponse("Kein Zugriff", { status: 403 });
  }

  const att = (
    await db
      .select()
      .from(attachments)
      .where(
        and(eq(attachments.id, attachmentId), eq(attachments.resolutionId, r.id)),
      )
      .limit(1)
  )[0];
  if (!att) {
    return new NextResponse("Anlage nicht gefunden", { status: 404 });
  }

  await logAudit({
    action: "attachment.downloaded",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "attachment",
    targetId: att.id,
    payload: { filename: att.filename },
  });

  const safe = att.filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return new NextResponse(new Uint8Array(att.data), {
    status: 200,
    headers: {
      "Content-Type": att.mimeType || "application/pdf",
      "Content-Length": String(att.sizeBytes),
      "Content-Disposition": `inline; filename="${safe}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
