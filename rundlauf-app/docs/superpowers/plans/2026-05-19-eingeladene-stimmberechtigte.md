# Eingeladene Stimmberechtigte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins können beim Eröffnen eines Umlaufverfahrens auch eingeladene (noch nicht beigetretene) Mitglieder als stimmberechtigt markieren; diese erhalten den Abstimmungslink automatisch beim Beitritt.

**Architecture:** Neue Spalte `eligible_voters.invite_email_sent_at` markiert, ob die Beschluss-Einladungs-Mail bereits versandt wurde. Beim Eröffnen erhalten aktive Mitglieder die Mail sofort; eingeladene erhalten sie über einen Hook im Magic-Link-Route-Handler, sobald ihre Membership auf `active` wechselt.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Postgres), Mailjet, Zod.

**Spec:** `docs/superpowers/specs/2026-05-19-eingeladene-stimmberechtigte-design.md`

---

## File-Plan

| Aktion | Datei | Verantwortung |
|---|---|---|
| Modify | `lib/db/schema.ts` | Feld `inviteEmailSentAt` in `eligibleVoters` ergänzen |
| Create | `lib/db/migrations/0003_eligible_voter_invite_sent.sql` | DDL + Backfill für bestehende Verfahren |
| Modify | `lib/db/migrations/meta/_journal.json` | Migration registrieren |
| Create | `lib/mail/pending-invites.ts` | Hook-Funktion `sendPendingResolutionInvites` |
| Modify | `app/auth/magic/[token]/route.ts` | Hook nach Membership-Aktivierung aufrufen |
| Modify | `app/[kv]/beschluss/[id]/bearbeiten/page.tsx` | Auch `invited`-Memberships laden, `status` durchreichen |
| Modify | `app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx` | `DraftMember.status` + Badge + Hinweis |
| Modify | `app/[kv]/beschluss/[id]/bearbeiten/actions.ts` | `publishResolution`: invited zulassen, Mail nur an active, `inviteEmailSentAt` konditional setzen |

Keine neuen Tests automatisiert (Projekt hat keinen Test-Runner). Stattdessen Manual-Smoke am Ende.

---

## Branch & Vorbereitung

### Task 0: Branch erstellen

**Files:** —

- [ ] **Step 1: Aktuellen Zustand prüfen**

```bash
cd /root/abstimmung
git status
git branch --show-current
```

Erwartung: keine unrelated uncommitted Changes außer der bereits vorhandenen Spec.

- [ ] **Step 2: Branch von main abzweigen**

```bash
cd /root/abstimmung
git fetch origin
git checkout -b feat/eligible-voters-invited origin/main
```

- [ ] **Step 3: Spec übernehmen**

Die Spec-Datei `rundlauf-app/docs/superpowers/specs/2026-05-19-eingeladene-stimmberechtigte-design.md` ist vor dem Branch-Wechsel angelegt worden. Sie muss jetzt im neuen Branch existieren — falls nicht, neu anlegen aus Memory (Spec-Inhalt liegt im History des Brainstormings).

```bash
cd /root/abstimmung
git status
ls rundlauf-app/docs/superpowers/specs/
```

Wenn die Spec da ist: `git add` und commit. Wenn nicht: Spec aus dem vorigen Branch herauskopieren (`git show feat/invite-mail-copy:rundlauf-app/docs/superpowers/specs/2026-05-19-eingeladene-stimmberechtigte-design.md > /tmp/spec.md`) und neu anlegen.

- [ ] **Step 4: Spec + Plan committen**

```bash
cd /root/abstimmung
git add rundlauf-app/docs/superpowers/specs/2026-05-19-eingeladene-stimmberechtigte-design.md \
        rundlauf-app/docs/superpowers/plans/2026-05-19-eingeladene-stimmberechtigte.md
git commit -m "docs: spec + plan für eingeladene stimmberechtigte"
```

---

## Task 1: Schema-Feld `inviteEmailSentAt` ergänzen

**Files:**
- Modify: `rundlauf-app/lib/db/schema.ts`

- [ ] **Step 1: `eligibleVoters` um Feld erweitern**

In `rundlauf-app/lib/db/schema.ts` den Block `export const eligibleVoters = pgTable(...)` anpassen. Aktuell:

```ts
export const eligibleVoters = pgTable(
  "eligible_voters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    nameSnapshot: text("name_snapshot").notNull(),
    emailSnapshot: text("email_snapshot").notNull(),
    roleSnapshot: membershipRoleEnum("role_snapshot").notNull(),
  },
  (t) => [
    uniqueIndex("eligible_voters_resolution_user_idx").on(t.resolutionId, t.userId),
  ],
);
```

Wird zu:

```ts
export const eligibleVoters = pgTable(
  "eligible_voters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => resolutions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    nameSnapshot: text("name_snapshot").notNull(),
    emailSnapshot: text("email_snapshot").notNull(),
    roleSnapshot: membershipRoleEnum("role_snapshot").notNull(),
    /**
     * Zeitpunkt, an dem die Beschluss-Einladungs-Mail an dieses Mitglied
     * versendet wurde. NULL, solange die Membership zum Eröffnungszeitpunkt
     * noch im Status "invited" war — der Versand erfolgt dann beim Beitritt.
     */
    inviteEmailSentAt: timestamp("invite_email_sent_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("eligible_voters_resolution_user_idx").on(t.resolutionId, t.userId),
    index("eligible_voters_pending_idx").on(t.userId, t.inviteEmailSentAt),
  ],
);
```

Der Index `eligible_voters_pending_idx` beschleunigt die Pending-Query (Filter `userId = ? AND inviteEmailSentAt IS NULL`).

- [ ] **Step 2: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: keine Fehler.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/db/schema.ts
git commit -m "feat(db): add inviteEmailSentAt to eligibleVoters schema"
```

---

## Task 2: Migration erstellen

**Files:**
- Create: `rundlauf-app/lib/db/migrations/0003_eligible_voter_invite_sent.sql`
- Modify: `rundlauf-app/lib/db/migrations/meta/_journal.json`
- Create: `rundlauf-app/lib/db/migrations/meta/0003_snapshot.json` (von drizzle-kit generiert)

- [ ] **Step 1: Migration mit drizzle-kit generieren**

```bash
cd /root/abstimmung/rundlauf-app
npx drizzle-kit generate --name eligible_voter_invite_sent
```

Erwartung: Neue Datei `0003_eligible_voter_invite_sent.sql` wird angelegt. Ausgabe enthält `ALTER TABLE "eligible_voters" ADD COLUMN ...` und einen Index.

- [ ] **Step 2: Migration anschauen**

```bash
cat /root/abstimmung/rundlauf-app/lib/db/migrations/0003_eligible_voter_invite_sent.sql
```

Erwartung: ungefähr

```sql
ALTER TABLE "eligible_voters" ADD COLUMN "invite_email_sent_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "eligible_voters_pending_idx" ON "eligible_voters" USING btree ("user_id","invite_email_sent_at");
```

- [ ] **Step 3: Backfill ergänzen**

In die generierte SQL-Datei am Ende einfügen (nach den drizzle-Statements):

```sql
--> statement-breakpoint
-- Backfill: bestehende Einträge gelten als "Mail bereits versandt", damit der
-- Beitritt-Hook nicht rückwirkend für altgediente Verfahren feuert.
UPDATE "eligible_voters" SET "invite_email_sent_at" = NOW() WHERE "invite_email_sent_at" IS NULL;
```

- [ ] **Step 4: Lokal gegen Dev-DB anwenden (optional, falls Dev-DB läuft)**

Nur ausführen, wenn lokale Postgres erreichbar ist. Sonst überspringen — wird beim nächsten `docker compose up` automatisch via `docker-entrypoint.sh` angewendet.

```bash
cd /root/abstimmung/rundlauf-app
DATABASE_URL="postgres://rundlauf:rundlauf@localhost:5432/rundlauf" npm run db:migrate
```

Falls nicht definiert in package.json: stattdessen direkt `npx tsx lib/db/migrate.ts` mit gesetztem `DATABASE_URL`.

Erwartung: Output `[migrate] Fertig.`

- [ ] **Step 5: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/db/migrations/0003_eligible_voter_invite_sent.sql \
        rundlauf-app/lib/db/migrations/meta/_journal.json \
        rundlauf-app/lib/db/migrations/meta/0003_snapshot.json
git commit -m "feat(db): migrate eligibleVoters.inviteEmailSentAt with backfill"
```

