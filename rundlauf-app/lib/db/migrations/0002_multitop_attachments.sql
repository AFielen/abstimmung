-- Multi-TOP-Umlaufverfahren + PDF-Anlagen
--
-- Diese Migration baut "resolutions" zu einem Container um, der 1..n
-- "agenda_items" (TOPs) enthält. Stimmen werden pro TOP abgegeben. PDF-Anlagen
-- werden als bytea direkt in Postgres gespeichert.

-- 1) agenda_items anlegen
CREATE TABLE "agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resolution_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"titel" text NOT NULL,
	"beschlussvorschlag_md" text DEFAULT '' NOT NULL,
	"sachlage_md" text,
	"finanzielle_auswirkungen" text,
	"auskunft_erteilen" text,
	"optionen" jsonb NOT NULL,
	"quorum_pct" integer DEFAULT 75 NOT NULL,
	"mehrheit" "resolution_majority" DEFAULT 'simple' NOT NULL,
	"ergebnis" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agenda_items_resolution_idx" ON "agenda_items" ("resolution_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_items_resolution_ordinal_idx" ON "agenda_items" ("resolution_id","ordinal");--> statement-breakpoint

-- 2) attachments anlegen
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resolution_id" uuid NOT NULL,
	"agenda_item_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"data" bytea NOT NULL,
	"uploaded_by_user_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_resolution_idx" ON "attachments" ("resolution_id");--> statement-breakpoint
CREATE INDEX "attachments_agenda_item_idx" ON "attachments" ("agenda_item_id");--> statement-breakpoint

-- 3) votes umstellen auf agenda_item_id
DROP INDEX IF EXISTS "votes_resolution_user_idx";--> statement-breakpoint
ALTER TABLE "votes" DROP CONSTRAINT IF EXISTS "votes_resolution_id_resolutions_id_fk";--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN IF EXISTS "resolution_id";--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "agenda_item_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_agenda_user_idx" ON "votes" ("agenda_item_id","user_id");--> statement-breakpoint

-- 4) resolutions verschlanken: inhaltliche Felder wandern nach agenda_items
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "titel";--> statement-breakpoint
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "begruendung_md";--> statement-breakpoint
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "optionen";--> statement-breakpoint
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "quorum_pct";--> statement-breakpoint
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "mehrheit";--> statement-breakpoint
ALTER TABLE "resolutions" DROP COLUMN IF EXISTS "ergebnis";--> statement-breakpoint
ALTER TABLE "resolutions" ADD COLUMN "betreff" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "resolutions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
