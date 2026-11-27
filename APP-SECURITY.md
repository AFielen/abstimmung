# APP-SECURITY.md — Vereinsabstimmung & Rundlaufbeschlüsse

App-Ebene des DRK-Sicherheitsstandards. Ergänzt `VPS-SECURITY.md` der Plattform
(`drk-ops-server2`), deren Abschnitt 8 („Contract zur App-Ebene“) hier erfüllt
wird. Gilt für beide Apps dieses Repos; der Schwerpunkt liegt auf der
Rundlauf-App, weil nur sie personenbezogene Daten verarbeitet.

| App | Verzeichnis | Domain | Container | Daten |
|---|---|---|---|---|
| Vereinsabstimmung (Live) | `next-app/`, `server/` | `drk-abstimmung.de`, `signal.drk-abstimmung.de` | `abstimmung`, `peerjs-signal` | keine Datenbank, keine Persistenz; anonyme Live-Abstimmung (Zero-Data) |
| Rundlaufbeschlüsse | `rundlauf-app/` | `rundlauf.drk-abstimmung.de` | `rundlauf`, `rundlauf-db`, `rundlauf-retention`, `rundlauf-reminders`, `rundlauf-auto-close`, `rundlauf-db-backup` | Postgres 16, personenbezogen |

Rechtlicher Rahmen der Rundlauf-App: digitale Umlaufbeschlüsse von Gremien
(Präsidium, Aufsichtsrat …) nach § 21 Abs. 6 i. V. m. § 22 Abs. 5 der Satzung
des DRK Kreisverbands StädteRegion Aachen e. V. Stimmen werden namentlich in
Textform abgegeben und sind **nicht anonym**; das Protokoll ist Nachweis des
Beschlusses.

---

## 1. Architektur und Datenfluss (Rundlauf)

```
Browser ──HTTPS──▶ Caddy (TLS, Security-Header, CSP, Rate-Limits, Body-Limit)
                     │  caddy-net
                     ▼
                  rundlauf:3000 (Next.js 16, non-root uid 1001)
                     │  rundlauf-int (nur intern)
                     ├──▶ rundlauf-db:5432 (Postgres 16)
                     │
   rundlauf-retention / -reminders / -auto-close / -db-backup ──▶ rundlauf-db
                     │
                     └──HTTPS──▶ api.mailjet.com (EU, transaktionale Mails)
```

- Einzige externe Datenverbindung: Mailjet Send API v3.1 (Sinch Mailjet SAS,
  Paris) für Magic-Links, Einladungen, Erinnerungen, Moderationsmails.
- Keine Fonts, CDNs, Analytics, Tracker, Cookies außer dem Session-Cookie.
- Volumes: `rundlauf-pgdata` (DB), `rundlauf-protokolle` (archivierte
  Protokoll-PDFs, `/data/protokolle/<kv>/<beschluss-id>.pdf`),
  `rundlauf-db-backups` (tägliche Dumps).
- Mandantenfähigkeit pfadbasiert (`/[kv]/…`); jede Abfrage ist auf
  `tenant_id` des angemeldeten Kontexts eingeschränkt (`lib/tenant.ts`,
  `belongsToTenant()`).

## 2. Personenbezogene Daten

| Datenkategorie | Tabelle | Zweck | Löschung / Anonymisierung |
|---|---|---|---|
| E-Mail, Name, letzter Login, Superadmin-Flag | `users` | Konto, Magic-Link | mit Mandant (`cascade`) bzw. manuell |
| Mitgliedschaft (Rolle, Status, eingeladen von) | `memberships` | Zugriff je Kreisverband | mit Mandant |
| Stimmberechtigten-Snapshot (Name, E-Mail, Rolle) | `eligible_voters` | Nachweis, wer stimmberechtigt war | nach `RETENTION_YEARS` (10 J.) → „anonymisiert“ |
| Stimme (Option, Zeitpunkte), IP-/User-Agent-Hash (SHA-256, 32 Hex) | `votes` | Beschlussnachweis, Missbrauchsabwehr | Hashes nach 10 J. → NULL |
| PDF-Anlagen (Inhalt in `bytea`, SHA-256) | `attachments` | Beschlussunterlagen | mit Beschluss (`cascade`) |
| Audit-Log (Akteur, Aktion, Payload, IP-Hash) | `audit_log` | Nachvollziehbarkeit aller schreibenden Aktionen | nach 10 J. gelöscht |
| Magic-Link-Token (nur SHA-256) | `magic_tokens` | passwortlose Anmeldung | 30 Tage nach Ablauf gelöscht |
| Protokoll-PDFs | Volume `rundlauf-protokolle` | Archiv des finalen Protokolls | manuell / mit Mandant |

