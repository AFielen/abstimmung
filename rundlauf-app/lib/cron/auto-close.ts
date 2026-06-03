/**
 * Auto-Close: läuft stündlich. Findet alle Beschlüsse mit status='laufend'
 * und abgelaufener Frist (fristEnde <= now) und finalisiert sie über
 * finalizeResolution(): pro TOP wird das Ergebnis berechnet und persistiert,
 * status wird auf 'abgeschlossen' gesetzt, abgeschlossenAm auf jetzt.
 *
 * Idempotent: einmal finalisierte Beschlüsse haben status='abgeschlossen'
 * und werden vom Filter ausgeschlossen.
 *
 * Aufruf: `tsx lib/cron/auto-close.ts`
 */
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, resolutions } from "@/lib/db/schema";
import { finalizeResolution } from "@/lib/finalize";

async function main() {
  const now = new Date();

  const expired = await db
    .select({
      id: resolutions.id,
      tenantId: resolutions.tenantId,
      betreff: resolutions.betreff,
      fristEnde: resolutions.fristEnde,
    })
    .from(resolutions)
    .where(and(eq(resolutions.status, "laufend"), lte(resolutions.fristEnde, now)));

  let closed = 0;
  for (const r of expired) {
    try {
      await finalizeResolution(r.id);
      await db.insert(auditLog).values({
        action: "resolution.auto_closed",
        tenantId: r.tenantId,
        actorUserId: null,
        targetType: "resolution",
        targetId: r.id,
        payload: { fristEnde: r.fristEnde.toISOString() },
      });
      closed++;
      console.log(`[auto-close] closed ${r.id} (${r.betreff ?? "ohne Betreff"})`);
    } catch (err) {
      console.error("[auto-close] failed", r.id, err);
    }
  }

  console.log(`[auto-close] Fällig: ${expired.length}, geschlossen: ${closed}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[auto-close] Fehler:", err);
    process.exit(1);
  });
