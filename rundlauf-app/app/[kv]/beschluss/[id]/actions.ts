"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { eligibleVoters, resolutions, votes } from "@/lib/db/schema";
import { computeResult, isPastDeadline, parseOptions } from "@/lib/resolution";
import { requireTenantContext, requireAdmin } from "@/lib/tenant";

const voteSchema = z.object({
  kv: z.string().min(1),
  resolutionId: z.string().uuid(),
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
    optionId: formData.get("optionId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const ctx = await requireTenantContext(parsed.data.kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Beschluss nicht gefunden" };
  }
  if (r.status !== "laufend") {
    return { ok: false, message: "Beschluss ist nicht (mehr) laufend" };
  }
  if (isPastDeadline(r.fristEnde)) {
    return { ok: false, message: "Frist ist abgelaufen" };
  }
  const validOptionIds = parseOptions(r.optionen).map((o) => o.id);
  if (!validOptionIds.includes(parsed.data.optionId)) {
    return { ok: false, message: "Ungültige Antwortoption" };
  }

  // Stimmberechtigung prüfen
  const eligible = (
    await db
      .select()
      .from(eligibleVoters)
      .where(
        and(
          eq(eligibleVoters.resolutionId, r.id),
          eq(eligibleVoters.userId, ctx.user.id),
        ),
      )
      .limit(1)
  )[0];
  if (!eligible) {
    return { ok: false, message: "Du bist für diesen Beschluss nicht stimmberechtigt" };
  }

  // Existierende Stimme prüfen
  const existing = (
    await db
      .select()
      .from(votes)
      .where(and(eq(votes.resolutionId, r.id), eq(votes.userId, ctx.user.id)))
      .limit(1)
  )[0];

  const fp = await fingerprint();

  if (existing) {
    if (r.voteChangeMode === "fest") {
      return { ok: false, message: "Deine Stimme wurde bereits abgegeben und ist unwiderruflich." };
    }
    await db
      .update(votes)
      .set({
        optionId: parsed.data.optionId,
        updatedAt: new Date(),
        ipHash: fp.ipHash,
        userAgentHash: fp.uaHash,
      })
      .where(eq(votes.id, existing.id));
    await logAudit({
      action: "vote.updated",
      tenantId: ctx.tenant.id,
      actorUserId: ctx.user.id,
      targetType: "resolution",
      targetId: r.id,
      payload: { optionId: parsed.data.optionId },
    });
  } else {
    await db.insert(votes).values({
      resolutionId: r.id,
      userId: ctx.user.id,
      optionId: parsed.data.optionId,
      ipHash: fp.ipHash,
      userAgentHash: fp.uaHash,
    });
    await logAudit({
      action: "vote.submitted",
      tenantId: ctx.tenant.id,
      actorUserId: ctx.user.id,
      targetType: "resolution",
      targetId: r.id,
      payload: { optionId: parsed.data.optionId },
    });
  }

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
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);

  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) return { ok: false, message: "Beschluss nicht gefunden" };
  if (r.status !== "laufend") return { ok: false, message: "Beschluss ist nicht laufend" };

  await finalizeResolution(r.id);
  await logAudit({
    action: "resolution.closed",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r.id,
  });

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
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, parsed.data.resolutionId)).limit(1)
  )[0];
  if (!r || r.tenantId !== ctx.tenant.id) return { ok: false, message: "Beschluss nicht gefunden" };
  if (r.status !== "laufend") return { ok: false, message: "Beschluss ist nicht laufend" };

  await db
    .update(resolutions)
    .set({ status: "zurueckgezogen", abgeschlossenAm: new Date() })
    .where(eq(resolutions.id, r.id));
  await logAudit({
    action: "resolution.withdrawn",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r.id,
  });
  revalidatePath(`/${parsed.data.kv}/beschluss/${r.id}`);
  return { ok: true, message: "Beschluss zurückgezogen" };
}

/** Berechnet das Ergebnis und schreibt es in resolutions.ergebnis. */
export async function finalizeResolution(resolutionId: string) {
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, resolutionId)).limit(1)
  )[0];
  if (!r) return;

  const eligible = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eligibleVoters)
    .where(eq(eligibleVoters.resolutionId, r.id));
  const eligibleCount = eligible[0]?.count ?? 0;

  const rows = await db
    .select({ optionId: votes.optionId, c: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.resolutionId, r.id))
    .groupBy(votes.optionId);
  const voteCounts: Record<string, number> = {};
  for (const row of rows) voteCounts[row.optionId] = row.c;

  const result = computeResult({ resolution: r, eligibleCount, voteCounts });

  await db
    .update(resolutions)
    .set({
      status: "abgeschlossen",
      abgeschlossenAm: new Date(),
      ergebnis: result,
    })
    .where(eq(resolutions.id, r.id));
}