---

## Task 3: Pending-Invites-Helper anlegen

**Files:**
- Create: `rundlauf-app/lib/mail/pending-invites.ts`

- [ ] **Step 1: Datei anlegen**

`rundlauf-app/lib/mail/pending-invites.ts`:

```ts
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  agendaItems,
  eligibleVoters,
  resolutions,
  tenants,
} from "@/lib/db/schema";
import { sendResolutionInvite } from "@/lib/mail/templates";

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

  for (const p of pending) {
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
  }
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: keine Fehler.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/mail/pending-invites.ts
git commit -m "feat(mail): add sendPendingResolutionInvites helper"
```

---

## Task 4: Magic-Link-Hook einbinden

**Files:**
- Modify: `rundlauf-app/app/auth/magic/[token]/route.ts`

- [ ] **Step 1: Import ergänzen**

In `rundlauf-app/app/auth/magic/[token]/route.ts` an die bestehenden Imports anhängen:

```ts
import { sendPendingResolutionInvites } from "@/lib/mail/pending-invites";
```

- [ ] **Step 2: Hook nach Membership-Aktivierung aufrufen**

Im bestehenden Block (Zeile ~48–58, der `if (consumed.purpose === "invite" && consumed.tenantId) { ... }` enthält), direkt nach dem `db.update(memberships)...`-Statement ergänzen:

Vorher:

```ts
  // Falls invite + tenantId → Membership aktivieren
  if (consumed.purpose === "invite" && consumed.tenantId) {
    await db
      .update(memberships)
      .set({ status: "active", joinedAt: new Date() })
      .where(
        and(
          eq(memberships.tenantId, consumed.tenantId),
          eq(memberships.userId, userId),
        ),
      );
  }
```

Nachher:

```ts
  // Falls invite + tenantId → Membership aktivieren
  if (consumed.purpose === "invite" && consumed.tenantId) {
    await db
      .update(memberships)
      .set({ status: "active", joinedAt: new Date() })
      .where(
        and(
          eq(memberships.tenantId, consumed.tenantId),
          eq(memberships.userId, userId),
        ),
      );

    // Beschluss-Einladungs-Mails für laufende Verfahren versenden, in denen
    // dieser Nutzer als stimmberechtigt geführt ist. Fehler werden geloggt,
    // brechen die Aktivierung aber nicht ab.
    try {
      await sendPendingResolutionInvites({
        tenantId: consumed.tenantId,
        userId,
      });
    } catch (err) {
      console.error("[magic] pending invites hook failed", err);
    }
  }
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: keine Fehler.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/auth/magic/[token]/route.ts
git commit -m "feat(auth): trigger pending resolution invites on tenant join"
```

---

## Task 5: Server-seitige Member-Liste erweitern

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/page.tsx`

- [ ] **Step 1: Import `inArray` (bereits importiert) prüfen**

In `page.tsx` ist `inArray` bereits importiert (Zeile 3). Nichts zu tun.

- [ ] **Step 2: Member-Query auf `invited` erweitern**

Aktuell (ca. Zeile 104–117):

```ts
  const memberRows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(eq(memberships.tenantId, ctx.tenant.id), eq(memberships.status, "active")),
    )
    .orderBy(asc(users.name), asc(users.email));

  const members: DraftMember[] = memberRows.map((m) => ({
    userId: m.userId,
    displayName: m.name ?? m.email,
    email: m.email,
    role: m.role,
  }));
```

Wird zu:

```ts
  const memberRows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.tenantId, ctx.tenant.id),
        inArray(memberships.status, ["active", "invited"]),
      ),
    )
    .orderBy(asc(users.name), asc(users.email));

  const members: DraftMember[] = memberRows.map((m) => ({
    userId: m.userId,
    displayName: m.name ?? m.email,
    email: m.email,
    role: m.role,
    status: m.status,
  }));
