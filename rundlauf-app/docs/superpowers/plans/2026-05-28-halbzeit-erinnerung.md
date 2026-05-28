# Halbzeit-Erinnerung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach der Hälfte der Laufzeit eines laufenden Umlaufverfahrens werden Stimmberechtigte, die noch nicht vollständig abgestimmt haben, einmalig per E-Mail erinnert — aktive Mitglieder mit einem Vote-Reminder, noch nicht beigetretene Mitglieder mit einer erneuten Einladung (frischer Magic-Link).

**Architecture:** Ein täglicher Cron-Job (`lib/cron/reminders.ts`) in einem eigenen Compose-Container `rundlauf-reminders` (Spiegel von `rundlauf-retention`, zusätzlich mit Mail-Env). Die Datums-/Einstufungslogik ist als pure, testbare Funktionen in `lib/reminders.ts` isoliert. Idempotenz über die neue Spalte `eligible_voters.reminder_email_sent_at` (Marker nur bei erfolgreichem Versand).

**Tech Stack:** Next.js 16, Drizzle ORM (postgres-js), Postgres 16, tsx (für Cron + Migrationen), Mailjet (HTTP), `node:assert`/`node:test` via tsx für pure-Logic-Tests (keine neue Dependency).

**Spec:** `docs/superpowers/specs/2026-05-28-halbzeit-erinnerung-design.md`

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `rundlauf-app/lib/db/schema.ts` | Spalte `reminderEmailSentAt` in `eligibleVoters` |
| `rundlauf-app/lib/db/migrations/0004_*.sql` (+ `meta/*`) | generierte Migration (ADD COLUMN, kein Backfill) |
| `rundlauf-app/lib/reminders.ts` (neu) | pure Logik: `isPastHalftime`, `classifyVoter` |
| `rundlauf-app/lib/reminders.test.ts` (neu) | Assertion-Tests der puren Logik (via tsx) |
| `rundlauf-app/lib/mail/templates.ts` | `sendVoteReminder`, `sendInviteReminder` |
| `rundlauf-app/lib/cron/reminders.ts` (neu) | Orchestrierung: Query → Einstufung → Versand → Marker → Audit |
| `docker-compose.yml` (abstimmung-Repo-Root) | Container `rundlauf-reminders` |

**Hinweis zum Arbeitsverzeichnis:** Alle `npm`-Kommandos laufen in `rundlauf-app/`. Die `docker-compose.yml` liegt im Repo-Root `/root/abstimmung/`. Branch: `feat/rundlauf-halbzeit-erinnerung` (bereits angelegt, enthält die Spec-Commits).

---

### Task 1: Schema-Spalte + Migration

**Files:**
- Modify: `rundlauf-app/lib/db/schema.ts` (eligibleVoters, nach `inviteEmailSentAt`)
- Create: `rundlauf-app/lib/db/migrations/0004_*.sql` (generiert)
- Modify: `rundlauf-app/lib/db/migrations/meta/_journal.json` + neuer Snapshot (generiert)

- [ ] **Step 1: Spalte ins Drizzle-Schema eintragen**

In `rundlauf-app/lib/db/schema.ts`, im `eligibleVoters`-Block direkt nach dem `inviteEmailSentAt`-Feld einfügen:

```ts
    inviteEmailSentAt: timestamp("invite_email_sent_at", { withTimezone: true }),
    /**
     * Zeitpunkt der Halbzeit-Erinnerung. NULL = noch nicht erinnert. Marker
     * wird nur bei erfolgreichem Mailversand gesetzt (transiente Fehler werden
     * am Folgetag erneut versucht). Kein Backfill: bereits laufende Verfahren
     * über Halbzeit werden beim ersten Cron-Lauf einmalig erinnert.
     */
    reminderEmailSentAt: timestamp("reminder_email_sent_at", { withTimezone: true }),
```

- [ ] **Step 2: Migration generieren**

