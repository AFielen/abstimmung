"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createMagicToken } from "@/lib/auth/magic";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { parseMembersFile } from "@/lib/import/parse-members";
import { sendInviteLink } from "@/lib/mail/templates";
import { requireAdmin, type TenantContext } from "@/lib/tenant";

// ─── Shared helper ────────────────────────────────────────────────────────

type InviteOutcome =
  | { kind: "created" }
  | { kind: "resent" }
  | { kind: "already_active" };

async function inviteUserToTenant(opts: {
  ctx: TenantContext;
  email: string; // already normalized (lower, trimmed)
  name?: string;
  role: "admin" | "member";
  source: "form" | "import";
}): Promise<InviteOutcome> {
  const { ctx, email, name, role, source } = opts;

  let user = (
    await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1)
  )[0];

  if (!user) {
    user = (
      await db.insert(users).values({ email, name }).returning()
    )[0];
  } else if (name && !user.name) {
    await db.update(users).set({ name }).where(eq(users.id, user.id));
    user = { ...user, name };
  }

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
    return { kind: "already_active" };
  }

  const isResend = Boolean(existing);
  if (existing) {
    await db
      .update(memberships)
      .set({ status: "invited", role, invitedAt: new Date(), removedAt: null })
      .where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({
      tenantId: ctx.tenant.id,
      userId: user.id,
      role,
      status: "invited",
      invitedByUserId: ctx.user.id,
    });
  }

  const { raw } = await createMagicToken({
    email,
    purpose: "invite",
    userId: user.id,
    tenantId: ctx.tenant.id,
    ttlMinutes: 7 * 24 * 60,
  });

  await sendInviteLink({
    to: { email, name: user.name ?? undefined },
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
    payload: { email, role, source, resend: isResend },
  });

  return { kind: isResend ? "resent" : "created" };
}

// ─── Single invite ────────────────────────────────────────────────────────

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

  const outcome = await inviteUserToTenant({
    ctx,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    source: "form",
  });

  if (outcome.kind === "already_active") {
    return { ok: false, message: "Diese Person ist bereits Mitglied" };
  }

  revalidatePath(`/${parsed.data.kv}/mitglieder`);
  return {
    ok: true,
    message:
      outcome.kind === "resent"
        ? `Einladung an ${parsed.data.email} erneut versendet`
        : `Einladung an ${parsed.data.email} versendet`,
  };
}

// ─── Remove + Change role (unchanged) ─────────────────────────────────────

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

// ─── Bulk import: preview + confirm ───────────────────────────────────────

const MAX_IMPORT_ROWS = 500;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImportStatus =
  | "new"
  | "resend"
  | "already_active"
  | "invalid_email"
  | "duplicate_in_file"
  | "self";

export type ImportPreviewRow = {
  email: string;
  name?: string;
  role: "admin" | "member";
  status: ImportStatus;
  message?: string;
};

export type ImportPreviewResult =
  | { ok: true; rows: ImportPreviewRow[]; totalRead: number }
  | { ok: false; message: string };

const ROLE_ALIASES_ADMIN = new Set([
  "admin",
  "administrator",
  "administratorin",
  "admins",
]);

function normalizeRole(input: string | undefined): "admin" | "member" {
  if (!input) return "member";
  const n = input.toLowerCase().trim();
  if (ROLE_ALIASES_ADMIN.has(n)) return "admin";
  return "member";
}

