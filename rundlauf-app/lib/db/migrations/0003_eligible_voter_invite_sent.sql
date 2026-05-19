ALTER TABLE "eligible_voters" ADD COLUMN "invite_email_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "eligible_voters_pending_idx" ON "eligible_voters" USING btree ("user_id","invite_email_sent_at");
--> statement-breakpoint
-- Backfill: bestehende Einträge gelten als "Mail bereits versandt", damit der
-- Beitritt-Hook nicht rückwirkend für altgediente Verfahren feuert.
UPDATE "eligible_voters" SET "invite_email_sent_at" = NOW() WHERE "invite_email_sent_at" IS NULL;