Run (in `rundlauf-app/`): `npm run db:generate`
Expected: Eine neue Datei `lib/db/migrations/0004_<zufallsname>.sql` wird erzeugt, `meta/_journal.json` bekommt einen vierten Eintrag (`idx: 4`), ein neuer `meta/0004_snapshot.json` entsteht. Konsole zeigt u. a. `1 columns added`.

- [ ] **Step 3: Generierte SQL prüfen**

Run: `cat lib/db/migrations/0004_*.sql`
Expected (genau dieser Inhalt, ohne `UPDATE`/Backfill):

```sql
ALTER TABLE "eligible_voters" ADD COLUMN "reminder_email_sent_at" timestamp with time zone;
```

Falls drizzle-kit zusätzlich versucht, etwas anderes zu ändern (z. B. einen Index zu droppen): **stop** — Schema-Drift, vor dem Fortfahren klären.

- [ ] **Step 4: Migration lokal anwenden (gegen Dev-DB)**

Voraussetzung: lokale Postgres erreichbar (z. B. `docker compose up -d rundlauf-db` im Repo-Root, dann Port-Forward, oder eine lokale Instanz). `DATABASE_URL` muss gesetzt sein; Default in `drizzle.config.ts`/`migrate.ts` ist `postgres://rundlauf:rundlauf@localhost:5432/rundlauf`.

Run (in `rundlauf-app/`): `npm run db:migrate`
Expected: `[migrate] Wende Migrationen aus … an …` gefolgt von `[migrate] Fertig.`

- [ ] **Step 5: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/db/schema.ts rundlauf-app/lib/db/migrations/
git commit -m "$(cat <<'EOF'
feat(rundlauf): Spalte reminder_email_sent_at für Halbzeit-Erinnerung

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pure Logik + Tests (TDD)

**Files:**
- Create: `rundlauf-app/lib/reminders.ts`
- Test: `rundlauf-app/lib/reminders.test.ts`

- [ ] **Step 1: Failing test schreiben**

Create `rundlauf-app/lib/reminders.test.ts`:

```ts
import assert from "node:assert/strict";
import { classifyVoter, isPastHalftime } from "./reminders";

// ── isPastHalftime ────────────────────────────────────────────────────────
{
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-15T00:00:00Z"); // 14 Tage Laufzeit
  const halftime = new Date("2026-01-08T00:00:00Z");

  assert.equal(isPastHalftime(start, end, new Date("2026-01-07T23:59:00Z")), false);
  assert.equal(isPastHalftime(start, end, halftime), true);
  assert.equal(isPastHalftime(start, end, new Date("2026-01-10T00:00:00Z")), true);
  assert.equal(isPastHalftime(null, end, halftime), false); // kein startedAt
  assert.equal(isPastHalftime(end, start, halftime), false); // entartet: end <= start
}

// ── classifyVoter ─────────────────────────────────────────────────────────
const halftime = new Date("2026-01-08T00:00:00Z");
const beforeHalf = new Date("2026-01-05T00:00:00Z");
const afterHalf = new Date("2026-01-10T00:00:00Z");

// removed / kein Membership → skip
assert.equal(
  classifyVoter({ membershipStatus: "removed", voteCount: 0, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);
assert.equal(
  classifyVoter({ membershipStatus: null, voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "skip",
);
// vollständig abgestimmt → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 2, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);
// eingeladen (nie beigetreten) → invite_reminder, auch bei inviteEmailSentAt = null
assert.equal(
  classifyVoter({ membershipStatus: "invited", voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "invite_reminder",
);
// aktiv, unvollständig, vor Halbzeit benachrichtigt → vote_reminder
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 1, topCount: 2, inviteEmailSentAt: beforeHalf, halftime }),
  "vote_reminder",
);
// aktiv, unvollständig, inviteEmailSentAt null (Anomalie) → vote_reminder (Sicherheitsnetz)
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 2, inviteEmailSentAt: null, halftime }),
  "vote_reminder",
);
// Guard: aktiv, nach Halbzeit benachrichtigt (spät beigetreten) → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 2, inviteEmailSentAt: afterHalf, halftime }),
  "skip",
);
// entartet: topCount 0 → skip
assert.equal(
  classifyVoter({ membershipStatus: "active", voteCount: 0, topCount: 0, inviteEmailSentAt: beforeHalf, halftime }),
  "skip",
);

console.log("reminders.test.ts: alle Assertions OK");
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run (in `rundlauf-app/`): `npx --no-install tsx lib/reminders.test.ts`
Expected: FAIL — Modul `./reminders` existiert noch nicht (`Cannot find module` bzw. `ERR_MODULE_NOT_FOUND` / Import-Fehler), Exit-Code ≠ 0.

- [ ] **Step 3: Pure Logik implementieren**

Create `rundlauf-app/lib/reminders.ts`:

```ts
/**
 * Pure, seiteneffektfreie Logik für die Halbzeit-Erinnerung. Bewusst ohne
 * DB-/Mail-Abhängigkeiten, damit unabhängig testbar (lib/reminders.test.ts).
 */

