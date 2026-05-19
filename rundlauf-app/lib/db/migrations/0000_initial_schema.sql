CREATE TYPE "public"."tenant_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."magic_token_purpose" AS ENUM('login', 'register', 'invite');--> statement-breakpoint
CREATE TYPE "public"."resolution_status" AS ENUM('draft', 'laufend', 'abgeschlossen', 'zurueckgezogen');--> statement-breakpoint
CREATE TYPE "public"."resolution_majority" AS ENUM('simple', 'two_thirds', 'three_quarters');--> statement-breakpoint
CREATE TYPE "public"."vote_change_mode" AS ENUM('aenderbar', 'fest');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"is_superadmin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" (lower("email"));--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "tenant_status" DEFAULT 'pending' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" ("status");--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_tenant_user_idx" ON "memberships" ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" ("user_id");--> statement-breakpoint
CREATE TABLE "magic_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "magic_token_purpose" NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"tenant_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "magic_tokens_hash_idx" ON "magic_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "magic_tokens_email_idx" ON "magic_tokens" ("email");--> statement-breakpoint
CREATE TABLE "resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"begruendung_md" text DEFAULT '' NOT NULL,
	"optionen" jsonb NOT NULL,
	"quorum_pct" integer DEFAULT 75 NOT NULL,
	"mehrheit" "resolution_majority" DEFAULT 'simple' NOT NULL,
	"vote_change_mode" "vote_change_mode" DEFAULT 'aenderbar' NOT NULL,
	"frist_ende" timestamp with time zone NOT NULL,
	"status" "resolution_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"abgeschlossen_am" timestamp with time zone,
	"ergebnis" jsonb
);
--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resolutions_tenant_status_idx" ON "resolutions" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "resolutions_frist_ende_idx" ON "resolutions" ("frist_ende");--> statement-breakpoint
CREATE TABLE "eligible_voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resolution_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name_snapshot" text NOT NULL,
	"email_snapshot" text NOT NULL,
	"role_snapshot" "membership_role" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eligible_voters" ADD CONSTRAINT "eligible_voters_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligible_voters" ADD CONSTRAINT "eligible_voters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eligible_voters_resolution_user_idx" ON "eligible_voters" ("resolution_id","user_id");--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resolution_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_id" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_resolution_user_idx" ON "votes" ("resolution_id","user_id");--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"payload" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "audit_log" ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" ("actor_user_id","created_at");
