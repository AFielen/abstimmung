import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { memberships, tenants } from "@/lib/db/schema";
import type { Membership, Tenant, User } from "@/lib/db/schema";

export type TenantContext = {
  user: User;
  tenant: Tenant;
  membership: Membership;
  isOwner: boolean;
  isAdmin: boolean;
};

export const requireTenantContext = cache(
  async (slug: string): Promise<TenantContext> => {
    const user = await getCurrentUser();
    if (!user) {
      // Nach der Anmeldung zurück auf die angeforderte Seite (siehe proxy.ts).
      const path = (await headers()).get("x-pathname");
      redirect(path && path.startsWith("/") ? `/login?next=${encodeURIComponent(path)}` : "/login");
    }

    const tenant = (
      await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
    )[0];
    if (!tenant) notFound();
    if (tenant.status !== "active") {
      if (user.isSuperadmin) {
        // Super-Admin darf pending KVs sehen, sonst weiterleiten
      } else {
        redirect("/");
      }
    }

    const membership = (
      await db
        .select()
        .from(memberships)
        .where(
          and(eq(memberships.tenantId, tenant.id), eq(memberships.userId, user.id)),
        )
        .limit(1)
    )[0];

    if (!membership || membership.status !== "active") {
      if (user.isSuperadmin) {
        // Super-Admin darf einsehen, aber keine Mitgliedsrechte
        return {
          user,
          tenant,
          membership: {
            id: "superadmin-virtual",
            tenantId: tenant.id,
            userId: user.id,
            role: "admin",
            status: "active",
            invitedByUserId: null,
            invitedAt: new Date(),
            joinedAt: new Date(),
            removedAt: null,
          },
          isOwner: false,
          isAdmin: true,
        };
      }
      redirect("/");
    }

    return {
      user,
      tenant,
      membership,
      isOwner: membership.role === "owner",
      isAdmin: membership.role === "owner" || membership.role === "admin",
    };
  },
);

export async function requireAdmin(slug: string): Promise<TenantContext> {
  const ctx = await requireTenantContext(slug);
  if (!ctx.isAdmin) redirect(`/${slug}`);
  return ctx;
}
