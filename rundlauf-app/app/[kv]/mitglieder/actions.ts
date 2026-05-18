"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createMagicToken } from "@/lib/auth/magic";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { sendInviteLink } from "@/lib/mail/templates";
import { requireAdmin } from "@/lib/tenant";

const inviteSchema = z.object({
  kv: z.string().min(1),
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  role: z.enum(["admin", "member"]),
  name: z.string().max(120).optional(),
});

export type InviteState = { ok: boolean; message?: string };

export async function inviteMember(
  _prev: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    kv: formData.get("kv"),
    email: formData.get("email"),
    role: formData.get("role"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const ctx = await requireAdmin(parsed.data.kv);

  // User anlegen falls nötig
  let user = (
    await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email}`)
      .limit(1)
  )[0];

  if (!user) {
    user = (
      await db
        .insert(users)
        .values({ email: parsed.data.email, name: parsed.data.name })
        .returning()
    )[0];
  } else if (parsed.data.name && !user.name) {
    await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, user.id));
    user = { ...user, name: parsed.data.name };
  }

  // Membership prüfen
  const existing = (
    await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.tenantId, ctx.tenant.id), eq(memberships.userId, user.id)),
      )
      .limit(1)
  )[0];

  if (existing && existing.status === "active") {
    return { ok: false, message: "Diese Person ist bereits Mitglied" };
  }

  if (existing) {
    await db
      .update(memberships)
      .set({ status: "invited", role: parsed.data.role, invitedAt: new Date(), removedAt: null })
      .where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({
      tenantId: ctx.tenant.id,
      userId: user.id,
      role: parsed.data.role,
      status: "invited",
      invitedByUserId: ctx.user.id,
    });
  }

  // Magic-Link für Invite versenden
  const { raw } = await createMagicToken({
    email: parsed.data.email,
    purpose: "invite",
    userId: user.id,
    tenantId: ctx.tenant.id,
    ttlMinutes: 7 * 24 * 60,
  });

  await sendInviteLink({
    to: { email: parsed.data.email, name: user.name ?? undefined },
    inviterName: ctx.user.name ?? ctx.user.email,
    tenantName: ctx.tenant.name,
    rawToken: raw,
  });

  await logAudit({
    action: "membership.invited",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "user",
    targetId: user.id,
    payload: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath(`/${parsed.data.kv}/mitglieder`);
  return { ok: true, message: `Einladung an ${parsed.data.email} versendet` };
}

const removeSchema = z.object({
  kv: z.string().min(1),
  membershipId: z.string().uuid(),
});

export async function removeMember(
  _prev: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  const parsed = removeSchema.safeParse({
    kv: formData.get("kv"),
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const ctx = await requireAdmin(parsed.data.kv);
  const m = (
    await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, parsed.data.membershipId))
      .limit(1)
  )[0];
  if (!m || m.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Mitglied nicht gefunden" };
  }
  if (m.role === "owner") {
    return { ok: false, message: "Owner kann nicht entfernt werden" };
  }

  await db
    .update(memberships)
    .set({ status: "removed", removedAt: new Date() })
    .where(eq(memberships.id, m.id));

  await logAudit({
    action: "membership.removed",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "membership",
    targetId: m.id,
  });

  revalidatePath(`/${parsed.data.kv}/mitglieder`);
  return { ok: true, message: "Mitglied entfernt" };
}

const roleSchema = z.object({
  kv: z.string().min(1),
  membershipId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export async function changeRole(
  _prev: InviteState | null,
  formData: FormData,
): Promise<InviteState> {
  const parsed = roleSchema.safeParse({
    kv: formData.get("kv"),
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe" };

  const ctx = await requireAdmin(parsed.data.kv);
  const m = (
    await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, parsed.data.membershipId))
      .limit(1)
  )[0];
  if (!m || m.tenantId !== ctx.tenant.id) {
    return { ok: false, message: "Mitglied nicht gefunden" };
  }
  if (m.role === "owner") {
    return { ok: false, message: "Owner-Rolle kann nicht geändert werden" };
  }

  await db
    .update(memberships)
    .set({ role: parsed.data.role })
    .where(eq(memberships.id, m.id));

  await logAudit({
    action: "membership.role_changed",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "membership",
    targetId: m.id,
    payload: { role: parsed.data.role },
  });

  revalidatePath(`/${parsed.data.kv}/mitglieder`);
  return { ok: true, message: "Rolle geändert" };
}
