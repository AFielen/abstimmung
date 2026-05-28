# Spec: Halbzeit-Erinnerung für ausstehende Stimmen

**Datum:** 2026-05-28
**Status:** Entwurf — Review ausstehend
**Scope:** rundlauf-app (drk-abstimmung)

---

## Problem

Bei einem laufenden Umlaufverfahren gibt es aktuell nur eine einzige
Benachrichtigung: die Beschluss-Einladung beim Eröffnen (bzw. beim Beitritt
für eingeladene Mitglieder). Wer danach nicht abstimmt, wird nie wieder
erinnert. Verfahren laufen mindestens 14 Tage (`MIN_FRIST_DAYS`) — in dieser
Zeit geht die erste Mail leicht unter, und Verfahren verfehlen das pro-TOP-
Quorum, weil Mitglieder schlicht vergessen abzustimmen.

Zwei Gruppen bleiben übrig:

1. **Aktive Mitglieder**, die beigetreten sind, aber (noch) nicht zu allen
   TOPs abgestimmt haben.
2. **Eingeladene Mitglieder** (`memberships.status = 'invited'`), die ihren
   KV-Einladungslink nie geklickt haben. Deren Magic-Token (TTL 7 Tage) ist
   zur Halbzeit (frühestens Tag 7) meist schon abgelaufen — sie können gar
   nicht mehr beitreten, ohne dass jemand manuell nachfasst.

## Ziel

Nach der **Hälfte der Laufzeit** eines laufenden Verfahrens erhalten alle
Stimmberechtigten, die noch nicht vollständig abgestimmt haben, **eine**
Erinnerung — passend zu ihrem Status:

1. **Aktives Mitglied, unvollständig abgestimmt** → Erinnerungs-Mail mit Link
   zum Verfahren und Hinweis auf die Frist.
2. **Eingeladenes Mitglied (noch nicht beigetreten)** → erneute Einladungs-Mail
   mit **frischem** Magic-Link (neuer 7-Tage-Token), damit der Beitritt noch
   möglich ist. Nach dem Beitritt greift wie bisher der bestehende
   Pending-Invite-Hook und schickt die eigentliche Beschluss-Einladung.

„Unvollständig abgestimmt" = hat **nicht zu allen TOPs** des Verfahrens eine
Stimme abgegeben (zielt auf das pro-TOP-Quorum; wer TOP 1, aber nicht TOP 2
erledigt hat, wird erinnert).

## Nicht-Ziel

- **Keine zweite/dritte Erinnerung.** Genau eine Erinnerung pro Stimmberechtigtem
  und Verfahren (zur Halbzeit). Keine zusätzliche „Last-Minute"-Mail kurz vor
  Frist.
- **Kein Auto-Close.** Diese Spec ändert nichts daran, dass Verfahren in der DB
  auf `status = 'laufend'` bleiben, bis ein Admin sie abschließt. Wir filtern
  defensiv auf `now < fristEnde`.
- **Keine Admin-Konfiguration / Opt-out.** Die Halbzeit-Erinnerung ist für jedes
  laufende Verfahren aktiv.
- **Kein Bounce-/Zustell-Tracking** über das hinaus, was Mailjet bereits liefert.

## Schlüssel-Befunde aus dem Code

- Verfahren werden **nicht automatisch geschlossen**: `finalizeResolution`
  läuft nur über die manuelle Admin-Aktion. „Abgelaufen" wird in der UI per
  `isPastDeadline(fristEnde)` berechnet, der DB-Status bleibt `laufend`.
  → Der Cron muss `status = 'laufend'` **und** `now < fristEnde` prüfen.
- Mindestlaufzeit 14 Tage → Halbzeit ≥ Tag 7. Da Magic-Token-TTL = 7 Tage,
  ist ein erneuter Einladungsversand zur Halbzeit auch technisch sinnvoll.
- Abgestimmt wird **pro TOP** (`votes`, unique auf `(agendaItemId, userId)`).
  „Vollständig" = `count(distinct votes für die TOPs des Verfahrens) == topCount`.
- `eligibleVoters` ist der Snapshot der Stimmberechtigten pro Verfahren
  (`userId`, `emailSnapshot`, `nameSnapshot`, `inviteEmailSentAt`).
