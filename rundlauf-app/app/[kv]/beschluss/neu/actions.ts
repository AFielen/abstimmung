"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bodies, eligibleVoters, memberships, resolutions, users } from "@/lib/db/schema";
import { sendResolutionInvite } from "@/lib/mail/templates";
import { DEFAULT_OPTIONS, MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";

const schema = z.object({
  kv: z.string().min(1),
  bodyId: z.string().uuid("Gremium erforderlich"),
  titel: z.string().min(3, "Titel zu kurz").max(200),
  begruendung: z.string().max(20000).optional(),
  fristEnde: z.string().min(1, "Frist erforderlich"),
  mehrheit: z.enum(["simple", "two_thirds", "three_quarters"]),
  voteChangeMode: z.enum(["aenderbar", "fest"]),
  quorumPct: z.coerce.number().int().min(50).max(100),
  eligibleUserIds: z.array(z.string().uuid()).min(2, "Mindestens 2 Stimmberechtigte erforderlich"),
});

export type CreateResolutionState = {
  ok: boolean;
  message?: string;
};

export async function createResolution(
  _prev: CreateResolutionState | null,
  formData: FormData,
): Promise<CreateResolutionState> {
  const eligibleUserIds = formData.getAll("eligibleUserIds").map(String).filter(Boolean);

  const parsed = schema.safeParse({
    kv: formData.get("kv"),
    bodyId: formData.get("bodyId"),
    titel: formData.get("titel"),
    begruendung: formData.get("begruendung") || undefined,
    fristEnde: formData.get("fristEnde"),
    mehrheit: formData.get("mehrheit"),
    voteChangeMode: formData.get("voteChangeMode"),
    quorumPct: formData.get("quorumPct") ?? 75,
    eligibleUserIds,
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

  // Eligible-Voter sind echte aktive Mitglieder
  const requestedIds = Array.from(new Set(parsed.data.eligibleUserIds));
  const validMembers = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.tenantId, ctx.tenant.id),
        eq(memberships.status, "active"),
        inArray(memberships.userId, requestedIds),
      ),
    );

  if (validMembers.length < 2) {
    return {
      ok: false,
      message: "Mindestens 2 aktive Mitglieder müssen ausgewählt sein.",
    };
  }
  if (validMembers.length !== requestedIds.length) {
    return {
      ok: false,
      message: "Mindestens ein ausgewählter Benutzer ist kein aktives Mitglied mehr. Bitte Liste prüfen.",
    };
  }

  // Resolution anlegen
  const inserted = await db
    .insert(resolutions)
    .values({
      tenantId: ctx.tenant.id,
      bodyId: body.id,
      titel: parsed.data.titel.trim(),
      begruendungMd: (parsed.data.begruendung ?? "").trim(),
      optionen: DEFAULT_OPTIONS,
      quorumPct: parsed.data.quorumPct,
      mehrheit: parsed.data.mehrheit,
      voteChangeMode: parsed.data.voteChangeMode,
      fristEnde,
      status: "laufend",
      createdByUserId: ctx.user.id,
      startedAt: new Date(),
    })
    .returning();
  const resolution = inserted[0];

  // Eligible-Voters speichern
  await db.insert(eligibleVoters).values(
    validMembers.map((m) => ({
      resolutionId: resolution.id,
      userId: m.userId,
      nameSnapshot: m.name ?? m.email,
      emailSnapshot: m.email,
      roleSnapshot: m.role,
    })),
  );

  await logAudit({
    action: "resolution.created",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: resolution.id,
    payload: {
      titel: resolution.titel,
      bodyId: body.id,
      eligibleCount: validMembers.length,
      fristEnde: fristEnde.toISOString(),
    },
  });

  // Einladungs-Mails
  const link = `${process.env.APP_URL?.replace(/\/$/, "")}/${ctx.tenant.slug}/beschluss/${resolution.id}`;
  await Promise.allSettled(
    validMembers.map((m) =>
      sendResolutionInvite({
        to: { email: m.email, name: m.name ?? undefined },
        tenantName: ctx.tenant.name,
        resolutionTitle: resolution.titel,
        resolutionLink: link,
        fristEnde,
      }),
    ),
  );

  revalidatePath(`/${parsed.data.kv}`);
  redirect(`/${parsed.data.kv}/beschluss/${resolution.id}`);
}