export async function previewMemberImport(
  kv: string,
  formData: FormData,
): Promise<ImportPreviewResult> {
  const ctx = await requireAdmin(kv);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Keine Datei ausgewählt" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "Datei zu groß (max. 2 MB)" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let raw;
  try {
    raw = await parseMembersFile(buffer, file.name);
  } catch (err) {
    console.error("[import] parse failed", err);
    return { ok: false, message: "Datei konnte nicht gelesen werden. Bitte als CSV oder XLSX speichern." };
  }

  if (raw.length === 0) {
    return { ok: false, message: "Keine Datenzeilen gefunden. Erwartet werden Spalten 'E-Mail' und 'Name'." };
  }
  if (raw.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      message: `Maximal ${MAX_IMPORT_ROWS} Zeilen erlaubt (${raw.length} gefunden).`,
    };
  }

  // Load existing memberships in this tenant once.
  const existingRaw = await db
    .select({ email: users.email, status: memberships.status })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, ctx.tenant.id));

  const existingByEmail = new Map<string, "active" | "invited" | "removed">();
  for (const e of existingRaw) {
    existingByEmail.set(e.email.toLowerCase(), e.status);
  }

  const emailSchema = z.string().email();
  const ownEmail = ctx.user.email.toLowerCase();
  const seenInFile = new Set<string>();
  const rows: ImportPreviewRow[] = [];

  for (const r of raw) {
    const email = r.email.trim().toLowerCase();
    const name = r.name?.slice(0, 120);
    const role = normalizeRole(r.role);
    const base = { email, name, role } as const;

    if (!emailSchema.safeParse(email).success) {
      rows.push({ ...base, status: "invalid_email", message: "Ungültige E-Mail-Adresse" });
      continue;
    }
    if (email === ownEmail) {
      rows.push({ ...base, status: "self", message: "Du selbst – wird übersprungen" });
      continue;
    }
    if (seenInFile.has(email)) {
      rows.push({ ...base, status: "duplicate_in_file", message: "Doppelt in Datei" });
      continue;
    }
    seenInFile.add(email);

    const ex = existingByEmail.get(email);
    if (ex === "active") {
      rows.push({ ...base, status: "already_active", message: "Bereits aktives Mitglied" });
    } else if (ex === "invited") {
      rows.push({ ...base, status: "resend", message: "Bereits eingeladen – Einladung erneut senden" });
    } else {
      rows.push({ ...base, status: "new" });
    }
  }

  return { ok: true, rows, totalRead: raw.length };
}

const confirmRowSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  role: z.enum(["admin", "member"]),
});

export type ImportRunResult = {
  ok: boolean;
  message?: string;
  created: number;
  resent: number;
  alreadyActive: number;
  failed: { email: string; message: string }[];
};

export async function confirmMemberImport(
  kv: string,
  rows: { email: string; name?: string; role: "admin" | "member" }[],
): Promise<ImportRunResult> {
  const ctx = await requireAdmin(kv);

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      message: "Keine Zeilen zum Import",
      created: 0,
      resent: 0,
      alreadyActive: 0,
      failed: [],
    };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      message: `Maximal ${MAX_IMPORT_ROWS} Zeilen erlaubt`,
      created: 0,
      resent: 0,
      alreadyActive: 0,
      failed: [],
    };
  }

  let created = 0;
  let resent = 0;
  let alreadyActive = 0;
  const failed: { email: string; message: string }[] = [];

  const ownEmail = ctx.user.email.toLowerCase();
  const seen = new Set<string>();

  for (const row of rows) {
    const parsed = confirmRowSchema.safeParse({
      email: typeof row?.email === "string" ? row.email.trim().toLowerCase() : "",
      name: row?.name,
      role: row?.role,
    });
    if (!parsed.success) {
      failed.push({
        email: typeof row?.email === "string" ? row.email : "(unbekannt)",
        message: "Ungültige Daten",
      });
      continue;
    }
    const email = parsed.data.email;
    if (email === ownEmail) {
      failed.push({ email, message: "Eigene E-Mail nicht möglich" });
      continue;
    }
    if (seen.has(email)) continue; // ignore duplicates silently in confirm step
    seen.add(email);

    try {
      const outcome = await inviteUserToTenant({
        ctx,
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        source: "import",
      });
      if (outcome.kind === "created") created++;
      else if (outcome.kind === "resent") resent++;
      else if (outcome.kind === "already_active") alreadyActive++;
    } catch (err) {
      console.error("[import] invite failed", email, err);
      failed.push({ email, message: "Fehler beim Versenden" });
    }
  }

  await logAudit({
    action: "membership.import_completed",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    payload: {
      requested: rows.length,
      created,
      resent,
      alreadyActive,
      failed: failed.length,
    },
  });

  revalidatePath(`/${kv}/mitglieder`);
  return { ok: true, created, resent, alreadyActive, failed };
}
