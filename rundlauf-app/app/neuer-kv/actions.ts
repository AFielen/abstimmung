"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, getSuperadminEmails } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { memberships, tenants } from "@/lib/db/schema";
import { sendSuperadminNewTenantNotice } from "@/lib/mail/templates";
import { slugify } from "@/lib/slug";

const schema = z.object({
  name: z
    .string()
    .min(3, "Name muss mindestens 3 Zeichen lang sein")
    .max(120, "Name ist zu lang")
    .transform((v) => v.trim()),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten")
    .transform((v) => v.trim()),
});

export type CreateTenantState = {
  ok: boolean;
  message?: string;
  slug?: string;
};

export async function createTenant(
  _prev: CreateTenantState | null,
  formData: FormData,
): Promise<CreateTenantState> {
  const user = await requireUser();
  const rawName = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim() || slugify(rawName);

  const parsed = schema.safeParse({ name: rawName, slug: rawSlug });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const slugTaken = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data.slug))
    .limit(1);
  if (slugTaken.length > 0) {
    return { ok: false, message: "Diese Kennung ist bereits vergeben" };
  }

  const inserted = await db
    .insert(tenants)
    .values({
      slug: parsed.data.slug,
      name: parsed.data.name,
      status: "pending",
      createdByUserId: user.id,
    })
    .returning();
  const tenant = inserted[0];

  // Owner-Membership im Status "invited" – wird beim Freischalten aktiv
  await db.insert(memberships).values({
    tenantId: tenant.id,
    userId: user.id,
    role: "owner",
    status: "invited",
    invitedByUserId: user.id,
  });

  await logAudit({
    action: "tenant.created",
    tenantId: tenant.id,
    actorUserId: user.id,
    targetType: "tenant",
    targetId: tenant.id,
    payload: { name: tenant.name, slug: tenant.slug },
  });

  // Benachrichtige alle Super-Admins
  const superadminEmails = getSuperadminEmails();
  await Promise.allSettled(
    superadminEmails.map((email) =>
      sendSuperadminNewTenantNotice({
        to: { email },
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        createdByEmail: user.email,
      }),
    ),
  );

  return {
    ok: true,
    message: "Antrag eingereicht. Du wirst per E-Mail benachrichtigt, sobald der KV freigeschaltet ist.",
    slug: tenant.slug,
  };
}
