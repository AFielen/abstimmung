"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  agendaItems,
  attachments,
  eligibleVoters,
  memberships,
  resolutions,
  users,
} from "@/lib/db/schema";
import { sendResolutionInvite } from "@/lib/mail/templates";
import { DEFAULT_OPTIONS, MIN_FRIST_DAYS } from "@/lib/resolution";
import { requireAdmin } from "@/lib/tenant";

export type ActionState = { ok: boolean; message?: string };

// ──────────────────────────────────────────────────────────────────────────
// Helpers

async function loadDraft(kv: string, resolutionId: string) {
  const ctx = await requireAdmin(kv);
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, resolutionId)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) {
    return { error: "Beschluss nicht gefunden" as const, ctx, r: null };
  }
  if (r.status !== "draft") {
    return { error: "Beschluss ist kein Entwurf mehr" as const, ctx, r };
  }
  return { error: null, ctx, r };
}

// ──────────────────────────────────────────────────────────────────────────
// Umlauf-Metadaten aktualisieren (Betreff, Frist, Stimm-Modus)

const metaSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  betreff: z.string().max(200).optional(),
  fristEnde: z.string().min(1),
  voteChangeMode: z.enum(["aenderbar", "fest"]),
});

export async function updateResolutionMeta(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = metaSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    betreff: formData.get("betreff") || undefined,
    fristEnde: formData.get("fristEnde"),
    voteChangeMode: formData.get("voteChangeMode"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const { error, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  const fristEnde = new Date(parsed.data.fristEnde);
  if (Number.isNaN(fristEnde.getTime())) {
    return { ok: false, message: "Ungültiges Fristdatum" };
  }

  await db
    .update(resolutions)
    .set({
      betreff: (parsed.data.betreff ?? "").trim(),
      fristEnde,
      voteChangeMode: parsed.data.voteChangeMode,
    })
    .where(eq(resolutions.id, r!.id));

  revalidatePath(`/${parsed.data.kv}/beschluss/${r!.id}/bearbeiten`);
  return { ok: true, message: "Gespeichert" };
}

// ──────────────────────────────────────────────────────────────────────────
// TOP anlegen

const addTopSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  titel: z.string().min(3, "Titel zu kurz").max(200),
  beschlussvorschlag: z.string().min(1, "Beschlussvorschlag erforderlich").max(20000),
  sachlage: z.string().max(20000).optional(),
  finanzielleAuswirkungen: z.string().max(2000).optional(),
  auskunftErteilen: z.string().max(500).optional(),
  quorumPct: z.coerce.number().int().min(50).max(100),
  mehrheit: z.enum(["simple", "two_thirds", "three_quarters"]),
});

