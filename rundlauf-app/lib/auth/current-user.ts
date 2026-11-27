import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const found = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = found[0];
  if (!user) return null;
  // SUPERADMIN_EMAILS is the source of truth; the DB flag is only a login-time
  // snapshot. Deriving it here makes removal from the env effective at once
  // instead of after the next login (sessions live 30 days).
  return { ...user, isSuperadmin: isSuperadminEmail(user.email) };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireSuperadmin() {
  const user = await requireUser();
  if (!user.isSuperadmin) {
    redirect("/");
  }
  return user;
}

export function getSuperadminEmails(): string[] {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadminEmail(email: string): boolean {
  return getSuperadminEmails().includes(email.trim().toLowerCase());
}
