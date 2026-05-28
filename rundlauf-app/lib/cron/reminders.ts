/**
 * Halbzeit-Erinnerung: läuft täglich. Erinnert Stimmberechtigte laufender
 * Verfahren, die nach der Hälfte der Laufzeit noch nicht vollständig
 * abgestimmt haben — genau einmal pro Verfahren (Marker
 * eligible_voters.reminder_email_sent_at, nur bei Erfolg gesetzt).
 *
 * - aktiv & unvollständig (Einladung vor Halbzeit) → Vote-Reminder
 * - eingeladen & nie beigetreten → erneute Einladung (frischer Magic-Link),
 *   KV-weit dedupliziert
 *
 * Aufruf: `tsx lib/cron/reminders.ts`
 */
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { createMagicToken } from "@/lib/auth/magic";
import { db } from "@/lib/db";
import {
  agendaItems,
  auditLog,
  eligibleVoters,
  memberships,
  resolutions,
  tenants,
  votes,
} from "@/lib/db/schema";
import { sendInviteReminder, sendVoteReminder } from "@/lib/mail/templates";
import { classifyVoter, isPastHalftime } from "@/lib/reminders";

const INVITE_TTL_MINUTES = 7 * 24 * 60;

type PendingInvite = {
  tenantId: string;
  userId: string;
  tenantName: string;
  email: string;
  name: string | null;
  evIds: string[];
};

async function main() {
  if (!process.env.APP_URL) {
    throw new Error("APP_URL muss gesetzt sein");
  }
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
    throw new Error("MAILJET_API_KEY und MAILJET_API_SECRET müssen gesetzt sein");
  }
  const now = new Date();
  const baseUrl = process.env.APP_URL.replace(/\/$/, "");

  const running = await db
    .select({
      id: resolutions.id,
      tenantId: resolutions.tenantId,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      betreff: resolutions.betreff,
      startedAt: resolutions.startedAt,
      fristEnde: resolutions.fristEnde,
    })
    .from(resolutions)
    .innerJoin(tenants, eq(tenants.id, resolutions.tenantId))
    .where(and(eq(resolutions.status, "laufend"), gt(resolutions.fristEnde, now)));

  let voteReminders = 0;
  let inviteReminders = 0;

  // invite_reminder pro (tenantId, userId) deduplizieren: eine frische
  // Einladungs-Mail, Marker aber für alle betroffenen eligible_voters-Zeilen.
  const pendingInvites = new Map<string, PendingInvite>();

  for (const r of running) {
    if (!r.startedAt) continue;
    if (!isPastHalftime(r.startedAt, r.fristEnde, now)) continue;
    const halftime = new Date(
      r.startedAt.getTime() + (r.fristEnde.getTime() - r.startedAt.getTime()) / 2,
    );

    const tops = await db
      .select({ id: agendaItems.id })
      .from(agendaItems)
      .where(eq(agendaItems.resolutionId, r.id));
    const topCount = tops.length;
    if (topCount === 0) continue;
    const topIds = tops.map((t) => t.id);

    const candidates = await db
      .select({
        evId: eligibleVoters.id,
        userId: eligibleVoters.userId,
        email: eligibleVoters.emailSnapshot,
        name: eligibleVoters.nameSnapshot,
        inviteEmailSentAt: eligibleVoters.inviteEmailSentAt,
        membershipStatus: memberships.status,
      })
      .from(eligibleVoters)
      .leftJoin(
        memberships,
        and(
          eq(memberships.tenantId, r.tenantId),
          eq(memberships.userId, eligibleVoters.userId),
        ),
      )
      .where(
        and(
          eq(eligibleVoters.resolutionId, r.id),
          isNull(eligibleVoters.reminderEmailSentAt),
        ),
      );
    if (candidates.length === 0) continue;

    const voteRows = await db
      .select({
        userId: votes.userId,
        c: sql<number>`count(distinct ${votes.agendaItemId})::int`,
      })
      .from(votes)
      .where(inArray(votes.agendaItemId, topIds))
      .groupBy(votes.userId);
    const voteCountMap = new Map(voteRows.map((v) => [v.userId, Number(v.c)]));

    const resolutionTitle =
      r.betreff ||
      `Umlaufverfahren mit ${topCount} Beschlussvorlage${topCount === 1 ? "" : "n"}`;
    const resolutionLink = `${baseUrl}/${r.tenantSlug}/beschluss/${r.id}`;

    for (const c of candidates) {
      const kind = classifyVoter({
        membershipStatus: c.membershipStatus ?? null,
        voteCount: voteCountMap.get(c.userId) ?? 0,
        topCount,
        inviteEmailSentAt: c.inviteEmailSentAt,
        halftime,
      });

      if (kind === "skip") continue;

      if (kind === "invite_reminder") {
        const key = `${r.tenantId}::${c.userId}`;
        const entry = pendingInvites.get(key);
        if (entry) {
          entry.evIds.push(c.evId);
        } else {
          pendingInvites.set(key, {
            tenantId: r.tenantId,
            userId: c.userId,
            tenantName: r.tenantName,
            email: c.email,
            name: c.name ?? null,
            evIds: [c.evId],
          });
        }
        continue;
      }

      // vote_reminder: verfahrensspezifisch, sofort senden
      try {
        await sendVoteReminder({
          to: { email: c.email, name: c.name },
          tenantName: r.tenantName,
          resolutionTitle,
          resolutionLink,
          fristEnde: r.fristEnde,
        });
        await db
          .update(eligibleVoters)
          .set({ reminderEmailSentAt: new Date() })
          .where(eq(eligibleVoters.id, c.evId));
        await db.insert(auditLog).values({
          action: "resolution.vote_reminder_sent",
          tenantId: r.tenantId,
          actorUserId: c.userId,
          targetType: "resolution",
          targetId: r.id,
        });
        voteReminders++;
      } catch (err) {
        console.error("[reminders] vote reminder failed", r.id, c.userId, err);
        // Marker bleibt NULL → nächster Tageslauf versucht erneut.
      }
    }
  }

  // invite_reminder dedupliziert versenden
  for (const info of pendingInvites.values()) {
    try {
      const { raw } = await createMagicToken({
        email: info.email,
        purpose: "invite",
        userId: info.userId,
        tenantId: info.tenantId,
        ttlMinutes: INVITE_TTL_MINUTES,
      });
      await sendInviteReminder({
        to: { email: info.email, name: info.name ?? undefined },
        tenantName: info.tenantName,
        rawToken: raw,
      });
      await db
        .update(eligibleVoters)
        .set({ reminderEmailSentAt: new Date() })
        .where(inArray(eligibleVoters.id, info.evIds));
      await db.insert(auditLog).values({
        action: "resolution.invite_reminder_sent",
        tenantId: info.tenantId,
        actorUserId: info.userId,
        targetType: "user",
        targetId: info.userId,
        payload: { resolutionCount: info.evIds.length },
      });
      inviteReminders++;
    } catch (err) {
      console.error("[reminders] invite reminder failed", info.userId, err);
    }
  }

  console.log(
    `[reminders] Vote-Reminder: ${voteReminders}, Invite-Reminder: ${inviteReminders}`,
  );
  console.log("[reminders] Fertig.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[reminders] Fehler:", err);
    process.exit(1);
  });
