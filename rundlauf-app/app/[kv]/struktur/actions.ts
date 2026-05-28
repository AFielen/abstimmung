"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bodies, organizations, resolutions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/tenant";

export type StrukturState = { ok: boolean; message?: string };

// ─── Organizations ──────────────────────────────────────────────────────────

const orgCreateSchema = z.object({
  kv: z.string().min(1),
  name: z.string().min(2).max(160).transform((v) => v.trim()),
  type: z.enum(["verein", "gmbh", "ggmbh", "gug", "kdoer", "sonstige"]),
  description: z.string().max(500).optional(),
});

export async function createOrganization(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = orgCreateSchema.safeParse({
    kv: formData.get("kv"),
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const ctx = await requireAdmin(parsed.data.kv);

  const [org] = await db
    .insert(organizations)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
    })
    .returning();

  await logAudit({
    action: "organization.created",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "organization",
    targetId: org.id,
    payload: { name: org.name, type: org.type },
  });

  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Organisation angelegt" };
}

const orgDeleteSchema = z.object({
  kv: z.string().min(1),
  organizationId: z.string().uuid(),
});

export async function deleteOrganization(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = orgDeleteSchema.safeParse({
    kv: formData.get("kv"),
    organizationId: formData.get("organizationId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);

  const org = (
    await db.select().from(organizations).where(eq(organizations.id, parsed.data.organizationId)).limit(1)
  )[0];
  if (!org || org.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Organisation nicht gefunden" };
  }

  const beschluss = (
    await db
      .select({ id: resolutions.id })
      .from(resolutions)
      .innerJoin(bodies, eq(resolutions.bodyId, bodies.id))
      .where(eq(bodies.organizationId, org.id))
      .limit(1)
  )[0];
  if (beschluss) {
    return {
      ok: false,
      message: "Organisation hat Gremien mit Beschlüssen und kann nicht gelöscht werden. Erst Gremien aufräumen/ablösen.",
    };
  }

  await db.delete(organizations).where(eq(organizations.id, org.id));
  await logAudit({
    action: "organization.deleted",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "organization",
    targetId: org.id,
  });
  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Organisation gelöscht. Zugeordnete Gremien sind nun lose." };
}

// ─── Bodies ─────────────────────────────────────────────────────────────────

const bodyCreateSchema = z.object({
  kv: z.string().min(1),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(120).transform((v) => v.trim()),
  defaultQuorumPct: z.coerce.number().int().min(50).max(100).default(75),
  defaultMehrheit: z.enum(["simple", "two_thirds", "three_quarters"]).default("simple"),
});

export async function createBody(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = bodyCreateSchema.safeParse({
    kv: formData.get("kv"),
    organizationId: formData.get("organizationId") || undefined,
    name: formData.get("name"),
    defaultQuorumPct: formData.get("defaultQuorumPct") ?? 75,
    defaultMehrheit: formData.get("defaultMehrheit") ?? "simple",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const ctx = await requireAdmin(parsed.data.kv);

  let orgId: string | null = null;
  if (parsed.data.organizationId && parsed.data.organizationId !== "") {
    const org = (
      await db.select().from(organizations).where(eq(organizations.id, parsed.data.organizationId)).limit(1)
    )[0];
    if (!org || org.tenantId !== ctx.tenant.id) {
      return { ok: false, message: "Organisation nicht gefunden" };
    }
    orgId = org.id;
  }

  const [body] = await db
    .insert(bodies)
    .values({
      tenantId: ctx.tenant.id,
      organizationId: orgId,
      name: parsed.data.name,
      defaultQuorumPct: parsed.data.defaultQuorumPct,
      defaultMehrheit: parsed.data.defaultMehrheit,
    })
    .returning();

  await logAudit({
    action: "body.created",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "body",
    targetId: body.id,
    payload: { name: body.name, organizationId: orgId },
  });

  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Gremium angelegt" };
}

const bodyArchiveSchema = z.object({
  kv: z.string().min(1),
  bodyId: z.string().uuid(),
});

export async function archiveBody(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = bodyArchiveSchema.safeParse({
    kv: formData.get("kv"),
    bodyId: formData.get("bodyId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);

  const body = (
    await db.select().from(bodies).where(eq(bodies.id, parsed.data.bodyId)).limit(1)
  )[0];
  if (!body || body.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Gremium nicht gefunden" };
  }

  const offen = (
    await db
      .select({ id: resolutions.id })
      .from(resolutions)
      .where(and(eq(resolutions.bodyId, body.id), inArray(resolutions.status, ["draft", "laufend"])))
      .limit(1)
  )[0];
  if (offen) {
    return {
      ok: false,
      message: "Gremium hat noch offene Beschlüsse (Entwurf oder laufend) und kann nicht archiviert werden.",
    };
  }

  await db
    .update(bodies)
    .set({ archivedAt: new Date() })
    .where(eq(bodies.id, body.id));
  await logAudit({
    action: "body.archived",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "body",
    targetId: body.id,
  });
  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Gremium archiviert" };
}

export async function unarchiveBody(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = bodyArchiveSchema.safeParse({
    kv: formData.get("kv"),
    bodyId: formData.get("bodyId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);

  const body = (
    await db.select().from(bodies).where(eq(bodies.id, parsed.data.bodyId)).limit(1)
  )[0];
  if (!body || body.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Gremium nicht gefunden" };
  }

  await db
    .update(bodies)
    .set({ archivedAt: null })
    .where(eq(bodies.id, body.id));
  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Gremium wiederhergestellt" };
}

export async function deleteBody(
  _prev: StrukturState | null,
  formData: FormData,
): Promise<StrukturState> {
  const parsed = bodyArchiveSchema.safeParse({
    kv: formData.get("kv"),
    bodyId: formData.get("bodyId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };
  const ctx = await requireAdmin(parsed.data.kv);

  const body = (
    await db.select().from(bodies).where(eq(bodies.id, parsed.data.bodyId)).limit(1)
  )[0];
  if (!body || body.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Gremium nicht gefunden" };
  }

  const existing = (
    await db
      .select({ id: resolutions.id })
      .from(resolutions)
      .where(and(eq(resolutions.bodyId, body.id)))
      .limit(1)
  )[0];
  if (existing) {
    return {
      ok: false,
      message: "Gremium hat bereits Beschlüsse und kann nicht gelöscht werden. Archivieren möglich.",
    };
  }

  await db.delete(bodies).where(eq(bodies.id, body.id));
  await logAudit({
    action: "body.deleted",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "body",
    targetId: body.id,
  });
  revalidatePath(`/${parsed.data.kv}/struktur`);
  return { ok: true, message: "Gremium gelöscht" };
}