- Retention läuft täglich (`rundlauf-retention`, `lib/cron/retention.ts`).
- Verantwortlicher, Rechtsgrundlage (Mitgliedschafts-/Satzungsverhältnis) und
  Betroffenenrechte stehen in `/datenschutz` (gemeinsame Erklärung beider
  Apps). **Vom DSB zu bestätigen:** AVV mit Hetzner und Mailjet, Einordnung
  der Rechtsgrundlage, Löschkonzept (siehe Abschnitt 10).
- Datenexport/-löschung (Art. 15/17 DSGVO) erfolgt heute durch den Betreiber
  per SQL; eine Self-Service-Funktion gibt es nicht (bewusst, kleiner
  Nutzerkreis).

## 3. Container-Härtung (`docker-compose.yml`)

- Image `node:22-alpine`, Multi-Stage, Prozess läuft als `nextjs` (uid 1001);
  `postgres:16-alpine` gepinnt; keine `latest`-Tags.
- Alle `rundlauf*`-Services: `cap_drop: [ALL]`, `security_opt:
  no-new-privileges:true`. Die DB behält nur `CHOWN, DAC_OVERRIDE, FOWNER,
  SETGID, SETUID` (initdb/su-exec des offiziellen Images).
- Keine `ports:`; die App ist nur über `caddy-net` erreichbar, DB und Cron
  nur im internen Netz `rundlauf-int`.
- `HEALTHCHECK` in Dockerfile (`/api/health`) bzw. Compose (Touch-Marker der
  Cron-Container, Alter < 25 h / < 1,5 h).
- Secrets ausschließlich über `.env` (chmod 600, nie im Image, nie im Repo);
  Pflicht-Variablen brechen den Start mit `:?`-Meldung ab. `SESSION_SECRET`
  ≥ 32 Zeichen wird zusätzlich im Code erzwungen.
- Logs nur auf stdout (Docker-Daemon rotiert: 10 MB × 3).
- `TZ=Europe/Berlin`: Fristen werden als deutsche Ortszeit interpretiert und
  angezeigt.
- Migrationen laufen im Entrypoint des App-Containers; Cron-Container warten
  auf dessen Healthcheck.

## 4. Proxy, Header, Rate-Limits (`/srv/ops/caddy/sites/drk-abstimmung.de.caddy`)

Plattform-Header (HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy,
COOP/CORP) über das Snippet `default_security_headers`. App-spezifisch:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
  connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  object-src 'none'
