import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Custom Type: bytea ───────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

// ─── Enums ────────────────────────────────────────────────────────────────

export const tenantStatusEnum = pgEnum("tenant_status", [
  "pending",
  "active",
  "suspended",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "removed",
]);

export const magicTokenPurposeEnum = pgEnum("magic_token_purpose", [
  "login",
  "register",
  "invite",
]);

export const resolutionStatusEnum = pgEnum("resolution_status", [
  "draft",
  "laufend",
  "abgeschlossen",
  "zurueckgezogen",
]);

export const resolutionMajorityEnum = pgEnum("resolution_majority", [
  "simple",
  "two_thirds",
  "three_quarters",
]);

export const voteChangeModeEnum = pgEnum("vote_change_mode", [
  "aenderbar",
  "fest",
]);

export const organizationTypeEnum = pgEnum("organization_type", [
  "verein",
  "gmbh",
  "ggmbh",
  "gug",
  "kdoer",
  "sonstige",
]);

// ─── Users ────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    isSuperadmin: boolean("is_superadmin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
  ],
);

// ─── Tenants (Kreisverbände) ──────────────────────────────────────────────

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: tenantStatusEnum("status").notNull().default("pending"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
  },
  (t) => [
    uniqueIndex("tenants_slug_idx").on(t.slug),
    index("tenants_status_idx").on(t.status),
  ],
);

// ─── Memberships ──────────────────────────────────────────────────────────

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("member"),
    status: membershipStatusEnum("status").notNull().default("invited"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("memberships_tenant_user_idx").on(t.tenantId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

// ─── Organisationen (Mutter-KV + Töchter) ─────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: organizationTypeEnum("type").notNull().default("verein"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("organizations_tenant_idx").on(t.tenantId)],
);

// ─── Gremien (Präsidium, Aufsichtsrat, …) ─────────────────────────────────

export const bodies = pgTable(
  "bodies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    /** Standard-Quorum/Mehrheit als Vorbelegung beim Beschluss-Anlegen */
    defaultQuorumPct: integer("default_quorum_pct").notNull().default(75),
    defaultMehrheit: resolutionMajorityEnum("default_mehrheit").notNull().default("simple"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("bodies_tenant_idx").on(t.tenantId),
    index("bodies_organization_idx").on(t.organizationId),
  ],
);

// ─── Magic-Link Tokens ────────────────────────────────────────────────────

export const magicTokens = pgTable(
  "magic_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    purpose: magicTokenPurposeEnum("purpose").notNull(),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("magic_tokens_hash_idx").on(t.tokenHash),
    index("magic_tokens_email_idx").on(t.email),
  ],
);

// ─── Resolutions (Umlaufverfahren-Container) ──────────────────────────────
// Container für 1..n TOPs (agenda_items). Inhaltliche Felder (Titel, Optionen,
// Quorum, Mehrheit, Ergebnis) liegen pro TOP in agenda_items.

export const resolutions = pgTable(
  "resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    bodyId: uuid("body_id").references(() => bodies.id, { onDelete: "restrict" }),
    /** Optionaler übergreifender Betreff, z.B. "Beschlussvorlagen LV April 2026" */
    betreff: text("betreff").notNull().default(""),
    /** Versionsnummer (LV-Vorlage: "Version 1"). */
    version: integer("version").notNull().default(1),
    voteChangeMode: voteChangeModeEnum("vote_change_mode").notNull().default("aenderbar"),
    fristEnde: timestamp("frist_ende", { withTimezone: true }).notNull(),
    status: resolutionStatusEnum("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    abgeschlossenAm: timestamp("abgeschlossen_am", { withTimezone: true }),
  },
  (t) => [
    index("resolutions_tenant_status_idx").on(t.tenantId, t.status),
    index("resolutions_body_idx").on(t.bodyId, t.createdAt),
    index("resolutions_frist_ende_idx").on(t.fristEnde),
  ],
);

// ─── Agenda Items (TOPs eines Umlaufverfahrens) ───────────────────────────

export const agendaItems = pgTable(
  "agenda_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    /** "TOP 1", "TOP 2" — bestimmt Anzeige-Reihenfolge */
    ordinal: integer("ordinal").notNull(),
    titel: text("titel").notNull(),
    /** Hauptfeld: konkreter Beschlussvorschlag */
    beschlussvorschlagMd: text("beschlussvorschlag_md").notNull().default(""),
    /** Optional: Sachlage / Erläuterung */
    sachlageMd: text("sachlage_md"),
    /** Optional: Finanzielle Auswirkungen */
    finanzielleAuswirkungen: text("finanzielle_auswirkungen"),
    /** Optional: Auskunft erteilt durch (Namen, Funktionen) */
    auskunftErteilen: text("auskunft_erteilen"),
    /** Format: { id: string, label: string, isAbstain?: boolean }[] */
    optionen: jsonb("optionen").notNull(),
    quorumPct: integer("quorum_pct").notNull().default(75),
    mehrheit: resolutionMajorityEnum("mehrheit").notNull().default("simple"),
    /** Snapshot des Ergebnisses nach Abschluss */
    ergebnis: jsonb("ergebnis"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agenda_items_resolution_idx").on(t.resolutionId, t.ordinal),
    uniqueIndex("agenda_items_resolution_ordinal_idx").on(t.resolutionId, t.ordinal),
  ],
);

// ─── Stimmberechtigte (Snapshot, gilt für alle TOPs eines Umlaufs) ────────

export const eligibleVoters = pgTable(
  "eligible_voters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    nameSnapshot: text("name_snapshot").notNull(),
    emailSnapshot: text("email_snapshot").notNull(),
    roleSnapshot: membershipRoleEnum("role_snapshot").notNull(),
    /**
     * Zeitpunkt, an dem die Beschluss-Einladungs-Mail an dieses Mitglied
     * versendet wurde. NULL, solange die Membership zum Eröffnungszeitpunkt
     * noch im Status "invited" war — der Versand erfolgt dann beim Beitritt.
     */
    inviteEmailSentAt: timestamp("invite_email_sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("eligible_voters_resolution_user_idx").on(t.resolutionId, t.userId),
    index("eligible_voters_pending_idx").on(t.userId, t.inviteEmailSentAt),
  ],
);

// ─── Votes (pro TOP) ──────────────────────────────────────────────────────

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agendaItemId: uuid("agenda_item_id")
      .notNull()
      .references(() => agendaItems.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Verweist auf optionen[].id im agenda_items-Eintrag. */
    optionId: text("option_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
  },
  (t) => [
    uniqueIndex("votes_agenda_user_idx").on(t.agendaItemId, t.userId),
  ],
);

// ─── Attachments (PDF-Anlagen, in bytea gespeichert) ──────────────────────

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    /** Wenn null: Anlage betrifft den gesamten Umlauf, sonst einen TOP. */
    agendaItemId: uuid("agenda_item_id").references(() => agendaItems.id, {
      onDelete: "cascade",
    }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    data: bytea("data").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attachments_resolution_idx").on(t.resolutionId),
    index("attachments_agenda_item_idx").on(t.agendaItemId),
  ],
);

// ─── Audit Log ────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    payload: jsonb("payload"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_tenant_idx").on(t.tenantId, t.createdAt),
    index("audit_log_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);

// ─── Typed exports ────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Resolution = typeof resolutions.$inferSelect;
export type AgendaItem = typeof agendaItems.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Body = typeof bodies.$inferSelect;
