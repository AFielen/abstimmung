import { asc, eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { mapWithConcurrency } from "@/lib/concurrency";
import { db } from "@/lib/db";
import { agendaItems, eligibleVoters, resolutions, tenants } from "@/lib/db/schema";
import { sendResolutionResult } from "@/lib/mail/templates";
import type { ResolutionResult } from "@/lib/resolution";

const MAIL_CONCURRENCY = 5;

function outcomeLine(ordinal: number, titel: string, ergebnis: unknown): string {
  const r = ergebnis as ResolutionResult | null;
  if (!r) return `TOP ${ordinal} – ${titel}: kein Ergebnis`;
  const counts = r.perOption.map((o) => `${o.count} ${o.label}`).join(", ");
  const verdict = r.accepted
    ? "angenommen"
    : r.quorumReached
      ? "nicht angenommen (Mehrheit verfehlt)"
      : "nicht angenommen (Quorum verfehlt)";
  return `TOP ${ordinal} – ${titel}: ${verdict} (${counts})`;
}

/**
 * Informiert alle Stimmberechtigten über den Abschluss bzw. Rückzug eines
 * Verfahrens. Fehler einzelner Mails werden geloggt und brechen nichts ab;
 * der Aufrufer hat das Verfahren bereits finalisiert.
 */
export async function notifyResolutionResult(resolutionId: string): Promise<void> {
  const r = (
    await db.select().from(resolutions).where(eq(resolutions.id, resolutionId)).limit(1)
  )[0];
  if (!r || (r.status !== "abgeschlossen" && r.status !== "zurueckgezogen")) return;
  const tenant = (
    await db.select().from(tenants).where(eq(tenants.id, r.tenantId)).limit(1)
  )[0];
  if (!tenant) return;

  const tops = await db
    .select({ ordinal: agendaItems.ordinal, titel: agendaItems.titel, ergebnis: agendaItems.ergebnis })
    .from(agendaItems)
    .where(eq(agendaItems.resolutionId, r.id))
    .orderBy(asc(agendaItems.ordinal));
  const voters = await db
    .select({ email: eligibleVoters.emailSnapshot, name: eligibleVoters.nameSnapshot })
    .from(eligibleVoters)
    .where(eq(eligibleVoters.resolutionId, r.id));

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const link = `${baseUrl}/${tenant.slug}/beschluss/${r.id}`;
  const title = r.betreff?.trim() || `Umlaufverfahren mit ${tops.length} Beschlussvorlage${tops.length === 1 ? "" : "n"}`;
  const outcomes = tops.map((t) => outcomeLine(t.ordinal, t.titel, t.ergebnis));

  let sent = 0;
  const failed: string[] = [];
  await mapWithConcurrency(voters, MAIL_CONCURRENCY, async (v) => {
    try {
      await sendResolutionResult({
        to: { email: v.email, name: v.name || undefined },
        tenantName: tenant.name,
        resolutionTitle: title,
        resolutionLink: link,
        status: r.status as "abgeschlossen" | "zurueckgezogen",
        outcomes,
      });
      sent++;
    } catch (err) {
      failed.push(v.email);
      console.error("[result-mail] send failed", r.id, v.email, err);
    }
  });

  await logAudit({
    action: "resolution.result_mail",
    tenantId: r.tenantId,
    targetType: "resolution",
    targetId: r.id,
    payload: { sent, failed: failed.length, status: r.status },
  });
}