/** True, sobald `now` den Halbzeit-Zeitpunkt (Mitte zwischen Start und Frist)
 *  erreicht oder überschritten hat. False, wenn kein Start oder entartete Frist. */
export function isPastHalftime(
  startedAt: Date | null,
  fristEnde: Date,
  now: Date,
): boolean {
  if (!startedAt) return false;
  const start = startedAt.getTime();
  const end = fristEnde.getTime();
  if (!(end > start)) return false;
  const halftime = start + (end - start) / 2;
  return now.getTime() >= halftime;
}

export type ReminderKind = "skip" | "vote_reminder" | "invite_reminder";

/** Stuft einen Stimmberechtigten zur Halbzeit ein. */
export function classifyVoter(input: {
  membershipStatus: "active" | "invited" | "removed" | null;
  voteCount: number;
  topCount: number;
  inviteEmailSentAt: Date | null;
  halftime: Date;
}): ReminderKind {
  const { membershipStatus, voteCount, topCount, inviteEmailSentAt, halftime } = input;

  if (membershipStatus !== "active" && membershipStatus !== "invited") return "skip";
  if (topCount <= 0) return "skip";
  if (voteCount >= topCount) return "skip"; // vollständig abgestimmt

  if (membershipStatus === "invited") return "invite_reminder";

  // membershipStatus === "active": Guard gegen späten Beitritt.
  // Wer erst nach der Halbzeit benachrichtigt wurde (gerade beigetreten),
  // wird übersprungen. NULL (Versand beim Beitritt fehlgeschlagen) bleibt
  // erinnerbar als Sicherheitsnetz.
  if (inviteEmailSentAt && inviteEmailSentAt.getTime() >= halftime.getTime()) {
    return "skip";
  }
  return "vote_reminder";
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run (in `rundlauf-app/`): `npx --no-install tsx lib/reminders.test.ts`
Expected: `reminders.test.ts: alle Assertions OK`, Exit-Code 0.

- [ ] **Step 5: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/reminders.ts rundlauf-app/lib/reminders.test.ts
git commit -m "$(cat <<'EOF'
feat(rundlauf): pure Halbzeit-Logik (isPastHalftime, classifyVoter) + Tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Mail-Templates

**Files:**
- Modify: `rundlauf-app/lib/mail/templates.ts` (zwei neue Exports am Dateiende)

- [ ] **Step 1: `sendVoteReminder` und `sendInviteReminder` ergänzen**

Am Ende von `rundlauf-app/lib/mail/templates.ts` anfügen (nutzt vorhandene `HTML_WRAPPER`, `appUrl`, `sendMail`; folgt dem Stil von `sendResolutionInvite`/`sendInviteLink`, inkl. der dort etablierten direkten String-Interpolation):

```ts
export async function sendVoteReminder(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  resolutionTitle: string;
  resolutionLink: string;
  fristEnde: Date;
}) {
  const fristStr = opts.fristEnde.toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  const text = `Hallo${greeting},\n\nim Kreisverband "${opts.tenantName}" läuft noch ein Umlaufverfahren, zu dem deine Stimme aussteht:\n\n"${opts.resolutionTitle}"\n\nFrist: ${fristStr}\n\nJetzt abstimmen:\n${opts.resolutionLink}`;
  const greetingHtml = opts.to.name
    ? `Hallo <strong>${opts.to.name}</strong>,`
    : "Hallo,";
  const html = HTML_WRAPPER(
    "Erinnerung: bitte noch abstimmen",
    `<p>${greetingHtml}</p>
     <p>im Kreisverband <strong>${opts.tenantName}</strong> läuft noch ein Umlaufverfahren, zu dem deine Stimme aussteht:</p>
     <p style="background: #fef2f2; padding: 12px 16px; border-left: 4px solid #e30613; border-radius: 4px;">
       <strong>${opts.resolutionTitle}</strong><br/>
       Frist: ${fristStr}
     </p>
     <p style="margin: 24px 0;"><a href="${opts.resolutionLink}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Jetzt abstimmen</a></p>
     <p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">${opts.resolutionLink}</p>`,
  );
  await sendMail({
    to: opts.to,
    subject: `Erinnerung: ${opts.resolutionTitle}`,
    text,
    html,
  });
}

