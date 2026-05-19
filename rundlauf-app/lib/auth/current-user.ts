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
  return found[0] ?? null;
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
