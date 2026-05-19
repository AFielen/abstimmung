import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { consumeMagicToken } from "@/lib/auth/magic";
import { isSuperadminEmail } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const consumed = await consumeMagicToken(token);

  const baseUrl = process.env.APP_URL ?? req.url;
  if (!consumed) {
    return NextResponse.redirect(new URL("/login?error=invalid", baseUrl));
  }

  // Stelle sicher, dass ein User existiert
  let userId = consumed.userId;
  if (!userId) {
    const existing = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${consumed.email}`)
      .limit(1);
    if (existing[0]) {
      userId = existing[0].id;
    } else {
      const inserted = await db
        .insert(users)
        .values({ email: consumed.email })
        .returning({ id: users.id });
      userId = inserted[0].id;
    }
  }

  // Superadmin-Status anhand der Env-Variable setzen
  const superadmin = isSuperadminEmail(consumed.email);
  await db
    .update(users)
    .set({ isSuperadmin: superadmin, lastLoginAt: new Date() })
    .where(eq(users.id, userId));

  // Falls invite + tenantId → Membership aktivieren
  if (consumed.purpose === "invite" && consumed.tenantId) {
    await db
      .update(memberships)
      .set({ status: "active", joinedAt: new Date() })
      .where(
        and(
          eq(memberships.tenantId, consumed.tenantId),
          eq(memberships.userId, userId),
        ),
      );
  }

  // Session setzen
  const session = await getSession();
  session.userId = userId;
  session.email = consumed.email;
  session.isSuperadmin = superadmin;
  await session.save();

  // Weiterleitungsziel
  let redirectTo = "/";
  if (consumed.purpose === "register") {
    redirectTo = "/neuer-kv";
  } else if (consumed.purpose === "invite" && consumed.tenantId) {
    // Wir kennen die Slug nicht direkt → Dashboard, das routet weiter
    redirectTo = "/";
  }

  return NextResponse.redirect(new URL(redirectTo, baseUrl));
}