export async function sendInviteReminder(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  rawToken: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}`;
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  const text = [
    `Hallo${greeting},`,
    "",
    `im Kreisverband "${opts.tenantName}" wartet eine Abstimmung auf dich – deine Einladung ist noch offen.`,
    "",
    "Nimm die Einladung an, um teilzunehmen. Nach dem Klick bist du direkt angemeldet – ein Passwort wird nicht benötigt:",
    link,
    "",
    "Der Link ist 7 Tage gültig. Falls du nicht teilnehmen möchtest, kannst du diese E-Mail ignorieren.",
  ].join("\n");
  const greetingHtml = opts.to.name
    ? `Hallo <strong>${opts.to.name}</strong>,`
    : "Hallo,";
  const html = HTML_WRAPPER(
    `Erinnerung: Einladung zu ${opts.tenantName} noch offen`,
    `<p>${greetingHtml}</p>
     <p>im Kreisverband <strong>${opts.tenantName}</strong> wartet eine Abstimmung auf dich – deine Einladung ist noch offen.</p>
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Einladung annehmen</a></p>
     <p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">Oder kopiere diesen Link in deinen Browser:<br>${link}</p>
     <p style="font-size: 0.85rem; color: #6b7280;">Der Link ist <strong>7 Tage</strong> gültig. Falls du nicht teilnehmen möchtest, kannst du diese E-Mail ignorieren.</p>`,
  );
  await sendMail({
    to: opts.to,
    subject: `Erinnerung: Einladung zu ${opts.tenantName}`,
    text,
    html,
  });
}
```

- [ ] **Step 2: Typecheck/Lint**

Run (in `rundlauf-app/`): `npx tsc --noEmit && npm run lint`
Expected: keine Fehler (die neuen Exports werden in Task 4 verwendet; Lint meldet keine ungenutzten Exports).

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/mail/templates.ts
git commit -m "$(cat <<'EOF'
feat(rundlauf): Mail-Templates sendVoteReminder und sendInviteReminder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cron-Orchestrierung

**Files:**
- Create: `rundlauf-app/lib/cron/reminders.ts`

- [ ] **Step 1: Cron-Skript implementieren**

Create `rundlauf-app/lib/cron/reminders.ts`:

```ts
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
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  agendaItems,
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
  const now = new Date();
  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

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
        await logAudit({
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
      await logAudit({
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
```

- [ ] **Step 2: Typecheck/Lint**

Run (in `rundlauf-app/`): `npx tsc --noEmit && npm run lint`
Expected: keine Fehler.

- [ ] **Step 3: Smoke-Run gegen Dev-DB (trockener Lauf, leere/Test-Daten)**