- Bestehendes Muster für periodische Jobs: `lib/cron/retention.ts` + ein
  eigener Compose-Container `rundlauf-retention` (täglich `sleep 86400`,
  Healthcheck über Touch-Marker).
- Wiederverwendbar: `createMagicToken` (`lib/auth/magic`), `sendInviteLink`
  und `sendResolutionInvite` (`lib/mail/templates`), `logAudit` (`lib/audit`).

## Architektur

Ein neuer **täglicher Cron-Job** `lib/cron/reminders.ts`, ausgeführt in einem
eigenen Compose-Container `rundlauf-reminders` (Spiegel von `rundlauf-retention`).
Tägliche Granularität ist ausreichend: Die Erinnerung feuert innerhalb von
0–24 h nach dem exakten Halbzeit-Zeitpunkt, bei ≥ 7 Tagen Restpuffer unkritisch.

Die fachliche Logik wird in zwei Schichten getrennt:

- **`lib/reminders.ts` (pure, testbar):** `isPastHalftime(startedAt, fristEnde, now)`
  und die Einstufung eines Stimmberechtigten in `"skip" | "vote_reminder" |
  "invite_reminder"` anhand von Membership-Status und Stimmenzahl. Keine
  DB-/Mail-Seiteneffekte.
- **`lib/cron/reminders.ts` (orchestrierend):** Lädt Kandidaten aus der DB,
  ruft die pure Logik, versendet Mails, setzt Marker, schreibt Audit-Log.

### Idempotenz-Marker

Neue Spalte `eligible_voters.reminder_email_sent_at TIMESTAMPTZ` (nullable,
Default `NULL`). Pro Stimmberechtigtem und Verfahren wird der Marker **nur bei
erfolgreichem Versand** gesetzt.

Begründung für **pro-Stimmberechtigtem** statt pro-Verfahren (analog zum
bestehenden `inviteEmailSentAt`):

- Transiente Mailjet-Fehler werden am nächsten Tag automatisch erneut versucht
  (solange das Verfahren noch `laufend` und vor Frist ist).
- Wer vor der Halbzeit vollständig abstimmt, wird nie selektiert → kein Marker,
  keine Mail.
- Wer nach der Erinnerung abstimmt, bekommt dank gesetztem Marker **keine**
  zweite Mail.