```

- [ ] **Step 3: Aktive-Mitglieder-Check vorne anpassen**

Die `requireAdmin`-Variante in `neu/page.tsx` prüft auf `activeMemberCount < 2`. Das bleibt unverändert — Mindestbedingung "es muss überhaupt mit jemandem arbeitbar sein" bleibt am Start gesetzt. (`neu/page.tsx` wird in Task 7 nicht angefasst.)

- [ ] **Step 4: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: Fehler in `draft-editor.tsx`, weil `DraftMember.status` noch fehlt. Wird in Task 6 behoben. Solange `draft-editor.tsx` `DraftMember` als Quelle behält, sind die `status`-Property-Fehler nur dort. Falls TS-Check kritisch ist, kann dieser Step zusammen mit Task 6 committed werden.

- [ ] **Step 5: Noch nicht committen — folgt zusammen mit Task 6**

---

## Task 6: Client-Komponente: Status-Badge und Hinweis

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx`

- [ ] **Step 1: Type `DraftMember` erweitern**

In `draft-editor.tsx` (Zeile ~39–44):

```ts
export type DraftMember = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
};
```

Wird zu:

```ts
export type DraftMember = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  status: "active" | "invited";
};
```

- [ ] **Step 2: EligibilitySection — Liste anpassen**

Die `<li>`-Rendering-Schleife (ca. Zeile 749–774). Aktuell:

```tsx
        <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {members.map((m) => {
            const checked = selected.has(m.userId);
            return (
              <li key={m.userId}>
                <label
                  className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                  style={{ background: checked ? "var(--drk-bg)" : undefined }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.userId)}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--drk)" }}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{m.displayName}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-light)" }}>
                      {m.email} · {m.role}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
```

Wird zu:

```tsx
        <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {members.map((m) => {
            const checked = selected.has(m.userId);
            const isInvited = m.status === "invited";
            return (
              <li key={m.userId}>
                <label
                  className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                  style={{ background: checked ? "var(--drk-bg)" : undefined }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.userId)}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--drk)" }}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{m.displayName}</span>
                    <span
                      className="text-xs ml-2"
                      style={{ color: "var(--text-light)" }}
                    >
                      {m.email} · {m.role}
                    </span>
                    {isInvited ? (
                      <span
                        className="text-xs ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                          background: "var(--drk-bg)",
                          color: "var(--drk)",
                        }}
                        title="Mitglied hat die KV-Einladung noch nicht angenommen"
                      >
                        ⏳ Eingeladen
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
```

- [ ] **Step 3: Erklärtext oberhalb der Liste ergänzen**

Direkt vor der `<ul>` aus Step 2 (also unter dem "Alle/Keine"-Button-Block, ca. Zeile 748), einfügen:

```tsx
        <p
          className="text-xs"
          style={{ color: "var(--text-light)" }}
        >
          Eingeladene Mitglieder erhalten den Abstimmungslink automatisch,
          sobald sie der KV-Einladung folgen.
        </p>
```

- [ ] **Step 4: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: keine Fehler mehr (`DraftMember.status` ist jetzt überall konsistent).

- [ ] **Step 5: Build-Smoke**

```bash
cd /root/abstimmung/rundlauf-app
npx next build
```

Erwartung: erfolgreicher Build. Falls Mailjet-Env-Vars beim Build fehlen, ignorieren — die werden zur Runtime gebraucht.

- [ ] **Step 6: Commit (Tasks 5 + 6 zusammen)**

```bash
cd /root/abstimmung
git add rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/page.tsx \
        rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx
git commit -m "feat(resolution): show invited members in eligible-voter picker"
```

---

## Task 7: Server-Action `publishResolution` anpassen

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/actions.ts`

- [ ] **Step 1: Validierung — `invited` zulassen**

In `actions.ts` (ca. Zeile 395–410), der `validMembers`-Query. Aktuell:

```ts
  const validMembers = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.tenantId, ctx.tenant.id),
        eq(memberships.status, "active"),
        inArray(memberships.userId, requestedIds),
      ),
    );
```

Wird zu:

```ts
  const validMembers = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      status: memberships.status,
      email: users.email,
      name: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.tenantId, ctx.tenant.id),
        inArray(memberships.status, ["active", "invited"]),
        inArray(memberships.userId, requestedIds),
      ),
    );
```

Und die Fehlermeldung direkt darunter anpassen — aktuell:

```ts
  if (validMembers.length < 2) {
    return { ok: false, message: "Mindestens 2 aktive Mitglieder müssen ausgewählt sein." };
  }
  if (validMembers.length !== requestedIds.length) {
    return {
      ok: false,
      message:
        "Mindestens ein ausgewählter Benutzer ist kein aktives Mitglied mehr. Bitte Liste prüfen.",
    };
  }
