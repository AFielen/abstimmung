import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

async function getIpHash(): Promise<string | undefined> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      undefined;
    if (!ip) return undefined;
    return createHash("sha256").update(ip).digest("hex").slice(0, 32);
  } catch {
    return undefined;
  }
}

export async function logAudit(opts: {
  action: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}) {
  const ipHash = await getIpHash();
  await db.insert(auditLog).values({
    action: opts.action,
    tenantId: opts.tenantId ?? null,
    actorUserId: opts.actorUserId ?? null,
    targetType: opts.targetType,
    targetId: opts.targetId,
    payload: opts.payload ?? null,
    ipHash,
  });
}
