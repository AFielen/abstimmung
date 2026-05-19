/**
 * Retention-Job: läuft täglich, anonymisiert Beschluss-Daten älter als
 * RETENTION_YEARS (Standard 10).
 *
 * - Aktionen pro alter Beschluss:
 *   • eligible_voters.name_snapshot / email_snapshot → "anonymisiert"
 *   • votes.ip_hash / user_agent_hash → NULL
 *   • Idempotent via Marker im name_snapshot
 * - Globale Aufräumarbeiten:
 *   • magic_tokens älter als 30 Tage → gelöscht
 *   • audit_log älter als RETENTION_YEARS → gelöscht
 *
 * Aufruf: `tsx lib/cron/retention.ts`
 */
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agendaItems,
  auditLog,
  eligibleVoters,
  resolutions,
  votes,
} from "@/lib/db/schema";

const ANON_MARKER = "anonymisiert";

function retentionYears(): number {
  const raw = process.env.RETENTION_YEARS;
  const n = raw ? Number(raw) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
}

async function anonymizeResolution(resolutionId: string, tenantId: string) {
  // Sample-Check für Idempotenz
  const sample = (
    await db.select().from(eligibleVoters).where(eq(eligibleVoters.resolutionId, resolutionId)).limit(1)
  )[0];
  if (sample && sample.nameSnapshot === ANON_MARKER) {
    return false;
  }

  await db
    .update(eligibleVoters)
    .set({ nameSnapshot: ANON_MARKER, emailSnapshot: ANON_MARKER })
    .where(eq(eligibleVoters.resolutionId, resolutionId));

  const topRows = await db
    .select({ id: agendaItems.id })
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, resolutionId));
  const topIds = topRows.map((t) => t.id);
  if (topIds.length > 0) {
    await db
      .update(votes)
      .set({ ipHash: null, userAgentHash: null })
      .where(inArray(votes.agendaItemId, topIds));
  }

  await db.insert(auditLog).values({
    action: "retention.anonymized",
    tenantId,
    targetType: "resolution",
    targetId: resolutionId,
    payload: { years: retentionYears() },
  });

  return true;
}

async function main() {
  const years = retentionYears();
  const cutoff = new Date(Date.now() - years * 365.25 * 24 * 60 * 60 * 1000);
  console.log(
    `[retention] Cutoff: ${cutoff.toISOString()} (${years} Jahre Aufbewahrung)`,
  );

  // 1) Abgeschlossene Beschlüsse > cutoff → anonymisieren
  const oldResolutions = await db
    .select({ id: resolutions.id, tenantId: resolutions.tenantId })
    .from(resolutions)
    .where(
      and(
        isNotNull(resolutions.abgeschlossenAm),
        lt(resolutions.abgeschlossenAm, cutoff),
      ),
    );
  let anonymized = 0;
  for (const r of oldResolutions) {
    if (await anonymizeResolution(r.id, r.tenantId)) anonymized++;
  }
  console.log(`[retention] Beschlüsse anonymisiert: ${anonymized}/${oldResolutions.length}`);

  // 2) Magic-Tokens älter als 30 Tage löschen
  const tokenCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const tokenRes = await db.execute(
    sql`DELETE FROM magic_tokens WHERE expires_at < ${tokenCutoff}`,
  );
  const tokensDeleted = (tokenRes as unknown as { count?: number; rowCount?: number }).count
    ?? (tokenRes as unknown as { rowCount?: number }).rowCount
    ?? 0;
  console.log(`[retention] Magic-Tokens gelöscht: ${tokensDeleted}`);

  // 3) Audit-Log älter als cutoff löschen
  const auditRes = await db.execute(
    sql`DELETE FROM audit_log WHERE created_at < ${cutoff}`,
  );
  const auditDeleted = (auditRes as unknown as { count?: number; rowCount?: number }).count
    ?? (auditRes as unknown as { rowCount?: number }).rowCount
    ?? 0;
  console.log(`[retention] Audit-Einträge gelöscht: ${auditDeleted}`);

  console.log("[retention] Fertig.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[retention] Fehler:", err);
    process.exit(1);
  });