```

Wird zu:

```ts
  if (validMembers.length < 2) {
    return { ok: false, message: "Mindestens 2 Mitglieder (aktiv oder eingeladen) müssen ausgewählt sein." };
  }
  if (validMembers.length !== requestedIds.length) {
    return {
      ok: false,
      message:
        "Mindestens ein ausgewählter Benutzer ist nicht (mehr) Mitglied oder wurde entfernt. Bitte Liste prüfen.",
    };
  }
```

- [ ] **Step 2: `eligibleVoters`-Insert: `inviteEmailSentAt` konditional setzen**

Direkt darunter (ca. Zeile 423–432). Aktuell:

```ts
  // Eligible-Voter Snapshots schreiben
  await db.insert(eligibleVoters).values(
    validMembers.map((m) => ({
      resolutionId: r!.id,
      userId: m.userId,
      nameSnapshot: m.name ?? m.email,
      emailSnapshot: m.email,
      roleSnapshot: m.role,
    })),
  );
```

Wird zu:

```ts
  // Eligible-Voter Snapshots schreiben. Aktive Mitglieder bekommen die Mail
  // unten sofort → inviteEmailSentAt = jetzt. Eingeladene bekommen sie beim
  // Beitritt → inviteEmailSentAt bleibt NULL.
  const publishedAt = new Date();
  await db.insert(eligibleVoters).values(
    validMembers.map((m) => ({
      resolutionId: r!.id,
      userId: m.userId,
      nameSnapshot: m.name ?? m.email,
      emailSnapshot: m.email,
      roleSnapshot: m.role,
      inviteEmailSentAt: m.status === "active" ? publishedAt : null,
    })),
  );
```

- [ ] **Step 3: Mail-Versand auf aktive Mitglieder beschränken**

Aktuell (ca. Zeile 457–468):

```ts
  await Promise.allSettled(
    validMembers.map((m) =>
      sendResolutionInvite({
        to: { email: m.email, name: m.name ?? undefined },
        tenantName: ctx.tenant.name,
        resolutionTitle: subjectTitle,
        resolutionLink: link,
        fristEnde: r!.fristEnde,
        topCount,
      }),
    ),
  );
```

Wird zu:

```ts
  const activeMembers = validMembers.filter((m) => m.status === "active");
  await Promise.allSettled(
    activeMembers.map((m) =>
      sendResolutionInvite({
        to: { email: m.email, name: m.name ?? undefined },
        tenantName: ctx.tenant.name,
        resolutionTitle: subjectTitle,
        resolutionLink: link,
        fristEnde: r!.fristEnde,
        topCount,
      }),
    ),
  );
```

- [ ] **Step 4: Audit-Log-Payload erweitern**

Aktuell (ca. Zeile 440–451):

```ts
  await logAudit({
    action: "resolution.published",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r!.id,
    payload: {
      eligibleCount: validMembers.length,
      topCount,
      fristEnde: r!.fristEnde.toISOString(),
    },
  });
```

Wird zu:

```ts
  const pendingInviteCount = validMembers.length - activeMembers.length;
  await logAudit({
    action: "resolution.published",
    tenantId: ctx.tenant.id,
    actorUserId: ctx.user.id,
    targetType: "resolution",
    targetId: r!.id,
    payload: {
      eligibleCount: validMembers.length,
      activeCount: activeMembers.length,
      pendingInviteCount,
      topCount,
      fristEnde: r!.fristEnde.toISOString(),
    },
  });
