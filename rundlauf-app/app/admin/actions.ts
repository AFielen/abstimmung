"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { memberships, tenants, users } from "@/lib/db/schema";
import { sendTenantApproved, sendTenantRejected } from "@/lib/mail/templates";
import { invalidInput } from "@/lib/action-helpers";

const approveSchema = z.object({ tenantId: z.string().uuid() });
const rejectSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export type ModerationState = { ok: boolean; message?: string };

export async function approveTenant(
  _prev: ModerationState | null,
  formData: FormData,
): Promise<ModerationState> {
  const admin = await requireSuperadmin();
  const parsed = approveSchema.safeParse({ tenantId: formData.get("tenantId") });
  if (!parsed.success) return invalidInput();

  const tenantRow = (
    await db.select().from(tenants).where(eq(tenants.id, parsed.data.tenantId)).limit(1)
  )[0];
  if (!tenantRow) return { ok: false, message: "KV nicht gefunden" };
  if (tenantRow.status === "active") return { ok: false, message: "KV ist bereits aktiv" };

  await db
    .update(tenants)
    .set({
      status: "active",
      approvedAt: new Date(),
      approvedByUserId: admin.id,
    })
    .where(eq(tenants.id, tenantRow.id));

  // Owner-Membership aktivieren
  await db
    .update(memberships)
    .set({ status: "active", joinedAt: new Date() })
    .where(
      and(
        eq(memberships.tenantId, tenantRow.id),
        eq(memberships.userId, tenantRow.createdByUserId),
      ),
    );

  const creator = (
    await db.select().from(users).where(eq(users.id, tenantRow.createdByUserId)).limit(1)
  )[0];
  if (creator) {
    await sendTenantApproved({
      to: { email: creator.email },
      tenantName: tenantRow.name,
      tenantSlug: tenantRow.slug,
    });
  }

  await logAudit({
    action: "tenant.approved",
    tenantId: tenantRow.id,
    actorUserId: admin.id,
    targetType: "tenant",
    targetId: tenantRow.id,
  });

  revalidatePath("/admin");
  return { ok: true, message: "KV freigeschaltet" };
}

export async function rejectTenant(
  _prev: ModerationState | null,
  formData: FormData,
): Promise<ModerationState> {
  const admin = await requireSuperadmin();
  const parsed = rejectSchema.safeParse({
    tenantId: formData.get("tenantId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, message: "Begründung fehlt (3-500 Zeichen)" };

  const tenantRow = (
    await db.select().from(tenants).where(eq(tenants.id, parsed.data.tenantId)).limit(1)
  )[0];
  if (!tenantRow) return { ok: false, message: "KV nicht gefunden" };
  if (tenantRow.status !== "pending") return { ok: false, message: "Nur ausstehende KVs ablehnbar" };

  await db
    .update(tenants)
    .set({
      status: "suspended",
      rejectedAt: new Date(),
      rejectionReason: parsed.data.reason,
    })
    .where(eq(tenants.id, tenantRow.id));

  const creator = (
    await db.select().from(users).where(eq(users.id, tenantRow.createdByUserId)).limit(1)
  )[0];
  if (creator) {
    await sendTenantRejected({
      to: { email: creator.email },
      tenantName: tenantRow.name,
      reason: parsed.data.reason,
    });
  }

  await logAudit({
    action: "tenant.rejected",
    tenantId: tenantRow.id,
    actorUserId: admin.id,
    targetType: "tenant",
    targetId: tenantRow.id,
    payload: { reason: parsed.data.reason },
  });

  revalidatePath("/admin");
  return { ok: true, message: "Antrag abgelehnt" };
}
