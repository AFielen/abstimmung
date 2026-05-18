"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { eligibleVoters, memberships, resolutions, users } from "@/lib/db/schema";
import { sendResolutionInvite } from "@/lib/mail/templates";
import { DEFAULT_OPTIONS, MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";

const schema = z.object({
  kv: z.string().min(1),
  titel: z.string().min(3, "Titel zu kurz").max(200),
  begruendung: z.string().max(20000).optional(),
  fristEnde: z.string().min(1, "Frist erforderlich"),
  mehrheit: z.enum(["simple", "two_thirds", "three_quarters"]),
  voteChangeMode: z.enum(["aenderbar", "fest"]),
  quorumPct: z.coerce.number().int().min(50).max(100),
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
    titel: formData.get("titel"),
    begruendung: formData.get("begruendung") || undefined,
    fristEnde: formData.get("fristEnde"),
    mehrheit: formData.get("mehrheit"),
    voteChangeMode: formData.get("voteChangeMode"),
    quorumPct: formData.get("quorumPct") ?? 75,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const ctx = await requireAdmin(parsed.data.kv);

  // Frist validieren: mind. MIN_FRIST_DAYS Tage in der Zukunft
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

  // Aktive Mitglieder als Stimmberechtigte snapshotten
  const activeMembers = await db
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
    );

  if (activeMembers.length < 2) {
    return {
      ok: false,
      message: "Der KV hat zu wenige aktive Mitglieder. Lade zuerst Mitglieder ein.",
    };
  }

  // Resolution anlegen
  const inserted = await db
    .insert(resolutions)
    .values({
      tenantId: ctx.tenant.id,
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
    activeMembers.map((m) => ({
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
      eligibleCount: activeMembers.length,
      fristEnde: fristEnde.toISOString(),
    },
  });

  // Einladungs-Mails an alle Stimmberechtigten
  const link = `${process.env.APP_URL?.replace(/\/$/, "")}/${ctx.tenant.slug}/beschluss/${resolution.id}`;
  await Promise.allSettled(
    activeMembers.map((m) =>
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
