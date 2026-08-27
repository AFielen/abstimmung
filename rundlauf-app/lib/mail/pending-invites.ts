import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { mapWithConcurrency } from "@/lib/concurrency";
import { db } from "@/lib/db";
import {
  agendaItems,
  eligibleVoters,
  resolutions,
  tenants,
} from "@/lib/db/schema";
import { sendResolutionInvite } from "@/lib/mail/templates";

// Mail-Versand + Marker-Update pro Verfahren; 5 gleichzeitig bleibt deutlich
// unter dem DB-Pool-Limit (max: 10) und ist fuer Mailjet unkritisch.
const MAIL_CONCURRENCY = 5;

/**
 * Versendet Beschluss-Einladungs-Mails an einen Nutzer für alle laufenden
 * Verfahren, in denen er als stimmberechtigt geführt ist und noch keine Mail
 * erhalten hat. Wird beim KV-Beitritt (Magic-Link `purpose=invite`) aufgerufen.
 *
 * Idempotent über `eligibleVoters.inviteEmailSentAt IS NULL`.
 */
export async function sendPendingResolutionInvites(opts: {
  tenantId: string;
  userId: string;
}): Promise<void> {
  const pending = await db
    .select({
      evId: eligibleVoters.id,
      resolutionId: resolutions.id,
      betreff: resolutions.betreff,
      fristEnde: resolutions.fristEnde,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      email: eligibleVoters.emailSnapshot,
      name: eligibleVoters.nameSnapshot,
    })
    .from(eligibleVoters)
    .innerJoin(resolutions, eq(resolutions.id, eligibleVoters.resolutionId))
    .innerJoin(tenants, eq(tenants.id, resolutions.tenantId))
    .where(
      and(
        eq(eligibleVoters.userId, opts.userId),
        eq(resolutions.tenantId, opts.tenantId),
        eq(resolutions.status, "laufend"),
        isNull(eligibleVoters.inviteEmailSentAt),
      ),
    );

  if (pending.length === 0) return;

  const topCounts = await db
    .select({
      resolutionId: agendaItems.resolutionId,
      c: count(),
    })
    .from(agendaItems)
    .where(
      inArray(
        agendaItems.resolutionId,
        pending.map((p) => p.resolutionId),
      ),
    )
    .groupBy(agendaItems.resolutionId);

  const topCountMap = new Map(
    topCounts.map((t) => [t.resolutionId, Number(t.c)]),
  );

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  await mapWithConcurrency(pending, MAIL_CONCURRENCY, async (p) => {
    const topCount = topCountMap.get(p.resolutionId);
    const subjectTitle =
      p.betreff ||
      `Umlaufverfahren mit ${topCount ?? "?"} Beschlussvorlage${
        topCount === 1 ? "" : "n"
      }`;
    try {
      await sendResolutionInvite({
        to: { email: p.email, name: p.name },
        tenantName: p.tenantName,
        resolutionTitle: subjectTitle,
        resolutionLink: `${baseUrl}/${p.tenantSlug}/beschluss/${p.resolutionId}`,
        fristEnde: p.fristEnde,
        topCount,
      });
      await db
        .update(eligibleVoters)
        .set({ inviteEmailSentAt: new Date() })
        .where(eq(eligibleVoters.id, p.evId));
      await logAudit({
        action: "resolution.invite_sent_on_join",
        tenantId: opts.tenantId,
        actorUserId: opts.userId,
        targetType: "resolution",
        targetId: p.resolutionId,
      });
    } catch (err) {
      console.error(
        "[pending-invites] send failed",
        p.resolutionId,
        err,
      );
      // inviteEmailSentAt bleibt NULL; manuelles Nachfassen nötig, da der
      // Status-Wechsel invited→active nur einmal stattfindet.
    }
  });
}
