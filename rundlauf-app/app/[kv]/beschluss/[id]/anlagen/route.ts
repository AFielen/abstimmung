import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  agendaItems,
  attachments,
  resolutions,
} from "@/lib/db/schema";
import {
  sanitizeFilename,
  sha256Hex,
  validateAttachment,
} from "@/lib/attachments";
import {
  ATTACHMENT_ALLOWED_MIME,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
} from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";
import { belongsToTenant } from "@/lib/action-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kv: string; id: string }> },
) {
  const { kv, id } = await params;
  const ctx = await requireAdmin(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) {
    return json({ ok: false, message: "Beschluss nicht gefunden" }, 404);
  }
  if (r.status !== "draft") {
    return json(
      { ok: false, message: "Anlagen können nur im Entwurfsstadium geändert werden." },
      400,
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, message: "Multipart-Form erforderlich." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return json({ ok: false, message: "Keine Datei übermittelt." }, 400);
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return json(
      {
        ok: false,
        message: `Datei größer als ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB.`,
      },
      400,
    );
  }
  const rawFilename =
    typeof (file as File).name === "string" ? (file as File).name : "anlage.pdf";
  const filename = sanitizeFilename(rawFilename);
  const mimeType = file.type || ATTACHMENT_ALLOWED_MIME;

  const buf = Buffer.from(await file.arrayBuffer());

  // Bestehende Anlagen zählen
  const existing = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(eq(attachments.resolutionId, r.id));

  const validation = validateAttachment({
    mimeType,
    size: buf.length,
    buf,
    filename,
    existingCount: existing.length,
  });
  if (validation) {
    return json({ ok: false, message: validation.message }, 400);
  }

  // Optionale TOP-Zuordnung
  const rawTopId = form.get("agendaItemId");
  let agendaItemId: string | null = null;
  if (typeof rawTopId === "string" && rawTopId.length > 0) {
    const top = (
      await db
        .select({ id: agendaItems.id })
        .from(agendaItems)
        .where(
          and(eq(agendaItems.id, rawTopId), eq(agendaItems.resolutionId, r.id)),
        )
        .limit(1)
    )[0];
    if (!top) {
      return json({ ok: false, message: "Ungültiger TOP-Verweis." }, 400);
    }
    agendaItemId = top.id;
  }

  const sha = sha256Hex(buf);

  const inserted = await db
    .insert(attachments)
    .values({
      resolutionId: r.id,
      agendaItemId,
      filename,
      mimeType: ATTACHMENT_ALLOWED_MIME,
      sizeBytes: buf.length,
      sha256: sha,
      data: buf,
      uploadedByUserId: ctx.user.id,
    })
    .returning({ id: attachments.id });

  await logAudit({
    action: "attachment.uploaded",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "attachment",
    targetId: inserted[0].id,
    payload: {
      resolutionId: r.id,
      agendaItemId,
      filename,
      sizeBytes: buf.length,
      sha256: sha,
    },
  });

  return json({ ok: true, attachmentId: inserted[0].id });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kv: string; id: string }> },
) {
  // Sammelinformation über Anlagen liefern
  const { kv, id } = await params;
  const ctx = await requireAdmin(kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, id)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) {
    return json({ ok: false, message: "Beschluss nicht gefunden" }, 404);
  }

  const rows = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      sizeBytes: attachments.sizeBytes,
      sha256: attachments.sha256,
      agendaItemId: attachments.agendaItemId,
      uploadedAt: attachments.uploadedAt,
    })
    .from(attachments)
    .where(eq(attachments.resolutionId, r.id));

  return json({
    ok: true,
    items: rows,
    limits: {
      maxBytes: ATTACHMENT_MAX_BYTES,
      maxCount: ATTACHMENT_MAX_COUNT,
      allowedMime: ATTACHMENT_ALLOWED_MIME,
    },
  });
}
