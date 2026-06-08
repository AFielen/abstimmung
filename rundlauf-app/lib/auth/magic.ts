import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { magicTokens } from "@/lib/db/schema";

const TOKEN_BYTES = 32;
const DEFAULT_TTL_MINUTES = 60;

export type TokenPurpose = "login" | "register" | "invite";

export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createMagicToken(opts: {
  email: string;
  purpose: TokenPurpose;
  userId?: string;
  tenantId?: string;
  ttlMinutes?: number;
}): Promise<{ raw: string; expiresAt: Date }> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const ttl = (opts.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);

  await db.insert(magicTokens).values({
    tokenHash,
    purpose: opts.purpose,
    email: opts.email.trim().toLowerCase(),
    userId: opts.userId,
    tenantId: opts.tenantId,
    expiresAt,
  });

  return { raw, expiresAt };
}

export async function consumeMagicToken(raw: string) {
  const tokenHash = hashToken(raw);
  const now = new Date();

  // Atomar verbrauchen: das Token wird nur konsumiert, wenn es noch nicht
  // eingelöst und nicht abgelaufen ist. Ein bedingtes UPDATE ... RETURNING
  // schließt die Race Condition, die ein getrenntes SELECT + UPDATE offen ließe
  // (zwei parallele Einlösungen desselben Tokens).
  const consumed = await db
    .update(magicTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(magicTokens.tokenHash, tokenHash),
        isNull(magicTokens.consumedAt),
        gt(magicTokens.expiresAt, now),
      ),
    )
    .returning();

  return consumed[0] ?? null;
}