Voraussetzung: Dev-DB erreichbar (`DATABASE_URL` gesetzt), Migration aus Task 1 angewandt. Mail-Env muss **nicht** gesetzt sein, solange keine Reminder fällig sind (dann werden `sendMail`-Aufrufe gar nicht erreicht).

Run (in `rundlauf-app/`): `npx --no-install tsx lib/cron/reminders.ts`
Expected (bei keinen fälligen Verfahren): `[reminders] Vote-Reminder: 0, Invite-Reminder: 0` und `[reminders] Fertig.`, Exit-Code 0.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/cron/reminders.ts
git commit -m "$(cat <<'EOF'
feat(rundlauf): Halbzeit-Erinnerungs-Cron (Vote-Reminder + erneute Einladung)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Compose-Container `rundlauf-reminders`

**Files:**
- Modify: `docker-compose.yml` (Repo-Root `/root/abstimmung/docker-compose.yml`)

- [ ] **Step 1: Service ergänzen**

In `/root/abstimmung/docker-compose.yml` **direkt nach** dem `rundlauf-retention`-Block (vor `abstimmung-dev`) einfügen. Identische Einrückung wie die anderen Services (2 Spaces):

```yaml
  rundlauf-reminders:
    container_name: rundlauf-reminders
    build:
      context: ./rundlauf-app
    restart: unless-stopped
    depends_on:
      rundlauf-db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://rundlauf:${RUNDLAUF_DB_PASSWORD:-rundlauf}@rundlauf-db:5432/rundlauf
      MAILJET_API_KEY: ${MAILJET_API_KEY}
      MAILJET_API_SECRET: ${MAILJET_API_SECRET}
      MAIL_FROM_EMAIL: ${MAIL_FROM_EMAIL:-noreply@drk-abstimmung.de}
      MAIL_FROM_NAME: ${MAIL_FROM_NAME:-DRK Rundlaufbeschlüsse}
      APP_URL: ${RUNDLAUF_APP_URL:-https://rundlauf.drk-abstimmung.de}
    entrypoint: ["/bin/sh", "-c"]
    # Touch-Marker bei erfolgreichem Lauf → Healthcheck prüft Alter < 25h.
    command: ["while true; do npx --no-install tsx ./lib/cron/reminders.ts && touch /tmp/reminders.last-success; sleep 86400; done"]
    networks:
      - caddy-net
    # Überschreibt den HTTP-Healthcheck aus dem Dockerfile (kein Webserver im Cron-Container).
    healthcheck:
      test: ["CMD-SHELL", "[ -f /tmp/reminders.last-success ] && [ $(($(date +%s) - $(stat -c %Y /tmp/reminders.last-success))) -lt 90000 ]"]
      interval: 30m
      timeout: 10s
      start_period: 2m
      retries: 1
```

- [ ] **Step 2: Compose-Syntax prüfen**

Run (in `/root/abstimmung/`): `docker compose config >/dev/null && echo OK`
Expected: `OK` (keine YAML-/Schema-Fehler). Hinweis: Bei nicht gesetzten Mail-Env-Variablen kann eine Warnung zu leeren Variablen erscheinen — das ist kein Fehler.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add docker-compose.yml
git commit -m "$(cat <<'EOF'
feat(rundlauf): Cron-Container rundlauf-reminders für Halbzeit-Erinnerung

Spiegelt rundlauf-retention, zusätzlich mit Mailjet-/APP_URL-Env für den
E-Mail-Versand.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verifikation (Build + manuelle Tests)

**Files:** keine Änderungen — nur Verifikation.

- [ ] **Step 1: Voller Build**

Run (in `rundlauf-app/`): `npm run build`
Expected: erfolgreicher Next.js-Build ohne Type-Fehler.

- [ ] **Step 2: Pure-Logic-Test erneut**

Run (in `rundlauf-app/`): `npx --no-install tsx lib/reminders.test.ts`
Expected: `reminders.test.ts: alle Assertions OK`.

- [ ] **Step 3: Manueller End-to-End-Test gegen Dev-Stack**

