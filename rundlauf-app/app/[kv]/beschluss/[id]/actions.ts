"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db, isUniqueViolation } from "@/lib/db";
import {
  agendaItems,
  eligibleVoters,
  resolutions,
  votes,
} from "@/lib/db/schema";
import { finalizeResolution } from "@/lib/finalize";
import { notifyResolutionResult } from "@/lib/mail/resolution-result";
import { isPastDeadline, parseOptions } from "@/lib/resolution";
import { requireAdmin, requireTenantContext } from "@/lib/tenant";
import { belongsToTenant, invalidInput } from "@/lib/action-helpers";

const voteSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
  agendaItemId: z.string().uuid(),
  optionId: z.string().min(1).max(64),
});

export type VoteState = { ok: boolean; message?: string };

async function fingerprint(): Promise<{ ipHash?: string; uaHash?: string }> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
    const ua = h.get("user-agent") ?? "";
    return {
      ipHash: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 32) : undefined,
      uaHash: ua ? createHash("sha256").update(ua).digest("hex").slice(0, 32) : undefined,
    };
  } catch {
    return {};
  }
}

export async function submitVote(
  _prev: VoteState | null,
  formData: FormData,
): Promise<VoteState> {
  const parsed = voteSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
    agendaItemId: formData.get("agendaItemId"),
    optionId: formData.get("optionId"),
  });
  if (!parsed.success) return invalidInput();

  const ctx = await requireTenantContext(parsed.data.kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) {
    return { ok: false, message: "Beschluss nicht gefunden" };
  }
  if (r.status !== "laufend") {
    return { ok: false, message: "Beschluss ist nicht (mehr) laufend" };
  }
  if (isPastDeadline(r.fristEnde)) {
    return { ok: false, message: "Frist ist abgelaufen" };
  }

  const top = (
    await db
      .select()
      .from(agendaItems)
      .where(
        and(
          eq(agendaItems.id, parsed.data.agendaItemId),
          eq(agendaItems.resolutionId, r.id),
        ),
      )
      .limit(1)
  )[0];
  if (!top) return { ok: false, message: "TOP nicht gefunden" };

  const validOptionIds = parseOptions(top.optionen).map((o) => o.id);
  if (!validOptionIds.includes(parsed.data.optionId)) {
    return { ok: false, message: "Ungültige Antwortoption" };
  }

  // Stimmberechtigung prüfen (auf Resolution-Ebene)
  const eligible = (
    await db
      .select()
      .from(eligibleVoters)
      .where(
        and(eq(eligibleVoters.resolutionId, r.id), eq(eligibleVoters.userId, ctx.user.id)),
      )
      .limit(1)
  )[0];
  if (!eligible) {
    return { ok: false, message: "Du bist für diesen Beschluss nicht stimmberechtigt" };
  }

  const fp = await fingerprint();

  // Transaktion mit FOR SHARE auf der Resolution-Zeile: finalizeResolution()
  // sperrt dieselbe Zeile per UPDATE. Eine Stimme, die parallel zum Abschluss
  // eintrifft, wartet und sieht danach "abgeschlossen" – so fehlt im
  // Ergebnis-Snapshot keine gezählte Stimme. Zwei gleichzeitige Erststimmen
  // desselben Nutzers fängt der Unique-Index votes(agenda_item_id, user_id).
  let outcome: "submitted" | "updated" | "closed" | "fixed";
  try {
    outcome = await db.transaction(async (tx) => {
      const locked = (
        await tx
          .select({ status: resolutions.status, fristEnde: resolutions.fristEnde })
          .from(resolutions)
          .where(eq(resolutions.id, r.id))
          .for("share")
      )[0];
      if (!locked || locked.status !== "laufend" || isPastDeadline(locked.fristEnde)) {
        return "closed" as const;
      }

      const existing = (
        await tx
          .select({ id: votes.id })
          .from(votes)
          .where(and(eq(votes.agendaItemId, top.id), eq(votes.userId, ctx.user.id)))
          .limit(1)
      )[0];

      if (existing) {
        if (r.voteChangeMode === "fest") return "fixed" as const;
        await tx
          .update(votes)
          .set({
            optionId: parsed.data.optionId,
            updatedAt: new Date(),
            ipHash: fp.ipHash,
            userAgentHash: fp.uaHash,
          })
          .where(eq(votes.id, existing.id));
        return "updated" as const;
      }

      await tx.insert(votes).values({
        agendaItemId: top.id,
        userId: ctx.user.id,
        optionId: parsed.data.optionId,
        ipHash: fp.ipHash,
        userAgentHash: fp.uaHash,
      });
      return "submitted" as const;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        message: "Deine Stimme wurde gerade schon gespeichert. Bitte lade die Seite neu.",
      };
    }
    throw err;
  }

  if (outcome === "closed") {
    return { ok: false, message: "Beschluss ist nicht (mehr) laufend oder die Frist ist abgelaufen" };
  }
  if (outcome === "fixed") {
    return {
      ok: false,
      message: "Deine Stimme zu diesem TOP wurde bereits abgegeben und ist unwiderruflich.",
    };
  }

  await logAudit({
    action: outcome === "updated" ? "vote.updated" : "vote.submitted",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "agenda_item",
    targetId: top.id,
    payload: { optionId: parsed.data.optionId, resolutionId: r.id },
  });

  revalidatePath(`/${parsed.data.kv}/beschluss/${r.id}`);
  return { ok: true, message: "Stimme gespeichert" };
}

const closeSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
});

export async function closeResolution(
  _prev: VoteState | null,
  formData: FormData,
): Promise<VoteState> {
  const parsed = closeSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
  });
  if (!parsed.success) return invalidInput();
  const ctx = await requireAdmin(parsed.data.kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) return { ok: false, message: "Beschluss nicht gefunden" };
  if (r.status !== "laufend") return { ok: false, message: "Beschluss ist nicht laufend" };

  const finalized = await finalizeResolution(r.id);
  if (!finalized) return { ok: false, message: "Beschluss ist nicht (mehr) laufend" };
  await logAudit({
    action: "resolution.closed",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r.id,
  });
  // Ergebnis-Mail an alle Stimmberechtigten, nach der Antwort an den Admin.
  after(() => notifyResolutionResult(r.id));

  revalidatePath(`/${parsed.data.kv}/beschluss/${r.id}`);
  return { ok: true, message: "Beschluss abgeschlossen" };
}

export async function withdrawResolution(
  _prev: VoteState | null,
  formData: FormData,
): Promise<VoteState> {
  const parsed = closeSchema.safeParse({
    kv: formData.get("kv"),
    resolutionId: formData.get("resolutionId"),
  });
  if (!parsed.success) return invalidInput();
  const ctx = await requireAdmin(parsed.data.kv);
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!belongsToTenant(r, ctx.tenant.id)) return { ok: false, message: "Beschluss nicht gefunden" };
  if (r.status !== "laufend") return { ok: false, message: "Beschluss ist nicht laufend" };

  const withdrawn = await db
    .update(resolutions)
    .set({ status: "zurueckgezogen", abgeschlossenAm: new Date() })
    .where(and(eq(resolutions.id, r.id), eq(resolutions.status, "laufend")))
    .returning({ id: resolutions.id });
  if (withdrawn.length === 0) return { ok: false, message: "Beschluss ist nicht (mehr) laufend" };
  await logAudit({
    action: "resolution.withdrawn",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r.id,
  });
  after(() => notifyResolutionResult(r.id));
  revalidatePath(`/${parsed.data.kv}/beschluss/${r.id}`);
  return { ok: true, message: "Beschluss zurückgezogen" };
}

