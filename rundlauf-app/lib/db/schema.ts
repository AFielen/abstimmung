import { sql } from "drizzle-orm";
import {
  boolean,
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

// ─── Resolutions (Umlaufbeschlüsse) ───────────────────────────────────────

export const resolutions = pgTable(
  "resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    titel: text("titel").notNull(),
    begruendungMd: text("begruendung_md").notNull().default(""),
    /** Format: { id: string, label: string }[] */
    optionen: jsonb("optionen").notNull(),
    quorumPct: integer("quorum_pct").notNull().default(75),
    mehrheit: resolutionMajorityEnum("mehrheit").notNull().default("simple"),
    voteChangeMode: voteChangeModeEnum("vote_change_mode").notNull().default("aenderbar"),
    fristEnde: timestamp("frist_ende", { withTimezone: true }).notNull(),
    status: resolutionStatusEnum("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    abgeschlossenAm: timestamp("abgeschlossen_am", { withTimezone: true }),
    /** Cached result snapshot: { quorum_erreicht, mehrheit_erreicht, gewinner, stimmen_pro_option, ... } */
    ergebnis: jsonb("ergebnis"),
  },
  (t) => [
    index("resolutions_tenant_status_idx").on(t.tenantId, t.status),
    index("resolutions_frist_ende_idx").on(t.fristEnde),
  ],
);

// ─── Stimmberechtigte (Snapshot zum Erstellzeitpunkt) ─────────────────────

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
  },
  (t) => [
    uniqueIndex("eligible_voters_resolution_user_idx").on(t.resolutionId, t.userId),
  ],
);

// ─── Votes ────────────────────────────────────────────────────────────────

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Verweist auf optionen[].id im resolutions-Eintrag. */
    optionId: text("option_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
  },
  (t) => [
    uniqueIndex("votes_resolution_user_idx").on(t.resolutionId, t.userId),
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
export type Vote = typeof votes.$inferSelect;
