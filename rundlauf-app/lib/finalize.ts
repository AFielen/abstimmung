import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agendaItems, eligibleVoters, resolutions, votes } from "@/lib/db/schema";
import { computeAgendaItemResult } from "@/lib/resolution";

/**
 * Berechnet Ergebnisse pro TOP, schreibt sie in agenda_items.ergebnis und
 * setzt resolutions.status = abgeschlossen. Läuft in einer Transaktion: Der
 * Statuswechsel ist ein bedingtes UPDATE (nur aus "laufend"), das die Zeile bis
 * zum Commit sperrt. Parallele submitVote()-Aufrufe halten FOR SHARE auf
 * derselben Zeile – sie sind entweder vor der Zählung committed oder sehen
 * danach "abgeschlossen". Ein zweiter Abschluss (Cron vs. Admin) bekommt
 * 0 Zeilen und tut nichts. Liefert true, wenn dieser Aufruf abgeschlossen hat.
 */
export async function finalizeResolution(resolutionId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const claimed = (
      await tx
        .update(resolutions)
        .set({ status: "abgeschlossen", abgeschlossenAm: new Date() })
        .where(and(eq(resolutions.id, resolutionId), eq(resolutions.status, "laufend")))
        .returning({ id: resolutions.id })
    )[0];
    if (!claimed) return false;

    const eligible = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(eligibleVoters)
      .where(eq(eligibleVoters.resolutionId, resolutionId));
    const eligibleCount = eligible[0]?.count ?? 0;

    const tops = await tx
      .select()
      .from(agendaItems)
      .where(eq(agendaItems.resolutionId, resolutionId));
    if (tops.length === 0) return true;

    const topIds = tops.map((t) => t.id);
    const rows = await tx
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
      await tx
        .update(agendaItems)
        .set({ ergebnis: result })
        .where(eq(agendaItems.id, top.id));
    }
    return true;
  });
}
