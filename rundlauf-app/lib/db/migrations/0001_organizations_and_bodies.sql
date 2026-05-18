CREATE TYPE "public"."organization_type" AS ENUM('verein', 'gmbh', 'ggmbh', 'gug', 'kdoer', 'sonstige');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "organization_type" DEFAULT 'verein' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizations_tenant_idx" ON "organizations" ("tenant_id");--> statement-breakpoint
CREATE TABLE "bodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"default_quorum_pct" integer DEFAULT 75 NOT NULL,
	"default_mehrheit" "resolution_majority" DEFAULT 'simple' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bodies" ADD CONSTRAINT "bodies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bodies" ADD CONSTRAINT "bodies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bodies_tenant_idx" ON "bodies" ("tenant_id");--> statement-breakpoint
CREATE INDEX "bodies_organization_idx" ON "bodies" ("organization_id");--> statement-breakpoint
ALTER TABLE "resolutions" ADD COLUMN "body_id" uuid;--> statement-breakpoint
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_body_id_bodies_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."bodies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resolutions_body_idx" ON "resolutions" ("body_id","created_at");
