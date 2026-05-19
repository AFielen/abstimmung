# Spec: Eingeladene Mitglieder als Stimmberechtigte zulassen

**Datum:** 2026-05-19
**Status:** Entwurf — Review ausstehend
**Scope:** rundlauf-app (drk-abstimmung)

---

## Problem

Beim Eröffnen eines Umlaufverfahrens (`/[kv]/beschluss/[id]/bearbeiten`) können Admins aktuell nur Mitglieder mit `memberships.status = 'active'` als Stimmberechtigte auswählen. Eingeladene Mitglieder (Status `invited`, die ihren Magic-Link noch nicht geklickt haben) tauchen in der Auswahl nicht auf.

Das zwingt Admins, vor jedem Umlaufverfahren zu warten, bis alle eingeladenen Mitglieder beigetreten sind, oder einzelne Personen aus dem Verfahren auszuschließen.

## Ziel

1. Admins können beim Erstellen eines Umlaufverfahrens auch eingeladene Mitglieder als stimmberechtigt markieren.
2. Aktive Mitglieder erhalten beim Eröffnen wie bisher sofort die Beschluss-Einladungs-Mail.
3. Eingeladene Mitglieder erhalten die Beschluss-Einladungs-Mail automatisch, sobald sie beitreten (Magic-Link geklickt → Membership aktiv).
4. Nicht-Ziel: Reminder/Bounce-Handling für eingeladene Mitglieder, die nie beitreten. Wenn die KV-Einladungs-Mail nach 7 Tagen abgelaufen ist (Magic-Token-TTL), muss der Admin manuell erneut einladen.

## Nicht-Ziel

- Keine Änderung am Einladungs-Mail-Flow oder am Magic-Link-TTL.
- Kein Reversal: Wer einmal als stimmberechtigt markiert ist, bleibt es. (Snapshot-Charakter des Verfahrens.)
- Keine Anzeige in PDF-Export, dass jemand "noch nicht beigetreten" ist — Snapshot bleibt rein juristisch.

## User-Stories

### Admin sieht eingeladene Mitglieder bei der Auswahl

```
┌───────────────────────────────────────────────────────────┐
│ Stimmberechtigte (3 von 5)                                │
├───────────────────────────────────────────────────────────┤
│ ☑ Anna Müller        anna@example.de · admin              │
│ ☑ Bert Schulz        bert@example.de · member             │
│ ☑ Carla Weiß         carla@example.de · member ⏳ Eingeladen │
│ ☐ Dirk Klein         dirk@example.de · member             │
│ ☐ Eva Schmidt        eva@example.de · member ⏳ Eingeladen │
└───────────────────────────────────────────────────────────┘

ℹ Eingeladene Mitglieder erhalten den Abstimmungslink automatisch,
  sobald sie der KV-Einladung folgen.
```

### Eingeladenes Mitglied tritt bei

1. Carla klickt KV-Einladungs-Link in ihrer Mail.
2. Magic-Link wird konsumiert → User in Session, Membership-Status auf `active`.
3. **Neu:** System prüft, ob Carla in offenen `laufend`-Resolutions als stimmberechtigt geführt ist und noch keine Beschluss-Einladung erhalten hat. Für jede passende Resolution wird `sendResolutionInvite()` ausgelöst.
4. Carla landet wie bisher auf `/` (Dashboard, das auf KV-Übersicht weiterleitet) und sieht dort das offene Verfahren.

## Schema-Änderung

Migration `0003_eligible_voter_invite_sent.sql`:

```sql
ALTER TABLE eligible_voters
  ADD COLUMN invite_email_sent_at TIMESTAMPTZ;
```

Drizzle-Schema in `lib/db/schema.ts`:

```ts
export const eligibleVoters = pgTable(
  "eligible_voters",
  {
    // … bestehende Felder …
    inviteEmailSentAt: timestamp("invite_email_sent_at", { withTimezone: true }),
  },
  // …
);
```

**Bedeutung:** `NULL` = Beschluss-Einladungs-Mail steht aus (weil Mitglied beim Eröffnen noch nicht aktiv war). Zeitstempel = Mail wurde versendet.

Existing rows (vor der Migration angelegte Verfahren): bleiben `NULL`. Das ist akzeptabel, weil sie alle bereits zu `laufend`-Zeitpunkt aktive Mitglieder hatten. Für die Korrektheit der Logik müssen wir bei der Migration bestehende Einträge auf `NOW()` setzen, damit der Hook nicht rückwirkend Mails verschickt:

```sql
UPDATE eligible_voters SET invite_email_sent_at = NOW() WHERE invite_email_sent_at IS NULL;
```

