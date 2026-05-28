# Spec & Plan: rundlauf-db Netz-Isolierung

**Datum:** 2026-05-28
**Status:** Genehmigt — Umsetzung
**Scope:** abstimmung (Repo-Root `docker-compose.yml`)
**Standard:** `/srv/ops/VPS-SECURITY.md` §4.1

---

## Problem

`rundlauf-db` hängt aktuell sowohl am internen Netz `abstimmung_rundlauf-int`
als auch am geteilten Proxy-Netz `caddy-net` (per `docker inspect` bestätigt).
Damit ist die Datenbank für **jeden** Container am `caddy-net` lateral
erreichbar (Port 5432) — ein Verstoß gegen VPS-SECURITY.md §4.1:

> „Eigenes internes Netz pro App für DB … — **nicht im Proxy-Netz**."

Die beiden anderen DB-Apps erfüllen den Standard bereits:
- `nis2-manager-db-1` → nur `nis2-manager_internal`
- `spendenquittung-db` → nur `spendenquittung_sq-internal`

`rundlauf-db` ist der einzige Ausreißer.

**Schweregrad:** Defense-in-Depth (laterale Container-Erreichbarkeit), **keine**
Internet-Exposition — die DB hat keine `ports:`-Host-Bindung, UFW erlaubt nur
22/80/443. Trotzdem Standard-Verstoß und inkonsistent zu den anderen Apps.

## Ursache

Das Base-`docker-compose.yml` legt **alle** rundlauf-Services auf `caddy-net`.
Die DB-Isolierung existiert nur in der untracked `docker-compose.override.yml`,
die `rundlauf-int` aber lediglich **additiv** ergänzt. Docker Compose merged
Service-`networks`-Listen (Vereinigung) statt sie zu ersetzen → `caddy-net`
bleibt an der DB hängen. Die beabsichtigte Isolierung greift also nie.

Zum Vergleich erfüllt `spendenquittung/docker-compose.yml` den Standard direkt
im Base-File (DB nur auf `sq-internal`, App auf `caddy-net` + `sq-internal`,
kein Override nötig).

## Lösung (Ansatz A: Base-Compose fixen)

Das Base-`docker-compose.yml` an das spendenquittung-Muster angleichen und die
ineffektive Override-Datei entfernen.

### Änderungen in `docker-compose.yml`

| Service | vorher | nachher |
|---|---|---|
| `rundlauf` | `[caddy-net]` | `[caddy-net, rundlauf-int]` |
| `rundlauf-db` | `[caddy-net]` | `[rundlauf-int]` |
| `rundlauf-retention` | `[caddy-net]` | `[rundlauf-int]` |
| `rundlauf-reminders` | `[caddy-net]` | `[rundlauf-int]` |

Im `networks:`-Block ergänzen:
```yaml
networks:
  caddy-net:
    external: true
  rundlauf-int:
    driver: bridge
```

### Datei löschen

`docker-compose.override.yml` (untracked, lokal) — wird redundant, da die
Isolierung jetzt deklarativ im Base-File steht.

### Begründung der Netz-Zuordnung

- `rundlauf` braucht `caddy-net` (Caddy proxiert `rundlauf:3000`) **und**
  `rundlauf-int` (DB-Zugriff).
- `rundlauf-db` braucht nur `rundlauf-int`.
- `rundlauf-retention` braucht nur DB → `rundlauf-int`.
- `rundlauf-reminders` braucht DB (`rundlauf-int`) und Outbound zu Mailjet —
  Outbound funktioniert über NAT des Bridge-Netzes, `caddy-net` ist dafür nicht
  nötig.
- Dev-Profile-Services (`*-dev`) haben kein `networks:` (Host-Ports + Default-Netz)
  und sind nicht betroffen — bleiben unverändert.

## Wichtige Eigenschaften / Risiken

- **Kein Datenverlust:** Das interne Netz heißt weiterhin
  `abstimmung_rundlauf-int` (Projekt-Prefix unverändert) und wird wiederverwendet.
  Volume `rundlauf-pgdata` bleibt unberührt.
- **Kurze Downtime:** `docker compose up -d` erzeugt `rundlauf-db`, `rundlauf`,
  `rundlauf-retention`, `rundlauf-reminders` neu (Netz-Änderung) → wenige
  Sekunden Unterbrechung der Abstimmungs-App. Laufende Voter laden ggf. neu.
- **Mailjet:** `rundlauf-reminders` erreicht Mailjet weiterhin über Outbound-NAT
  des internen Netzes — wird nach dem Deploy verifiziert.

## Umsetzungs-Schritte (Plan)

1. Branch `fix/rundlauf-db-netzisolierung` (erledigt).
2. `docker-compose.yml` gemäß Tabelle ändern + `rundlauf-int` im networks-Block.
3. `git rm`/`rm` der `docker-compose.override.yml` (untracked → einfaches `rm`).
4. `docker compose config >/dev/null` validieren; prüfen, dass `rundlauf-db`
   im gemergten Config **nur** `rundlauf-int` hat und `rundlauf` beide Netze.
5. Commit.
6. **Deploy:** `docker compose up -d` (recreate db/rundlauf/retention/reminders).
7. **Verifikation:**
   - `docker inspect rundlauf-db` → nur `abstimmung_rundlauf-int`.
   - `docker inspect rundlauf` → `caddy-net` + `abstimmung_rundlauf-int`.
   - App über Caddy erreichbar (`/api/health` 200 von außen bzw. Container healthy).
   - `rundlauf-reminders` erreicht DB (Cron-Lauf 0/0 ohne Fehler) und Mailjet
     (Outbound-Konnektivitätscheck).
   - Gegenprobe: kein anderer caddy-net-Container erreicht mehr `rundlauf-db:5432`.
8. Push + PR.

## Rollback

`git revert <commit>` + `docker compose up -d`. (Die Override-Datei muss bei
einem echten Rollback nicht wiederhergestellt werden, da der Stand davor durch
das Base-File definiert ist.)

## Verifikations-Kriterien (Done)

- `rundlauf-db` und `rundlauf-reminders`/`retention` nicht mehr auf `caddy-net`.
- Abstimmungs-App funktioniert (Login/Health), reminders-Cron läuft fehlerfrei.
- Konsistent mit `nis2-manager` / `spendenquittung`.