**Kein Backfill** (Entscheidung „rückwirkend erinnern"): Die Spalte startet
überall `NULL`. Beim ersten Cron-Lauf werden daher auch bereits laufende
Verfahren, die schon über der Halbzeit sind, einmalig erinnert — sofern noch
vor Frist und unvollständig abgestimmt.

## Datenfluss (ein Cron-Lauf)

```
1. SELECT Verfahren WHERE status = 'laufend'
                      AND startedAt IS NOT NULL
                      AND now() < fristEnde
2. Pro Verfahren:
   a. halftime = startedAt + (fristEnde - startedAt) / 2
      → wenn now() < halftime: überspringen
   b. tops = agenda_items des Verfahrens; topCount = |tops|
   c. Kandidaten = eligible_voters[resolutionId]
        JOIN memberships (tenantId, userId)
        WHERE reminder_email_sent_at IS NULL
   d. votesPerUser = count(distinct agendaItemId) je userId über tops
   e. Pro Kandidat → Einstufung (pure):
        - membership removed / nicht vorhanden  → "skip"
        - votesPerUser >= topCount               → "skip" (vollständig)
        - membership active                      → "vote_reminder"
        - membership invited                     → "invite_reminder"
3. invite_reminder über alle Verfahren hinweg je (tenantId, userId)
   deduplizieren → genau eine frische Einladungs-Mail pro wartender Person.
4. Versand:
     vote_reminder   → sendVoteReminder(...)  (Link zum Verfahren)
     invite_reminder → createMagicToken(purpose=invite, 7d) + sendInviteReminder(...)
   Bei Erfolg: reminder_email_sent_at = now() für alle betroffenen
   eligible_voters-Zeilen der Person (bei invite_reminder ggf. mehrere).
5. logAudit pro Versand.
```

### Warum invite_reminder dedupliziert wird

Der Einladungslink ist **KV-weit**, nicht verfahrensspezifisch. Ist eine noch
nicht beigetretene Person in mehreren laufenden Verfahren stimmberechtigt, soll
sie **einen** frischen Link bekommen, nicht mehrere identische Mails. Der Marker
wird trotzdem für all ihre `eligible_voters`-Zeilen gesetzt, damit kein Verfahren
sie erneut anstößt. Beim späteren Beitritt verschickt der bestehende
Pending-Invite-Hook die eigentlichen Beschluss-Einladungen.

## Schema-Änderung

`lib/db/schema.ts` — `eligibleVoters` um ein Feld erweitern:

```ts
reminderEmailSentAt: timestamp("reminder_email_sent_at", { withTimezone: true }),
```

Migration `0004_eligible_voter_reminder_sent` über `drizzle-kit generate`
(aktualisiert `meta/_journal.json` + Snapshot). Erwartetes SQL:

```sql
ALTER TABLE "eligible_voters" ADD COLUMN "reminder_email_sent_at" timestamp with time zone;
```

Kein `UPDATE`-Backfill (siehe „rückwirkend erinnern").

## Code-Änderungen im Überblick

| Datei | Änderung |
|---|---|
| `lib/db/schema.ts` | Spalte `reminderEmailSentAt` in `eligibleVoters` |
| `lib/db/migrations/0004_*.sql` + `meta/*` | generierte Migration |
| `lib/reminders.ts` (neu) | pure Logik: `isPastHalftime`, Kandidaten-Einstufung |
| `lib/mail/templates.ts` | `sendVoteReminder`, `sendInviteReminder` |
| `lib/cron/reminders.ts` (neu) | Orchestrierung + Versand + Marker + Audit |
| `docker-compose.yml` (abstimmung-Repo) | Container `rundlauf-reminders` |

### Mail-Templates (Entwurf)

Beide nutzen den bestehenden `HTML_WRAPPER` und `sendMail`.

- **`sendVoteReminder`** — Betreff z. B. `Erinnerung: noch nicht abgestimmt –
  {Verfahren}`. Inhalt: freundlicher Hinweis, dass die Stimme noch aussteht,
  Frist, Button „Jetzt abstimmen" → `/{slug}/beschluss/{id}`.
- **`sendInviteReminder`** — Betreff z. B. `Erinnerung: Einladung zu {KV} noch
  offen`. Inhalt: Hinweis, dass eine Abstimmung wartet und die Einladung noch
  nicht angenommen wurde, Button „Einladung annehmen" → `/auth/magic/{token}`,
  Gültigkeit 7 Tage.

### Cron-Container (docker-compose.yml)

Analog zu `rundlauf-retention`, aber Skript `./lib/cron/reminders.ts`. Eigener
Touch-Marker (`/tmp/reminders.last-success`) für den Healthcheck. Build-Context
`./rundlauf-app`, `DATABASE_URL` + Mail-Env (`MAILJET_*`, `MAIL_FROM_*`) +
`APP_URL` (für die Links!).

> **Wichtig:** Der Retention-Container braucht keine Mail-Env, der
> Reminders-Container **schon** (`MAILJET_API_KEY/SECRET`, `MAIL_FROM_*`,
> `APP_URL`). Ohne `APP_URL` wirft `appUrl()` / der Link-Bau einen Fehler.

## Edge Cases

| Fall | Verhalten |
|---|---|
| Verfahren noch vor Halbzeit | `now < halftime` → übersprungen. |
| Frist abgelaufen, Status noch `laufend` (kein Auto-Close) | `now >= fristEnde` → übersprungen, keine „Erinnerung" nach Schluss. |
| Mitglied hat vollständig abgestimmt | `votesPerUser >= topCount` → kein Versand, kein Marker. |
| Mitglied hat nur einen Teil der TOPs | unvollständig → `vote_reminder`. |
| Eingeladenes Mitglied (nie beigetreten) | `invite_reminder` mit frischem Token; KV-weit dedupliziert. |
| Mitglied entfernt (`status = removed`) vor Beitritt | „skip", kein Versand. Marker bleibt `NULL` (harmlos). |
| Mitglied tritt erst nach Halbzeit bei | Beitritts-Hook schickt initiale Beschluss-Einladung. Der nächste Cron-Lauf würde es zusätzlich als `vote_reminder` selektieren. **Akzeptiert** (kleine, seltene Redundanz; alternativ später Guard „Einladung jünger als X" nachrüsten). |
| Person in mehreren laufenden Verfahren | aktiv: je Verfahren ein `vote_reminder`. eingeladen: **ein** `invite_reminder` (dedupliziert), Marker für alle Zeilen. |
| Mailjet wirft beim Versand | Marker bleibt `NULL` → nächster Tageslauf versucht erneut (solange `laufend` + vor Frist). Fehler wird geloggt, bricht den Lauf nicht ab. |
| `startedAt` ist `NULL` | übersprungen (kann bei `laufend` nicht auftreten, defensiv). |

## Security / Datenschutz

- Keine neuen PII-Felder. `reminder_email_sent_at` ist Verfahrens-Metadatum,
  kein personenbezogenes Tracking.
- Frischer Magic-Token nur für Personen, die ohnehin schon zum KV eingeladen
  wurden (re-issue, kein neuer Adresskreis).
- Audit-Events: `resolution.vote_reminder_sent` und
  `resolution.invite_reminder_sent`, `actorUserId = userId` der erinnerten
  Person (Aktion erfolgt im Namen des Stimmberechtigten, analog
  `resolution.invite_sent_on_join`).
- Keine Lockerung von Security-Headern, keine offenen Ports — der Cron-Container
  exponiert nichts (kein Webserver, Healthcheck via Touch-Marker).

## Testing

Konsistent mit dem Projektmuster (rundlauf-app hat aktuell keine
Test-Suite): **manuelle Tests** gegen den lokalen Dev-Stack. Die Datums- und
Einstufungslogik wird bewusst in `lib/reminders.ts` als **pure Funktionen**
isoliert, damit sie ohne DB/Mail testbar ist (optionale Unit-Tests, falls
später ein Test-Runner eingeführt wird).

Manuelle Testfälle:

1. Verfahren mit 2 TOPs, Frist so setzen, dass Halbzeit überschritten ist.
   - A (active) hat 0 Stimmen → `vote_reminder`.
   - B (active) hat 1 von 2 TOPs → `vote_reminder`.
   - C (active) hat 2 von 2 TOPs → keine Mail.
   - D (invited, nie beigetreten) → `invite_reminder` mit frischem Link.
   DB: `reminder_email_sent_at` bei A, B, D gesetzt; bei C `NULL`.
2. Cron erneut laufen lassen → keine zweite Mail (Marker gesetzt).
3. B stimmt zweiten TOP nach → bleibt ohne weitere Mail (Marker bereits gesetzt).
4. Verfahren vor Halbzeit → kein Versand.
5. Verfahren über Frist (aber Status `laufend`) → kein Versand.
6. D in zwei laufenden Verfahren über Halbzeit → genau **eine** Invite-Mail,
   Marker in beiden Verfahren gesetzt.

## Rollout

drk-abstimmung kann reale Nutzer haben — vorsichtig ausrollen:

1. Schema-Migration `0004` lokal testen (`drizzle-kit generate` → Apply).
2. Mail-Env für den neuen Container in `/srv/ops/.env` / Compose sicherstellen
   (`MAILJET_*`, `MAIL_FROM_*`, `APP_URL`).
3. Deploy (`docker compose up -d --build` zieht Migration via Entrypoint).
4. **Bewusst:** Erster Cron-Lauf erinnert auch bestehende laufende Verfahren
   über Halbzeit (rückwirkend, einmalig). Vor dem ersten Lauf laufende
   Verfahren sichten, falls eine Mail-Welle unerwünscht wäre.
5. Smoke: Logs des `rundlauf-reminders`-Containers prüfen
   (gesendete/übersprungene Zahlen), Healthcheck-Marker.

## Offene Punkte

- Guard „Mitglied gerade erst beigetreten" (gegen Doppel-Mail nach spätem
  Beitritt) bewusst vertagt — seltener Fall, geringe Auswirkung.
- Falls in der Praxis eine zweite Erinnerung kurz vor Frist gewünscht ist,
  später ein weiteres Marker-Feld/Schwellwert ergänzen.