```

`'unsafe-inline'` für Skripte ist dem Next.js-Bootstrapping ohne Nonces
geschuldet (gleiche Entscheidung wie bei den übrigen Plattform-Apps).

| Limit | Ort | Wert |
|---|---|---|
| Basis pro IP | Caddy `baseline_rate_limits` | 100 req/s |
| Magic-Link-Anforderung pro IP | Caddy `login_rate_limit` auf `POST /login` **und** `POST /registrieren` | 10/min |
| Magic-Link-Anforderung pro Adresse | App (`app/login/actions.ts`) | 3 in 15 min, danach klare Fehlermeldung |
| Request-Body | Caddy `request_body max_size` | 25 MB |
| Server-Action-Body | `next.config.ts` | 3 MB |
| PDF-Anlagen | App | 20 MiB, max. 10 je Umlauf, nur `application/pdf` mit `%PDF`-Magic, Content-Length-Vorprüfung (413) |
| Mitglieder-Import | App | 2 MB, 500 Zeilen, E-Mail-Validierung je Zeile |
| Mailversand | App | max. 5 parallel, 15 s Timeout je Mailjet-Call |

## 5. Authentifizierung und Autorisierung

- **Magic-Link:** 32 Byte `randomBytes` (base64url), nur SHA-256 gespeichert,
  atomar einmalig einlösbar (`UPDATE … WHERE consumed_at IS NULL AND
  expires_at > now() RETURNING`), 60 min (Login/Registrierung) bzw. 7 Tage
  (Einladung). Ein neuer Login-Link macht ältere ungenutzte Links derselben
  Adresse unwirksam. Unbekannte Adressen erzeugen erst beim Einlösen einen
  `users`-Eintrag.
- **Session:** iron-session, Cookie `rundlauf_session` HttpOnly, Secure
  (Produktion), SameSite=lax, 30 Tage.
- **Rollen:** `owner`/`admin` (Verwaltung, Beschlüsse, Mitglieder, Anlagen,
  Protokolle), `member` (abstimmen, eigene Umläufe sehen). Rollen werden je
  Request frisch aus der DB geladen, nie aus Client-Eingaben.
- **Super-Admin:** ausschließlich über `SUPERADMIN_EMAILS` (Env ist Quelle der
  Wahrheit, bei jedem Request ausgewertet). Moderiert KV-Anträge und hat als
  **Notfallzugriff** Admin-Rechte in jedem Kreisverband (virtuelle Mitgliedschaft
  in `lib/tenant.ts`). Bewusste Entscheidung; alle Aktionen laufen mit seiner
  `actor_user_id` ins Audit-Log und sind über das Fehlen einer Mitgliedschaft
  erkennbar.
- **Mandanten-Scoping:** jede Server Action und Route prüft
  `belongsToTenant(row, ctx.tenant.id)`; fremde IDs → 404/„nicht gefunden“.
  Entwürfe sind für Nicht-Admins unsichtbar (404).
- **Protokoll-PDF** (enthält namentliche Einzelstimmen): nur nach Abschluss
  (`abgeschlossen`/`zurueckgezogen`) und nur für Admins oder Stimmberechtigte
  des Umlaufs; während des Verfahrens 409, Entwürfe 404.
- **Einladungen:** nur offene Einladungen (`status = invited`) werden durch den
  Link aktiviert; beim Entfernen eines Mitglieds werden dessen offene
  Einladungs-Token für den KV ungültig.
- **CSRF:** Server Actions durch den Origin-Check von Next.js, Route-Handler
  durch `SameSite=lax`; `X-Powered-By` deaktiviert.
- **Mails:** alle nutzergesteuerten Strings (Namen, KV-Name, Betreff,
  Ablehnungsgrund) werden im HTML-Teil escaped (`lib/html-escape.ts`).

## 6. Integrität des Beschlussverfahrens

- Stimmberechtigte werden beim Eröffnen als Snapshot eingefroren; spätere
  Mitgliederänderungen wirken nicht auf laufende Verfahren.
- Mindestfrist 14 Tage (`MIN_FRIST_DAYS`, § 21 Abs. 6 Satzung); Stimmabgabe
  nur bei `status = laufend` und vor Fristende; Modus `fest` serverseitig
  erzwungen.
- **Quorum** = Beteiligung inkl. Enthaltungen, **Mehrheit** nur über Ja/Nein;
  einfache Mehrheit > 50 %, 2/3 ≥ 66,67 %, 3/4 ≥ 75 %. Vergleiche erfolgen
  ganzzahlig (`lib/resolution.ts`, Tests in `lib/resolution.test.ts`), damit
  ein exakt erreichtes Quorum nicht an Gleitkomma-Rundung scheitert.
- **Abschluss** (`lib/finalize.ts`) ist eine Transaktion mit bedingtem
  Statuswechsel aus `laufend`; parallele Stimmen halten `FOR SHARE` auf der
  Beschlusszeile und sind entweder gezählt oder werden abgewiesen. Auto-Close
  läuft stündlich; manueller Abschluss/Rückzug nur aus `laufend`.
- Ergebnis-Snapshot je TOP in `agenda_items.ergebnis`; Protokoll-PDF wird bei
  Abschluss archiviert.
- Audit-Log für alle schreibenden Aktionen (Mandant, Struktur, Mitglieder,
  Beschlüsse, Anlagen, Stimmen, Moderation, Cron-Abschlüsse, Retention).

## 7. Backups, RTO/RPO, Restore

| | |
|---|---|
| DB-Dump | täglich `pg_dump --format=custom` durch `rundlauf-db-backup` nach `rundlauf-db-backups` (`/var/lib/postgresql/backups/`), 14 Tage lokal |
| Off-site | Plattform-Backup (`/srv/ops/backup/backup.sh`, age-verschlüsselt, Storage Box) sichert alle Volumes inkl. Dumps und Protokolle; Hetzner-Server-Backups zusätzlich |
| RPO | 24 h (Dump-Intervall) |
| RTO | ca. 1 h: Compose-Stack aus Repo hochfahren, Volume aus Plattform-Backup einspielen oder `pg_restore` des letzten Dumps |
| Restore-Test | vierteljährlich (Plattform §6.4), dokumentiert im Runbook |

```bash
cd /root/abstimmung
docker compose stop rundlauf rundlauf-retention rundlauf-reminders rundlauf-auto-close
docker exec rundlauf-db-backup pg_restore --clean --if-exists -d rundlauf \
  /var/lib/postgresql/backups/rundlauf-<Zeitstempel>.dump
