import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agendaItems, eligibleVoters, resolutions, votes } from "@/lib/db/schema";
import { computeAgendaItemResult } from "@/lib/resolution";

/**
 * Berechnet Ergebnisse pro TOP, schreibt sie in agenda_items.ergebnis und
 * setzt resolutions.status = abgeschlossen. Idempotent – ein zweiter Aufruf
 * für denselben Beschluss ist ein No-Op, weil status nicht mehr "laufend" ist
 * (Aufrufer müssen das prüfen, oder akzeptieren dass abgeschlossenAm
 * überschrieben wird).
 */
export async function finalizeResolution(resolutionId: string) {
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, resolutionId)).limit(1)
  )[0];
  if (!r) return;

  const eligible = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eligibleVoters)
    .where(eq(eligibleVoters.resolutionId, r.id));
  const eligibleCount = eligible[0]?.count ?? 0;

  const tops = await db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, r.id));
  if (tops.length === 0) {
    await db
      .update(resolutions)
      .set({ status: "abgeschlossen", abgeschlossenAm: new Date() })
      .where(eq(resolutions.id, r.id));
    return;
  }

  const topIds = tops.map((t) => t.id);
  const rows = await db
    .select({
      agendaItemId: votes.agendaItemId,
      optionId: votes.optionId,
      c: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(inArray(votes.agendaItemId, topIds))
    .groupBy(votes.agendaItemId, votes.optionId);

  const byTop = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!byTop.has(row.agendaItemId)) byTop.set(row.agendaItemId, {});
    byTop.get(row.agendaItemId)![row.optionId] = row.c;
  }

  for (const top of tops) {
    const counts = byTop.get(top.id) ?? {};
    const result = computeAgendaItemResult({
      agendaItem: top,
      eligibleCount,
      voteCounts: counts,
    });
    await db
      .update(agendaItems)
      .set({ ergebnis: result })
      .where(eq(agendaItems.id, top.id));
  }

  await db
    .update(resolutions)
    .set({ status: "abgeschlossen", abgeschlossenAm: new Date() })
    .where(eq(resolutions.id, r.id));
}