export async function addAgendaItem(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addTopSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    titel: formData.get("titel"),
    beschlussvorschlag: formData.get("beschlussvorschlag"),
    sachlage: formData.get("sachlage") || undefined,
    finanzielleAuswirkungen: formData.get("finanzielleAuswirkungen") || undefined,
    auskunftErteilen: formData.get("auskunftErteilen") || undefined,
    quorumPct: formData.get("quorumPct") ?? 75,
    mehrheit: formData.get("mehrheit"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  const existing = (
    await db
      .select({ maxOrdinal: max(agendaItems.ordinal) })
      .from(agendaItems)
      .where(eq(agendaItems.resolutionId, r!.id))
  )[0];
  const nextOrdinal = (existing?.maxOrdinal ?? 0) + 1;

  const inserted = await db
    .insert(agendaItems)
    .values({
      resolutionId: r!.id,
      ordinal: nextOrdinal,
      titel: parsed.data.titel.trim(),
      beschlussvorschlagMd: parsed.data.beschlussvorschlag.trim(),
      sachlageMd: parsed.data.sachlage?.trim() || null,
      finanzielleAuswirkungen: parsed.data.finanzielleAuswirkungen?.trim() || null,
      auskunftErteilen: parsed.data.auskunftErteilen?.trim() || null,
      optionen: DEFAULT_OPTIONS,
      quorumPct: parsed.data.quorumPct,
      mehrheit: parsed.data.mehrheit,
    })
    .returning();

  await logAudit({
    action: "top.created",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "agenda_item",
    targetId: inserted[0].id,
    payload: { resolutionId: r!.id, ordinal: nextOrdinal, titel: inserted[0].titel },
  });

  revalidatePath(`/${parsed.data.kv}/beschluss/${r!.id}/bearbeiten`);
  return { ok: true, message: "TOP hinzugefügt" };
}

// ──────────────────────────────────────────────────────────────────────────
// TOP aktualisieren

const updateTopSchema = addTopSchema.extend({
  agendaItemId: z.string().uuid(),
});

export async function updateAgendaItem(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTopSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    agendaItemId: formData.get("agendaItemId"),
    titel: formData.get("titel"),
    beschlussvorschlag: formData.get("beschlussvorschlag"),
    sachlage: formData.get("sachlage") || undefined,
    finanzielleAuswirkungen: formData.get("finanzielleAuswirkungen") || undefined,
    auskunftErteilen: formData.get("auskunftErteilen") || undefined,
    quorumPct: formData.get("quorumPct") ?? 75,
    mehrheit: formData.get("mehrheit"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  const top = (
    await db
      .select()
      .from(agendaItems)
      .where(
        and(
          eq(agendaItems.id, parsed.data.agendaItemId),
          eq(agendaItems.resolutionId, r!.id),
        ),
      )
      .limit(1)
  )[0];
  if (!top) return { ok: false, message: "TOP nicht gefunden" };

  await db
    .update(agendaItems)
    .set({
      titel: parsed.data.titel.trim(),
      beschlussvorschlagMd: parsed.data.beschlussvorschlag.trim(),
      sachlageMd: parsed.data.sachlage?.trim() || null,
      finanzielleAuswirkungen: parsed.data.finanzielleAuswirkungen?.trim() || null,
      auskunftErteilen: parsed.data.auskunftErteilen?.trim() || null,
      quorumPct: parsed.data.quorumPct,
      mehrheit: parsed.data.mehrheit,
    })
    .where(eq(agendaItems.id, top.id));

  await logAudit({
    action: "top.updated",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "agenda_item",
    targetId: top.id,
  });

  revalidatePath(`/${parsed.data.kv}/beschluss/${r!.id}/bearbeiten`);
  return { ok: true, message: "TOP aktualisiert" };
}

// ──────────────────────────────────────────────────────────────────────────
// TOP entfernen

const deleteTopSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  agendaItemId: z.string().uuid(),
});

export async function deleteAgendaItem(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deleteTopSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    agendaItemId: formData.get("agendaItemId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  const top = (
    await db
      .select()
      .from(agendaItems)
      .where(
        and(
          eq(agendaItems.id, parsed.data.agendaItemId),
          eq(agendaItems.resolutionId, r!.id),
        ),
      )
      .limit(1)
  )[0];
  if (!top) return { ok: false, message: "TOP nicht gefunden" };

  await db.delete(agendaItems).where(eq(agendaItems.id, top.id));

  // Ordinal-Nummern lückenlos halten
  const remaining = await db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, r!.id))
    .orderBy(asc(agendaItems.ordinal));
  for (let i = 0; i < remaining.length; i++) {
    const desired = i + 1;
    if (remaining[i].ordinal !== desired) {
      await db
        .update(agendaItems)
        .set({ ordinal: desired })
        .where(eq(agendaItems.id, remaining[i].id));
    }
  }

  await logAudit({
    action: "top.deleted",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "agenda_item",
    targetId: top.id,
  });

  revalidatePath(`/${parsed.data.kv}/beschluss/${r!.id}/bearbeiten`);
  return { ok: true, message: "TOP entfernt" };
}

// ──────────────────────────────────────────────────────────────────────────
// Anlage löschen

const deleteAttachmentSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

export async function deleteAttachment(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deleteAttachmentSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    attachmentId: formData.get("attachmentId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  const att = (
    await db
      .select({ id: attachments.id, filename: attachments.filename })
      .from(attachments)
      .where(
        and(
          eq(attachments.id, parsed.data.attachmentId),
          eq(attachments.resolutionId, r!.id),
        ),
      )
      .limit(1)
  )[0];
  if (!att) return { ok: false, message: "Anlage nicht gefunden" };

  await db.delete(attachments).where(eq(attachments.id, att.id));

  await logAudit({
    action: "attachment.deleted",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "attachment",
    targetId: att.id,
    payload: { filename: att.filename },
  });

  revalidatePath(`/${parsed.data.kv}/beschluss/${r!.id}/bearbeiten`);
  return { ok: true, message: "Anlage entfernt" };
}

// ──────────────────────────────────────────────────────────────────────────
// Beschluss eröffnen (Draft → laufend)

const finalizeSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  eligibleUserIds: z.array(z.string().uuid()).min(2, "Mindestens 2 Stimmberechtigte"),
});