docker compose start rundlauf rundlauf-retention rundlauf-reminders rundlauf-auto-close
```

## 8. Logging, Monitoring, Incident Response

- App-Logs auf stdout (`docker logs rundlauf`); Cron-Container protokollieren
  jeden Lauf (`[auto-close] Fällig: n, geschlossen: m`).
- Bekanntes Rauschen: `Failed to find Server Action "x"` stammt von
  Bot-Scans mit gefälschtem `Next-Action`-Header und ist harmlos.
- Container-Health über Docker-Healthchecks; externes Uptime-Monitoring der
  öffentlichen URL ist Plattform-Aufgabe (siehe Runbook, offener Punkt).
- Vorfall: Runbook `/srv/ops/docs/runbook.md` (Eindämmen → Beweise sichern →
  Bewerten → Melden). Bei Zugriff auf Stimm- oder Mitgliederdaten läuft die
  72-h-Frist nach Art. 33 DSGVO; DSB informieren.
- Abhängigkeiten: täglicher automatischer `npm audit`-Check (GitHub-Issues
  „[Security check]“) plus CI (`.github/workflows/ci.yml`).

## 9. Entwicklungsregeln

- Jede neue Server Action / Route: zod-Validierung, `requireTenantContext` /
  `requireAdmin`, `belongsToTenant`, `logAudit` bei Schreibzugriff.
- Nutzerstrings in HTML-Mails nur über `escapeHtml()`; im UI nur über React
  (kein `dangerouslySetInnerHTML` außer dem DOMPurify-gefilterten Markdown).
- Neue Env-Variablen in `.env.example` dokumentieren und in Compose mit `:?`
  absichern, wenn sie Pflicht sind.
- Vor dem Deploy: `npm run lint`, `npx tsc --noEmit`, `npm test`,
  `npm audit --omit=dev`, Docker-Build.

## 10. Go-Live-Checkliste Rundlauf

- [x] Abhängigkeiten ohne bekannte Critical/High-CVEs (`npm audit --omit=dev` = 0)
- [x] Container non-root, `cap_drop: [ALL]`, `no-new-privileges`, keine Host-Ports
- [x] Pflicht-Secrets ohne Default, Fail-Fast
- [x] CSP und Rate-Limits in Caddy, Body-Limit, Login-Limit auch auf `/registrieren`
- [x] Tägliches `pg_dump` in von der Plattform gesichertes Volume, Restore geprobt
- [x] Protokoll-Archiv beschreibbar (Volume-Owner), Zeitzone Europe/Berlin
- [x] Security-Review: Protokoll-Zugriff, Mail-Escaping, Einladungs-Reaktivierung, Magic-Link-Drosselung, Quorum-Arithmetik, atomarer Abschluss
- [x] Unit-Tests (`npm test`) und CI auf PRs
- [x] Deploy auf den Produktiv-VPS (2026-11-27, Stand `fea6258`) und Post-Deploy-Check: `/api/health` 200, erster Dump im Backup-Volume (13 Tabellen, `pg_restore --list` ok), Protokoll-Archiv beschreibbar (uid 1001), alle sechs Container healthy mit `cap_drop: [ALL]`, Cron-Erstläufe sauber
- [ ] Plattform: Off-site-Backup-Credentials in `/srv/ops/.env`, erster Restore-Test – **zurückgestellt** (Entscheidung Plattform-Owner 2026-11-27); bis dahin: Hetzner-Server-Backups plus tägliche lokale Dumps im Volume `rundlauf-db-backups`
- [ ] Plattform: externes Uptime-Monitoring für `rundlauf.drk-abstimmung.de` – **zurückgestellt** (Entscheidung Plattform-Owner 2026-11-27); bis dahin: Docker-Healthchecks, `health-check.sh` beim Login, Ping-Hook im Backup-Sidecar vorbereitet (`RUNDLAUF_BACKUP_PING_URL`)
- [x] DSB: AVV Hetzner/Mailjet bestätigt (Plattform-Owner, 2026-11-27); `/datenschutz` geprüft; Kontakt im Runbook nachtragen
- [x] Fachlich: Satzungsgrundlage (§ 21 Abs. 6, § 22 Abs. 5) mit Präsidium bestätigt (2026-11-27); Quorum-/Mehrheitsvorgaben je Gremium in der App gepflegt

*Stand: 2026-11-27, nach Produktiv-Deploy und Abnahme durch den Plattform-Owner. Zwei Plattform-Punkte bewusst zurückgestellt (siehe Checkliste und `rundlauf-app/SECURITY-AUDIT.md`, „Akzeptierte Restrisiken“).*