Voraussetzung: Dev-Stack mit DB + gesetzten Mailjet-/APP_URL-Env (oder Mailjet-Sandbox). Vorgehen pro Fall siehe Spec, Abschnitt „Testing". Mindestens prüfen:

1. Verfahren mit 2 TOPs, `started_at`/`frist_ende` so setzen, dass die Halbzeit überschritten, die Frist aber in der Zukunft ist (z. B. via SQL-Update auf einem Test-Verfahren).
2. `npx --no-install tsx lib/cron/reminders.ts` ausführen.
3. Erwartung:
   - A (active, 0 Stimmen, Einladung vor Halbzeit) → Vote-Reminder, `reminder_email_sent_at` gesetzt.
   - B (active, 1 von 2 TOPs) → Vote-Reminder.
   - C (active, 2 von 2 TOPs) → keine Mail, Marker NULL.
   - D (invited, nie beigetreten) → Invite-Reminder mit frischem Link.
   - E (active, gerade beigetreten, `invite_email_sent_at ≥ halftime`) → kein Reminder (Guard).
4. Cron erneut ausführen → Konsole zeigt `0`/`0` für die bereits Erinnerten (Marker gesetzt).
5. DB-Check: `SELECT email_snapshot, reminder_email_sent_at FROM eligible_voters WHERE resolution_id = '<id>';`

- [ ] **Step 4: Abschluss**

Wenn alle Checks grün sind, ist die Implementierung vollständig. Branch `feat/rundlauf-halbzeit-erinnerung` ist bereit für PR/Merge (separater Schritt, siehe `finishing-a-development-branch`). **Rollout-Hinweis aus der Spec:** Der erste Cron-Lauf in Produktion erinnert auch bereits laufende Verfahren über Halbzeit (bewusst, „rückwirkend"). Vor dem ersten Lauf laufende Verfahren sichten, falls eine Mail-Welle unerwünscht wäre.

---

## Self-Review (vom Plan-Autor durchgeführt)

**Spec-Abdeckung:**
- Halbzeit-Erinnerung an Nicht-Vollständig-Abstimmende → Task 2 (`classifyVoter`), Task 4 (Orchestrierung). ✓
- Aktiv unvollständig → Vote-Reminder → Task 3 (`sendVoteReminder`), Task 4. ✓
- Eingeladen → erneuter Einladungslink (frischer Token) → Task 3 (`sendInviteReminder`), Task 4 (`createMagicToken`). ✓
- KV-weite Dedup der Invite-Reminder → Task 4 (`pendingInvites`-Map mit Key `tenantId::userId`). ✓
- Guard gegen späten Beitritt → Task 2 (`classifyVoter`, `inviteEmailSentAt >= halftime`). ✓
- Idempotenz/ein Reminder + Retry bei Fehler → neue Spalte (Task 1), Marker nur bei Erfolg (Task 4). ✓
- Kein Backfill / rückwirkend → Task 1 (keine UPDATE-Zeile). ✓
- `status='laufend'` UND `now < fristEnde` (kein Auto-Close) → Task 4 (`gt(fristEnde, now)`). ✓
- Täglicher Cron-Container mit Mail-Env → Task 5. ✓
- Pure, testbare Logik → Task 2. ✓
- Audit-Events → Task 4 (`resolution.vote_reminder_sent`, `resolution.invite_reminder_sent`). ✓

**Platzhalter:** keine.

**Typ-Konsistenz:** `classifyVoter`/`isPastHalftime`-Signaturen identisch in Task 2 (Definition), Task 2-Test und Task 4 (Aufruf). `ReminderKind`-Werte `"skip" | "vote_reminder" | "invite_reminder"` durchgängig. Mail-Funktions-Signaturen aus Task 3 stimmen mit Aufrufen in Task 4 überein (`sendVoteReminder` mit `fristEnde`/`resolutionLink`; `sendInviteReminder` mit `rawToken`). `createMagicToken`/`logAudit` entsprechen den realen Signaturen in `lib/auth/magic.ts` bzw. `lib/audit.ts`.