export async function publishResolution(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const eligibleUserIds = formData.getAll("eligibleUserIds").map(String).filter(Boolean);
  const parsed = finalizeSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    eligibleUserIds,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  // Frist erneut prüfen
  const minDate = new Date(Date.now() + MIN_FRIST_DAYS * 24 * 60 * 60 * 1000);
  if (r!.fristEnde.getTime() < minDate.getTime()) {
    return {
      ok: false,
      message: `Die Frist liegt zu nah. Mindestens ${MIN_FRIST_DAYS} Tage in der Zukunft.`,
    };
  }

  // Mindestens 1 TOP
  const topCount = (
    await db
      .select({ id: agendaItems.id })
      .from(agendaItems)
      .where(eq(agendaItems.resolutionId, r!.id))
  ).length;
  if (topCount < 1) {
    return { ok: false, message: "Mindestens ein TOP erforderlich." };
  }

  // Stimmberechtigte validieren
  const requestedIds = Array.from(new Set(parsed.data.eligibleUserIds));
  const validMembers = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.tenantId, ctx.tenant.id),
        inArray(memberships.status, ["active", "invited"]),
        inArray(memberships.userId, requestedIds),
      ),
    );

  if (validMembers.length < 2) {
    return { ok: false, message: "Mindestens 2 Mitglieder (aktiv oder eingeladen) müssen ausgewählt sein." };
  }
  if (validMembers.length !== requestedIds.length) {
    return {
      ok: false,
      message:
        "Mindestens ein ausgewählter Benutzer ist nicht (mehr) Mitglied oder wurde entfernt. Bitte Liste prüfen.",
    };
  }

  // Eligible-Voter Snapshots schreiben. Aktive Mitglieder bekommen die Mail
  // unten sofort → inviteEmailSentAt = jetzt. Eingeladene bekommen sie beim
  // Beitritt → inviteEmailSentAt bleibt NULL.
  const publishedAt = new Date();
  await db.insert(eligibleVoters).values(
    validMembers.map((m) => ({
      resolutionId: r!.id,
      userId: m.userId,
      nameSnapshot: m.name ?? m.email,
      emailSnapshot: m.email,
      roleSnapshot: m.role,
      inviteEmailSentAt: m.status === "active" ? publishedAt : null,
    })),
  );

  const activeMembers = validMembers.filter((m) => m.status === "active");
  const pendingInviteCount = validMembers.length - activeMembers.length;

  // Status auf laufend
  await db
    .update(resolutions)
    .set({ status: "laufend", startedAt: publishedAt })
    .where(eq(resolutions.id, r!.id));

  await logAudit({
    action: "resolution.published",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r!.id,
    payload: {
      eligibleCount: validMembers.length,
      activeCount: activeMembers.length,
      pendingInviteCount,
      topCount,
      fristEnde: r!.fristEnde.toISOString(),
    },
  });

  // Einladungs-Mails an aktive Mitglieder. Eingeladene erhalten den Link beim
  // Beitritt automatisch (siehe lib/mail/pending-invites.ts).
  const link = `${process.env.APP_URL?.replace(/\/$/, "")}/${ctx.tenant.slug}/beschluss/${r!.id}`;
  const subjectTitle =
    r!.betreff || `Umlaufverfahren mit ${topCount} Beschlussvorlage${topCount === 1 ? "" : "n"}`;
  await Promise.allSettled(
    activeMembers.map((m) =>
      sendResolutionInvite({
        to: { email: m.email, name: m.name ?? undefined },
        tenantName: ctx.tenant.name,
        resolutionTitle: subjectTitle,
        resolutionLink: link,
        fristEnde: r!.fristEnde,
        topCount,
      }),
    ),
  );

  revalidatePath(`/${parsed.data.kv}`);
  redirect(`/${parsed.data.kv}/beschluss/${r!.id}`);
}

// ──────────────────────────────────────────────────────────────────────────
// Entwurf verwerfen

const discardSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
});

export async function discardDraft(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = discardSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const { error, ctx, r } = await loadDraft(parsed.data.kv, parsed.data.resolutionId);
  if (error) return { ok: false, message: error };

  await db.delete(resolutions).where(eq(resolutions.id, r!.id));

  await logAudit({
    action: "resolution.discarded",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r!.id,
  });

  revalidatePath(`/${parsed.data.kv}`);
  redirect(`/${parsed.data.kv}`);
}