```

**Hinweis:** `activeMembers` muss vor dem Audit-Log existieren. Reihenfolge im fertigen Code: erst eligibleVoters-Insert (Step 2) → `const activeMembers = ...` (Step 3, Filter direkt nach Insert ziehen) → Status-Update auf `laufend` → Audit-Log → Mail-Versand.

Konkret bedeutet das: Block-Reihenfolge im finalen `publishResolution` ist:

```ts
  const publishedAt = new Date();
  await db.insert(eligibleVoters).values(/* … wie Step 2 */);

  const activeMembers = validMembers.filter((m) => m.status === "active");
  const pendingInviteCount = validMembers.length - activeMembers.length;

  await db
    .update(resolutions)
    .set({ status: "laufend", startedAt: publishedAt })
    .where(eq(resolutions.id, r!.id));

  await logAudit({
    action: "resolution.published",
    /* … wie Step 4 */
  });

  const link = `${process.env.APP_URL?.replace(/\/$/, "")}/${ctx.tenant.slug}/beschluss/${r!.id}`;
  const subjectTitle =
    r!.betreff || `Umlaufverfahren mit ${topCount} Beschlussvorlage${topCount === 1 ? "" : "n"}`;
  await Promise.allSettled(
    activeMembers.map((m) =>
      sendResolutionInvite({
        to: { email: m.email, name: m.name ?? undefined },
        tenantName: ctx.tenant.name,
        resolutionTitle: subjectTitle,
        resolutionLink: link,
        fristEnde: r!.fristEnde,
        topCount,
      }),
    ),
  );
```

Auch `startedAt` greift jetzt auf `publishedAt` zurück, um Konsistenz mit `inviteEmailSentAt` für active Members herzustellen.

- [ ] **Step 5: TypeScript-Check**

```bash
cd /root/abstimmung/rundlauf-app
npx tsc --noEmit
```

Erwartung: keine Fehler.

- [ ] **Step 6: Build-Smoke**

```bash
cd /root/abstimmung/rundlauf-app
npx next build
```

Erwartung: erfolgreicher Build.

- [ ] **Step 7: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/actions.ts
git commit -m "feat(resolution): allow publishing with invited eligible voters"
```

---

## Task 8: Manueller Smoke-Test (lokal)

**Files:** —

Voraussetzungen: Postgres + App lokal via Docker laufend, Mailjet-Sandbox oder Test-Empfänger konfiguriert.

- [ ] **Step 1: Stack hochfahren und Migration anwenden**

```bash
cd /root/abstimmung
docker compose --profile dev up -d --build
docker compose logs -f rundlauf-app
```

Erwartung: Migration `0003_eligible_voter_invite_sent` läuft sauber durch. Container reports `[migrate] Fertig.` oder Drizzle-Equivalent.

- [ ] **Step 2: Bestehende laufende Verfahren prüfen — keine Mail-Welle**

In der DB-Konsole:

```bash
docker compose exec db psql -U rundlauf -d rundlauf -c \
  "SELECT id, resolution_id, invite_email_sent_at FROM eligible_voters ORDER BY id LIMIT 10;"
```

Erwartung: Alle bestehenden Einträge haben `invite_email_sent_at` gesetzt (durch Backfill). Keine Mailjet-Aktivität.

- [ ] **Step 3: Szenario "Active + Invited Mix"**

Als Admin-User in einem Test-KV:
1. Lade `test-active@example.de` ein → Magic-Link klicken → Status active.
2. Lade `test-invited@example.de` ein → **nicht** klicken.
3. Neuen Beschluss anlegen, in der Stimmberechtigten-Liste beide auswählen (+ den Admin selbst, falls nötig für Min-2).
4. "Verfahren eröffnen und einladen" klicken.

Erwartung in der UI: Erfolgsmeldung, Redirect auf `/beschluss/[id]`. Eingeladene Mitglieder erscheinen weiterhin in der Liste.

Erwartung in der DB:
```bash
docker compose exec db psql -U rundlauf -d rundlauf -c \
  "SELECT email_snapshot, invite_email_sent_at FROM eligible_voters WHERE resolution_id = '<id>';"
```
- `test-active@...` → `invite_email_sent_at` gesetzt
- `test-invited@...` → `invite_email_sent_at` NULL

Erwartung in Mailjet: Nur 2 Beschluss-Einladungs-Mails (Admin + test-active).

- [ ] **Step 4: Szenario "Beitritt löst Mail aus"**

Klick auf KV-Einladungs-Link von `test-invited@example.de`.

Erwartung:
- Redirect auf Dashboard.
- DB: Membership-Status auf `active`, `joined_at` gesetzt.
- DB: `eligible_voters.invite_email_sent_at` für `test-invited@...` auf NOW() aktualisiert.
- Mailjet: Eine Beschluss-Einladungs-Mail an `test-invited@...` versendet.
- Audit-Log: Eintrag `resolution.invite_sent_on_join`.