## Code-Änderungen

### 1. `app/[kv]/beschluss/[id]/bearbeiten/page.tsx`

Den Member-Query erweitern: statt nur `status = 'active'` auch `status = 'invited'` laden. Zusätzlich `status` an die Client-Komponente durchreichen.

```ts
.where(
  and(
    eq(memberships.tenantId, ctx.tenant.id),
    inArray(memberships.status, ["active", "invited"]),
  ),
)
```

`DraftMember` bekommt ein Feld `status: "active" | "invited"`.

### 2. `app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx`

- Typ `DraftMember` um `status` erweitern.
- Im Member-Listeneintrag bei `status === "invited"` ein dezentes Badge "⏳ Eingeladen" anzeigen.
- Über der Liste den Hinweis-Text ergänzen: "Eingeladene Mitglieder erhalten den Abstimmungslink automatisch, sobald sie der KV-Einladung folgen."
- Default-Vorbelegung der Checkboxen ändert sich **nicht**: Vorschlag aus letztem Verfahren bleibt, fallback ist weiterhin "alle Mitglieder" (jetzt inkl. invited).

### 3. `app/[kv]/beschluss/[id]/bearbeiten/actions.ts` (`publishResolution`)

Validierungs-Block anpassen:

```ts
const validMembers = await db
  .select({…})
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

Bei `eligibleVoters`-Insert: `inviteEmailSentAt` setzen auf:
- `new Date()` wenn `membership.status === "active"`
- `null` wenn `membership.status === "invited"`

Die `sendResolutionInvite`-Mails werden **nur** für aktive Mitglieder gesendet (sonst hätten sie keinen Login).

Min-2-Stimmberechtigte-Check bleibt bestehen. Der Check, dass alle requested IDs valid sind, bleibt bestehen (jetzt aber inkl. invited).

Audit-Log-Payload erweitern um `activeCount` und `pendingInviteCount` für Transparenz.

### 4. `app/auth/magic/[token]/route.ts`

Nach dem Membership-Aktivieren (Zeile 48–58, `consumed.purpose === "invite"`-Block) ergänzen:

```ts
// Hook: Beschluss-Einladungen für offene Verfahren senden
await sendPendingResolutionInvites({
  tenantId: consumed.tenantId,
  userId,
});
```

Implementierung in `lib/mail/pending-invites.ts` (neue Datei):

```ts
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

  // TOP-Counts pro Resolution holen (für Subject)
  const topCounts = await db
    .select({ resolutionId: agendaItems.resolutionId, c: count() })
    .from(agendaItems)
    .where(inArray(agendaItems.resolutionId, pending.map((p) => p.resolutionId)))
    .groupBy(agendaItems.resolutionId);
  const topCountMap = new Map(topCounts.map((t) => [t.resolutionId, Number(t.c)]));

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

  for (const p of pending) {
    try {
      await sendResolutionInvite({
        to: { email: p.email, name: p.name },
        tenantName: p.tenantName,
        resolutionTitle:
          p.betreff ||
          `Umlaufverfahren mit ${topCountMap.get(p.resolutionId) ?? "?"} Beschlussvorlage(n)`,
        resolutionLink: `${baseUrl}/${p.tenantSlug}/beschluss/${p.resolutionId}`,
        fristEnde: p.fristEnde,
        topCount: topCountMap.get(p.resolutionId),
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
      console.error("[pending-invites] send failed", p.resolutionId, err);
      // Bei Fehler: inviteEmailSentAt NICHT setzen → nächste Login-Magic-Link
      // verarbeitet erneut. Wir wollen lieber ein doppeltes Mail-Risiko gegen
      // Null vermeiden — die Aktivierung erfolgt nur einmal (Status-Wechsel
      // invited→active), also kein erneuter Trigger über denselben Pfad.
    }
  }
}
```

Wichtig: Funktion ist idempotent über `inviteEmailSentAt IS NULL`. Wenn der User ein zweites Mal über einen Login-Magic-Link (purpose `login`) reinkommt, läuft der Hook **nicht** — der Trigger ist nur `purpose === "invite"`. Das ist absichtlich: ein erneuter Login bedeutet nicht, dass eine neue Einladungs-Mail fällig ist.

**Edge case:** Wenn der Versand fehlschlägt, bleibt `inviteEmailSentAt` `NULL`. Das Verfahren erscheint dann immer noch als „Einladung ausstehend". Admin kann manuell nachfassen — siehe „Offene Punkte".

### 5. Resolution-Detail-Anzeige (`app/[kv]/beschluss/[id]/page.tsx`) — optional / Out of Scope

Für diese Iteration **out of scope**. Falls gewünscht, kann später ein Hinweis ergänzt werden: „X von Y Stimmberechtigten haben den Beitritt zur KV-Mitgliedschaft noch nicht bestätigt." Wir verfolgen das jetzt nicht aktiv, weil die Frist sowieso die natürliche Eskalation ist.

## Edge Cases

| Fall | Verhalten |
|---|---|
| Eingeladenes Mitglied tritt nach `fristEnde` bei | `resolution.status` ist dann nicht mehr `laufend` (Cron-Job setzt auf `abgeschlossen`). Hook filtert auf `status = laufend` → keine Mail. Korrekt: Verfahren ist vorbei. |
| Eingeladenes Mitglied wird entfernt (`status = removed`) bevor es beitritt | Es kann nicht mehr beitreten (Magic-Link verweist auf nicht-existente Membership-Aktivierung). Aber `eligibleVoters`-Eintrag existiert noch — Mail wird nie gesendet. OK, da Snapshot. |
| Mitglied wird erst eingeladen, tritt bei, dann wird Verfahren eröffnet | Status = `active` zum Eröffnungs-Zeitpunkt → Mail geht sofort raus, kein Pending-Eintrag. Default-Verhalten unverändert. |
| Mitglied tritt zwischen Eröffnung und Frist-Ablauf bei | Hook sendet Mail. ✓ |
| Mitglied ist in mehreren `laufend`-Verfahren stimmberechtigt | Hook iteriert über alle, ein Mail pro Verfahren. ✓ |
| Magic-Token läuft ab (>7 Tage), Admin re-invited | Bei erneuter Einladung gleicher Membership: `inviteUserToTenant` aktualisiert `invitedAt`, schickt neuen Token. Bei späterem Klick: gleicher Code-Pfad (`purpose=invite`, `tenantId` gesetzt) → Membership wird `active`, Hook feuert. ✓ |
| `sendResolutionInvite` wirft (Mailjet-Down) | `inviteEmailSentAt` bleibt `NULL`, Audit-Log fehlt, Console-Error. Aktivierung bleibt erfolgreich. Manuelle Nachverfolgung nötig. |

## Security / Datenschutz

- Keine neuen PII-Felder.
- `eligibleVoters.inviteEmailSentAt` ist Verfahrens-Metadatum, kein personenbezogenes Tracking.
- Audit-Events `resolution.invite_sent_on_join` haben `actorUserId = userId` (das beitretende Mitglied selbst), nicht der ursprüngliche Inviter — semantisch korrekt, weil die Aktion durch den Klick getriggert wird.

## Testing

Nicht-trivial zu testen, weil das Setup einen vollen Mailjet-Mock erfordert. Für diese Iteration:

1. **Manuelle Tests gegen lokalen Dev-Stack:**
   - User A (admin) lädt B (invited), C (active) ein. C tritt bei. Verfahren mit B+C eröffnen. Erwartung: C bekommt Mail, B nicht. DB: `inviteEmailSentAt` bei C gesetzt, bei B NULL.
   - B klickt KV-Einladung. Erwartung: Membership active, Mail für laufendes Verfahren versendet, `inviteEmailSentAt` bei B gesetzt.
   - Re-Login B (purpose login) → kein weiterer Mail-Versand.
2. **Migration-Test:** Bestehendes Verfahren in laufender DB → Migration setzt `inviteEmailSentAt = NOW()`, Hook feuert nicht rückwirkend für altgediente aktive Mitglieder.

Keine automatisierten Tests für diese Iteration — entsprechend dem Projektmuster (rundlauf-app hat aktuell keine Unit-/Integration-Tests).

## Offene Punkte

- Falls Mailjet-Versand beim Beitritt fehlschlägt: keine automatische Wiederholung. Akzeptiert für jetzt. Falls in Praxis problematisch, später ein Retry-Cron einbauen (analog `lib/cron/retention.ts`).
- Resolution-Detail-Ansicht zeigt nicht, wer noch nicht beigetreten ist. Bewusst vertagt.

## Migration & Rollout

Low-risk Prod (siehe Memory: `drk-isms.de` nur Testnutzer — Achtung: das ist nis2-manager, NICHT rundlauf. drk-abstimmung kann reale User haben). Vor Rollout:

1. Schema-Migration `0003_eligible_voter_invite_sent.sql` testen.
2. `UPDATE eligible_voters SET invite_email_sent_at = NOW() WHERE invite_email_sent_at IS NULL;` als Teil der Migration sicherstellen.
3. Deploy.
4. Smoke: Ein bestehendes laufendes Verfahren prüfen — kein neuer Mail-Versand.
