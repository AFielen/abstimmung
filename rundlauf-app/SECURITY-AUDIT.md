# SECURITY-AUDIT.md — Rundlauf-App

Ergebnis der Produktionsreife-Prüfung vom 2026-11-27 (Methodik nach
`SECURITY.md` des drk-app-template: Befund, Schweregrad, Status, bewusste
Entscheidungen). Grundlage: unabhängiges Code-Review aller Server Actions,
Route-Handler, `lib/**`, Migrationen, Dockerfile/Compose und der Caddy-Site;
`npm audit`; isolierter Browser-Smoke-Test gegen das Produktions-Image.

Schweregrade: **Kritisch** · **Hoch** · **Mittel** · **Niedrig** · Info.

## Befunde

| ID | Befund | Schwere | Status | Maßnahme / Begründung |
|---|---|---|---|---|
| D1 | 13 offene Dependency-Advisories (Next 16.1.6 RCE, zod DoS, drizzle SQL-Escaping, tiptap/prosemirror XSS, dompurify Bypass, xmldom, undici, shell-quote) | Kritisch | behoben | PR #52 (`rundlauf-app`), PR #51 (`next-app`, `server`); `npm audit --omit=dev` = 0 in allen drei Paketen |
| P1 | Protokoll-Archiv nie beschrieben: Volume-Mountpoint root-owned, `persistProtokoll()` scheiterte in Produktion mit `EACCES` (7× im Log) | Hoch | behoben | Dockerfile legt `/data/protokolle` mit App-User an (PR #52); Volume einmalig neu anlegen (Deploy-Hinweis) |
| H1 | Protokoll-PDF mit namentlichen Einzelstimmen für jedes aktive Mitglied abrufbar, auch bei laufenden Verfahren und Entwürfen | Hoch | behoben | PDF nur bei `abgeschlossen`/`zurueckgezogen` (sonst 409), nur Admin oder Stimmberechtigte (403), Entwürfe 404 (PR #54) |
| M1 | HTML-Injection in allen HTML-Mails (Name, KV-Name, Betreff, Ablehnungsgrund unescaped) | Mittel | behoben | `lib/html-escape.ts`, alle Interpolationen in `lib/mail/templates.ts` escaped (PR #54) |
| M2 | Entferntes Mitglied konnte sich mit noch gültigem Einladungslink reaktivieren | Mittel | behoben | Aktivierung nur aus `status = invited`; `removeMember` invalidiert offene Invite-Token (PR #54) |
| M3 | Magic-Link-Anforderung praktisch unlimitiert (Caddy-Limit nur auf `POST /login`), jede unbekannte Adresse legte sofort einen `users`-Eintrag an | Mittel | behoben | App-Drossel 3 Links / 15 min je Adresse, `users`-Eintrag erst beim Einlösen, Caddy-Limit zusätzlich auf `POST /registrieren` (PR #54, Ops-Repo) |
| M4 | Super-Admin hat volle Admin-Rechte in jedem KV (virtuelle Mitgliedschaft) | Mittel | akzeptiert | Gewollter Notfallzugriff (`.env.example`); Aktionen laufen mit `actor_user_id` ins Audit-Log; dokumentiert in `APP-SECURITY.md` §5 |
| N1 | Quorum-Vergleich mit Gleitkomma: exakt erreichtes Quorum (29/50 bei 58 %) galt als verfehlt | Niedrig (rechtlich relevant) | behoben | ganzzahlige Vergleiche für Quorum und Mehrheiten, `lib/resolution.test.ts` (PR #54) |
| N2 | Fristen in UTC interpretiert und angezeigt: „18:00“ endete real um 19:00/20:00 | Niedrig (rechtlich relevant) | behoben | `TZ=Europe/Berlin` auf allen Rundlauf-Services (PR #53) |
| N3 | Audit-Lücken (`unarchiveBody`, `updateResolutionMeta`); Audit erst nach Mailversand, bei Mailjet-Fehler kein Eintrag | Niedrig | behoben | Audit ergänzt; Audit vor Versand; Moderationsmails fehlertolerant (PR #54) |
| N4 | Reservierte Slugs (`admin`, `login`, `api` …) nicht gesperrt → KV unerreichbar | Niedrig | behoben | `RESERVED_SLUGS`-Refine (PR #54) |
| N5 | Doppel-Vote-Race → unbehandelte Unique-Violation (HTTP 500 statt Meldung) | Niedrig | behoben | `isUniqueViolation()` → verständliche Meldung (PR #54) |
| N6 | Upload-Body vollständig gepuffert vor Größenprüfung; kein Body-Limit am Proxy | Niedrig | behoben | Content-Length-Vorprüfung (413); Caddy `request_body max_size 25MB` (PR #54, Ops-Repo) |
| N7 | Super-Admin-Flag nur beim Login aus Env synchronisiert (Entzug wirkt erst nach 30 Tagen) | Niedrig | behoben | `getCurrentUser()` leitet das Flag bei jedem Request aus `SUPERADMIN_EMAILS` ab (PR #54) |
| N8 | Unbegrenzte KV-Anträge pro Nutzer → Mail-Flut an Super-Admins | Niedrig | behoben | höchstens ein offener Antrag je Nutzer (PR #54) |
| N9 | KV-Admin setzt `users.name` fremder Nutzer, falls noch leer | Niedrig | akzeptiert | nur Erstbefüllung eines leeren Namens aus Import/Einladung; Komfortfunktion, kein Überschreiben |
| N10 | Eröffnung mailt unbegrenzt parallel; Mailjet-`fetch` ohne Timeout | Niedrig | behoben | `mapWithConcurrency(…, 5)`, `AbortSignal.timeout(15 s)` (PR #54) |
| N11 | Abschluss nicht atomar (Race mit Rückzug/Stimme zwischen Zählung und Statuswechsel) | Niedrig | behoben | Transaktion mit bedingtem Claim aus `laufend`; `submitVote` in Transaktion mit `FOR SHARE`; Rückzug bedingt (PR #54) |
| I1 | Mitglieder-Import erlaubt 2 MB, Server-Action-Body-Limit 1 MB | Info | behoben | `experimental.serverActions.bodySizeLimit = 3mb` (PR #54) |
| I2 | Vorzeitiger Abschluss durch Admin trotz offener Stimmen möglich | Info | akzeptiert | Design (Admin-Entscheidung, auditiert); Satzungsfrist bleibt Mindestfrist beim Anlegen |
| I3 | Aggregierte Zwischenergebnisse für Mitglieder sichtbar | Info | akzeptiert | Design; namentliche Stimmen bleiben bis Abschluss verborgen (H1) |
| I4 | KV-Slug-Enumeration (404 vs. Redirect) | Info | akzeptiert | Slugs sind nicht geheim |
| I5 | `GET /logout` ohne CSRF-Schutz | Info | akzeptiert | Logout-CSRF ohne Schaden |
| C1 | Compose ohne `cap_drop`/`no-new-privileges`, DB-Passwort-Fallback `rundlauf`, kein DB-Dump, Cron-Container starten vor Migrationen | Mittel | behoben | PR #53: Härtung, Fail-Fast-Secrets, `rundlauf-db-backup`, `depends_on` |

## Als korrekt geprüft (Auszug)

Tenant-Scoping jeder Action/Route (`belongsToTenant`), Owner-Schutz,
Import vergibt nie `owner`, Anlagen nur PDF (Magic-Bytes, 20 MiB, 10 Stück),
Dateinamen bereinigt, Magic-Link-Token 32 Byte/SHA-256/Single-Use atomar,
Session-Cookie HttpOnly/Secure/SameSite, Fail-Fast für `SESSION_SECRET`,
DOMPurify-Whitelist für Markdown-Rendering, Cron-Idempotenz, `/api/health`
ohne Informationsabfluss, keine Account-Enumeration über Login-Antworten.

## Verifikation

- `npx tsc --noEmit`, `npm run lint`, `npm test` (6 Testdateien) grün.
- Produktions-Image gebaut; Smoke-Test im isolierten Compose-Stack
  (gehärtete Konfiguration aus PR #53, frische DB): Login, Abstimmen/Ändern,
  Rechte, Anlagen, PDF-Regeln (409/404/200), Editor, Drosselung (4. Anfrage),
  Reaktivierungsschutz, vorzeitiger Abschluss per UI, Cron-Skripte,
  Dump + Restore.

*Nächste Prüfung: nach dem Produktiv-Deploy (Post-Deploy-Checks in
`APP-SECURITY.md` §10) und turnusmäßig quartalsweise (VPS-SECURITY §10).*
