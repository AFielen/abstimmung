"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bodies, resolutions } from "@/lib/db/schema";
import { MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";

const schema = z.object({
  kv: z.string().min(1),
  bodyId: z.string().uuid("Gremium erforderlich"),
  betreff: z.string().max(200).optional(),
  fristEnde: z.string().min(1, "Frist erforderlich"),
  voteChangeMode: z.enum(["aenderbar", "fest"]),
});

export type CreateResolutionState = {
  ok: boolean;
  message?: string;
};

export async function createResolution(
  _prev: CreateResolutionState | null,
  formData: FormData,
): Promise<CreateResolutionState> {
  const parsed = schema.safeParse({
    kv: formData.get("kv"),
    bodyId: formData.get("bodyId"),
    betreff: formData.get("betreff") || undefined,
    fristEnde: formData.get("fristEnde"),
    voteChangeMode: formData.get("voteChangeMode"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const ctx = await requireAdmin(parsed.data.kv);

  // Gremium prüfen
  const body = (
    await db
      .select()
      .from(bodies)
      .where(
        and(
          eq(bodies.id, parsed.data.bodyId),
          eq(bodies.tenantId, ctx.tenant.id),
          isNull(bodies.archivedAt),
        ),
      )
      .limit(1)
  )[0];
  if (!body) {
    return { ok: false, message: "Gremium nicht gefunden oder archiviert" };
  }

  // Frist validieren
  const fristEnde = new Date(parsed.data.fristEnde);
  if (Number.isNaN(fristEnde.getTime())) {
    return { ok: false, message: "Ungültiges Fristdatum" };
  }
  const minDate = new Date(Date.now() + MIN_FRIST_DAYS * 24 * 60 * 60 * 1000);
  if (fristEnde.getTime() < minDate.getTime()) {
    return {
      ok: false,
      message: `Die Frist muss mindestens ${MIN_FRIST_DAYS} Tage in der Zukunft liegen (§ 21 Abs. 6 Satzung).`,
    };
  }

  // Draft anlegen
  const inserted = await db
    .insert(resolutions)
    .values({
      tenantId: ctx.tenant.id,
      bodyId: body.id,
      betreff: (parsed.data.betreff ?? "").trim(),
      voteChangeMode: parsed.data.voteChangeMode,
      fristEnde,
      status: "draft",
      createdByUserId: ctx.user.id,
    })
    .returning();
  const resolution = inserted[0];

  await logAudit({
    action: "resolution.draft_created",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: resolution.id,
    payload: {
      bodyId: body.id,
      fristEnde: fristEnde.toISOString(),
    },
  });

  redirect(`/${parsed.data.kv}/beschluss/${resolution.id}/bearbeiten`);
}
