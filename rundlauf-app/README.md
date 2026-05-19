# DRK Rundlaufbeschlüsse

Mandantenfähige Webanwendung für digitale Umlaufbeschlüsse von DRK-Präsidien
nach § 21 Abs. 6 i.V.m. § 22 Abs. 5 der Satzung.

## Stack

- Next.js 16 (App Router) + React 19
- Postgres 16 + Drizzle ORM
- iron-session (Magic-Link-Auth, passwortlos)
- Mailjet Send API v3.1
- jsPDF für Protokolle

## Lokale Entwicklung

```bash
# Repo-Root: .env aus .env.example erstellen und Werte setzen
cp ../.env.example ../.env
# - SESSION_SECRET (≥ 32 Zeichen, `openssl rand -base64 48`)
# - MAILJET_API_KEY / MAILJET_API_SECRET
# - SUPERADMIN_EMAILS (kommasepariert)

# Container hochfahren
docker compose --profile dev up -d --build

# Logs
docker compose logs -f rundlauf-dev rundlauf-db-dev

# Öffne http://localhost:3001
```

Alternativ ohne Docker (lokales Postgres erforderlich):

```bash
npm install
# DATABASE_URL etc. setzen
npm run db:migrate
npm run dev
```

## Drizzle

- Schema: `lib/db/schema.ts`
- Migrations: `lib/db/migrations/`
- Bei Schema-Änderungen: `npm run db:generate` → erzeugt nächste Migration

## Retention

Der `rundlauf-retention`-Container läuft täglich und anonymisiert
Beschlüsse, deren `abgeschlossen_am` älter als `RETENTION_YEARS` (Standard 10)
ist:

- `eligible_voters.name_snapshot` / `email_snapshot` → "anonymisiert"
- `votes.ip_hash` / `user_agent_hash` → NULL
- Magic-Tokens älter als 30 Tage → gelöscht
- Audit-Log älter als `RETENTION_YEARS` → gelöscht

## Architektur-Anmerkungen

- **Mandantenfähigkeit**: pfadbasiert via `/[kv]/...`
- **Auth**: passwortlos via Magic-Link (60 min TTL für Login, 7 Tage für Invite)
- **Stimmberechtigung**: Snapshot zum Erstellzeitpunkt des Beschlusses
  (`eligible_voters`-Tabelle). Spätere Mitgliederänderungen beeinflussen
  laufende Beschlüsse nicht.
- **Stimm-Modus**: pro Beschluss `aenderbar` (default, letzte Stimme zählt)
  oder `fest` (unwiderrufliche einmalige Abgabe).
- **Quorum**: konfigurierbar (Standard 75 % gemäß Satzung).
- **Mehrheit**: einfach (> 50 %), 2/3 (≥ 66,67 %), 3/4 (≥ 75 %).
  „Enthaltung" zählt fürs Quorum, nicht für die Mehrheit.