- [ ] **Step 5: Szenario "Re-Login löst keine Mail aus"**

`test-invited@example.de` einen Login-Magic-Link anfordern und konsumieren.

Erwartung: Keine weitere Beschluss-Einladungs-Mail. Hook wird nicht ausgelöst, da `purpose=login` (nicht `invite`).

- [ ] **Step 6: Negativ-Test: Veraltetes/abgeschlossenes Verfahren**

Verfahren manuell auf `abgeschlossen` setzen:

```bash
docker compose exec db psql -U rundlauf -d rundlauf -c \
  "UPDATE resolutions SET status = 'abgeschlossen' WHERE id = '<id>';"
```

Einen neuen Test-Invited einladen + zur Resolution hinzufügen (DB-Hack zum Testen) + beitreten lassen.

Erwartung: Keine Mail, da Hook nur für `status=laufend` filtert.

(Optional — wenn Aufwand groß: skip.)

- [ ] **Step 7: Negativ-Test: Mailjet-Fehler**

Mailjet temporär auf ungültige Credentials setzen, beitreten lassen.

Erwartung:
- Console-Error `[pending-invites] send failed`.
- `eligible_voters.invite_email_sent_at` bleibt NULL.
- Membership-Aktivierung war trotzdem erfolgreich (User landet auf Dashboard).

(Optional — wenn Mailjet-Setup das nicht zulässt: skip.)

- [ ] **Step 8: Stack runterfahren**

```bash
cd /root/abstimmung
docker compose --profile dev down
```

---

## Task 9: Pull Request

**Files:** —

- [ ] **Step 1: Branch pushen**

```bash
cd /root/abstimmung
git push -u origin feat/eligible-voters-invited
```

- [ ] **Step 2: PR erstellen**

```bash
gh pr create --title "feat: invited members als stimmberechtigte zulassen" --body "$(cat <<'EOF'
## Summary

- Admins können beim Eröffnen eines Umlaufverfahrens jetzt auch eingeladene (noch nicht beigetretene) Mitglieder als stimmberechtigt markieren.
- Aktive Mitglieder bekommen die Beschluss-Einladungs-Mail wie bisher beim Eröffnen.
- Eingeladene Mitglieder bekommen die Mail automatisch, sobald sie der KV-Einladung folgen (Hook im Magic-Link-Handler).
- Neue Spalte `eligible_voters.invite_email_sent_at` markiert versendete Mails; Backfill setzt bestehende Einträge auf `NOW()`.

## Spec & Plan

- Spec: `rundlauf-app/docs/superpowers/specs/2026-05-19-eingeladene-stimmberechtigte-design.md`
- Plan: `rundlauf-app/docs/superpowers/plans/2026-05-19-eingeladene-stimmberechtigte.md`

## Test plan

- [ ] Migration läuft sauber, Backfill setzt alle bestehenden Einträge auf NOW()
- [ ] Active + Invited Mix bei Eröffnung: nur active erhalten Mail, invited bleiben pending
- [ ] Invited tritt bei → Mail wird versendet, `invite_email_sent_at` aktualisiert
- [ ] Re-Login (purpose=login) löst keine Mail aus
- [ ] Beitritt nach Fristende oder bei `abgeschlossen`-Verfahren → keine Mail
- [ ] Audit-Log enthält `activeCount` + `pendingInviteCount` bei `resolution.published` und `resolution.invite_sent_on_join` beim Beitritt
EOF
)"
```

---

## Self-Review-Checkliste (vor Übergabe)

- [x] Spec-Coverage: jede Spec-Sektion hat eine Task (Schema → T1+T2, Hook → T3+T4, UI Server → T5, UI Client → T6, Action → T7, Tests → T8, Rollout → T9).
- [x] Keine Placeholder oder vage Schritte.
- [x] Type-Konsistenz: `DraftMember.status` wird in T5 (server) und T6 (client) gemeinsam eingeführt → Build-Check in T6 prüft beide.
- [x] Konsistente Funktions-/Property-Namen: `inviteEmailSentAt`, `sendPendingResolutionInvites`, `pendingInviteCount`.
- [x] Code-Reihenfolge in T7 ist explizit dokumentiert (Step 4 Hinweis), damit `activeMembers` vor Audit-Log existiert.
