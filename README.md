# DRK Vereinsabstimmung

**Digitales Abstimmungssystem fuer Vereinsversammlungen des Deutschen Roten Kreuzes.**

Open Source - Kostenlos - Keine Datenspeicherung - DSGVO-konform

---

## Was ist das?

Ein digitales Abstimmungssystem fuer Vereinsversammlungen. Ermoeglicht geheime Abstimmungen per QR-Code direkt vom Smartphone -- ohne Installation, vollstaendig DSGVO-konform.

Dieses Tool digitalisiert den Abstimmungsprozess bei Mitgliederversammlungen -- **direkt per QR-Code vom Smartphone oder ueber bereitgestellte Stimmkarten-Geraete.**

## Live-Demo

Gehostet auf GitHub Pages: **https://afielen.github.io/drk/index.html**

## Funktionsweise

1. **Versammlungsleiter** oeffnet die App auf dem Laptop/Beamer und startet eine Versammlung
2. Ein **QR-Code** wird auf der Leinwand angezeigt
3. **Mitglieder** scannen den QR-Code mit dem Smartphone und stimmen anonym ab
4. Die **Ergebnisse** werden in Echtzeit auf dem Beamer angezeigt

## Features

### Web-App
- **Vollstaendig anonyme Abstimmung** -- es werden keinerlei persoenliche Daten erhoben oder gespeichert
- **Ja / Nein / Enthaltung** oder frei definierbare Optionen
- **Echtzeit-Ergebnisse** mit Live-Balkendiagrammen
- **Konfigurierbares Zeitlimit** -- einstellbar pro Versammlung, pro Abstimmung ein-/ausschaltbar
- **Drei Abstimmungsmodi** -- Offener Modus (P2P), Stimmkarten-Modus (P2P) und Server-Modus (WebSocket-Relay)
- **Eigener Signaling-Server** -- kein 50-Personen-Limit mehr, keine Abhaengigkeit von PeerJS Cloud
- **Doppelabstimmungs-Schutz** -- mehrstufig (Browser-Fingerprinting, localStorage, Presenter-Pruefung)
- **PDF-Protokoll-Export** -- professionell gestaltetes Protokoll mit DRK-Branding und Seitenzahlen (jsPDF)
- **Automatische Reconnect-Logik** -- Exponential Backoff, bis zu 5 Versuche
- **Heartbeat/Keep-Alive** -- kontinuierliche Verbindungsueberwachung
- **Tab-Schutz** -- Warnung beim versehentlichen Schliessen des Browsers
- **Danke-Seite** -- nach Versammlungsende mit Statistik-Uebersicht
- **Hilfe-Seite** -- integrierte Anleitung mit FAQ, Sicherheitsinfos und KI-Agenten-Hinweis
- **Keine Installation noetig** -- laeuft komplett im Browser
- **Docker-ready** -- Ein-Befehl-Deployment mit Docker Compose (2 Services: App + Signal-Server)

### KI-Agenten-Schnittstelle
- **WebRTC/PeerJS-API** -- Programmatischer Zugriff auf das Abstimmungssystem
- **WebSocket-API** -- Server-Modus fuer Agenten hinter Firewalls
- **Nachrichtenprotokoll** -- Typisierte Messages fuer Presenter und Voter
- **Agent-ready** -- KI-Assistenten koennen Abstimmungen automatisiert durchfuehren

> Details zur API: [API-INTEGRATION.md](API-INTEGRATION.md)

## Installation

### Docker (empfohlen)

```bash
git clone https://github.com/DRKAachen/VereinsabstimmungDRK.git
cd VereinsabstimmungDRK
docker compose up -d --build
```

Startet zwei Services (nur intern im Docker-Netzwerk erreichbar):
- **abstimmung** (Next.js): intern Port 3000
- **peerjs-signal** (PeerJS + WebSocket-Relay): intern Port 9000

Fuer lokale Entwicklung mit Port-Mapping:
```bash
docker compose --profile dev up -d --build
```
- http://localhost:3000 (App)
- http://localhost:9000 (Signal-Server)

### Lokal entwickeln

```bash
git clone https://github.com/DRKAachen/VereinsabstimmungDRK.git

# Next.js App
cd VereinsabstimmungDRK/next-app
npm install
npm run dev

# Signal-Server (in einem zweiten Terminal)
cd VereinsabstimmungDRK/server
npm install
npm run dev
```

### Produktion (hinter Caddy Reverse Proxy)

Die App laeuft in Produktion hinter einem Caddy Reverse Proxy, der SSL/TLS terminiert:

```bash
# .env anlegen (siehe .env.example)
cp .env.example .env

# Docker-Netzwerk anlegen (einmalig)
docker network create caddy-net

# Starten
docker compose up -d --build
```

Die Container sind nur intern im Docker-Netzwerk `caddy-net` erreichbar. Caddy (separater Container) leitet Requests weiter:
- `drk-abstimmung.de` → `abstimmung:3000`
- `signal.drk-abstimmung.de` → `peerjs-signal:9000`

Die Signal-Server-URL wird ueber die Umgebungsvariable `SIGNAL_URL` konfiguriert (siehe `.env.example`). Ohne diese Variable wird automatisch `window.location.hostname:9000` verwendet (funktioniert fuer lokale Docker-Setups).

## Abstimmungsmodi

### Offener Modus (P2P -- serverlos)

**Versammlungsleiter (Laptop/Beamer):**
1. Seite im Browser oeffnen
2. Versammlungstitel und Anzahl der Stimmberechtigten eingeben
3. Modus "Offene Abstimmung" auswaehlen (gruen markiert)
4. Abstimmungsthema eingeben und Abstimmung starten
5. QR-Code wird angezeigt -- Mitglieder scannen diesen
6. Abstimmung schliessen, wenn alle abgestimmt haben

**Mitglieder (Smartphone):**
1. QR-Code mit der Smartphone-Kamera scannen
2. Link im Browser oeffnen
3. Warten bis die Abstimmung gestartet wird
4. Stimme abgeben -- fertig!

### Stimmkarten-Modus (P2P -- serverlos)

Im Stimmkarten-Modus werden ein oder mehrere Geraete (Tablets/Smartphones) bereitgestellt. Jedes Mitglied authentifiziert sich mit einem persoenlichen Stimmkarten-Code.

**Versammlungsleiter:**
1. Modus "Stimmkarten" auswaehlen (gruen markiert)
2. "Token-Codes generieren" klicken (z.B. `K4F-9M2`)
3. "Codes drucken" klicken -- druckbare Karten (3x4 pro A4-Seite)
4. Stimmkarten-Geraete ueber QR-Code verbinden

**Mitglieder (am Stimmkarten-Geraet):**
1. 6-stelligen Code ueber das Touch-Numpad eingeben
2. Nach Validierung: Stimme abgeben
3. Geraet setzt sich nach 3 Sekunden automatisch zurueck
4. Geraet an die naechste Person weitergeben

**Hinweis:** Jeder Token-Code kann pro Abstimmungsrunde nur einmal verwendet werden. In der naechsten Runde ist derselbe Code erneut gueltig.

### Server-Modus (WebSocket-Relay)

Fuer Netzwerke mit Firewall- oder NAT-Problemen, bei denen direkte WebRTC-Verbindungen nicht moeglich sind. Alle Daten werden ueber den Signal-Server (WebSocket) uebertragen.

**Hinweis:** Im Server-Modus passieren die Abstimmungsdaten den Server. Der Server speichert keine Daten persistent -- alle Informationen existieren nur im Arbeitsspeicher waehrend der aktiven Versammlung.

**Versammlungsleiter:**
1. Modus "Server-Modus" auswaehlen (rot markiert)
2. Zwischen "Offene Abstimmung" und "Stimmkarten" als Sub-Modus waehlen
3. Ansonsten identischer Ablauf wie bei den P2P-Modi

### PDF-Protokoll

Vollstaendiges Protokoll mit:
- Roter DRK-Kopfbalken mit "DEUTSCHES ROTES KREUZ"-Schriftzug
- Versammlungstitel, Datum und Modus
- Alle Abstimmungen mit Ergebnissen und farbigen Balken
- Seitenzahlen auf jeder Seite

## Tech-Stack

- [Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [PeerJS](https://peerjs.com/) (WebRTC) fuer serverlose Echtzeit-Kommunikation
- **Eigener Node.js Signal-Server** (PeerJS-Signaling + WebSocket-Relay)
- [jsPDF](https://parall.ax/products/jspdf) fuer PDF-Protokoll-Export
- [qrcode](https://www.npmjs.com/package/qrcode) fuer QR-Code-Generierung
- Browser-Fingerprinting zur Doppelabstimmungs-Verhinderung
- Docker + Docker Compose fuer Deployment (2 Services)

## Projektstruktur

```
VereinsabstimmungDRK/
├── docker-compose.yml              # Docker Compose (2 Services)
├── index.html                      # Original-App (Single-Page, GitHub Pages)
├── danke.html                      # Danke-Seite (Original)
├── datenschutz.html                # Datenschutz (Original)
├── impressum.html                  # Impressum (Original)
├── fonts/                          # Lokal gehostete Schriftarten
├── js/                             # Modulare JS-Dateien (Original)
├── css/                            # Stylesheets (Original)
├── logo.png / logo.svg             # DRK-Logo
├── API-INTEGRATION.md              # KI-Agenten-Schnittstelle
├── PROJECT.md                      # Interne Projektdokumentation
│
├── server/                         # Signal-Server (Node.js)
│   ├── src/
│   │   ├── index.ts                # HTTP + PeerJS-Signaling + WS-Relay
│   │   └── ws-relay.ts             # WebSocket Room-Management
│   ├── Dockerfile                  # Docker-Build Signal-Server
│   ├── package.json                # Dependencies (peer, ws)
│   └── tsconfig.json               # TypeScript-Config
│
└── next-app/                       # Next.js Migration
    ├── app/
    │   ├── layout.tsx              # DRK-Header + Footer + Hilfe-Link
    │   ├── page.tsx                # Hauptseite (Presenter/Voter-Routing)
    │   ├── globals.css             # DRK-Farbvariablen + Animationen
    │   ├── hilfe/page.tsx          # Hilfe & Anleitung (FAQ, Modi, KI-Agent)
    │   ├── danke/page.tsx          # Danke-Seite nach Versammlungsende
    │   ├── impressum/page.tsx      # Impressum
    │   └── datenschutz/page.tsx    # Datenschutzerklaerung
    ├── components/
    │   ├── presenter/              # Versammlungsleiter-UI
    │   │   ├── PresenterApp.tsx    # Haupt-Orchestrator (Transport-Switching)
    │   │   ├── SetupForm.tsx       # Versammlungs-Setup (3 Modi)
    │   │   ├── NewVoteForm.tsx     # Neue Abstimmung erstellen
    │   │   ├── ActiveVote.tsx      # Laufende Abstimmung mit QR + Live-Bars
    │   │   ├── VoteResultDisplay.tsx # Ergebnisanzeige
    │   │   ├── VoteHistory.tsx     # Abstimmungshistorie + PDF-Export
    │   │   ├── EndSessionModal.tsx # Bestaetigungsdialog
    │   │   └── InfoBox.tsx         # Kontextuelle Infoboxen
    │   └── voter/                  # Teilnehmer-UI
    │       ├── VoterApp.tsx        # Haupt-Voter-Komponente (Transport-Switching)
    │       └── screens.tsx         # Alle Voter-Bildschirme
    ├── hooks/
    │   ├── useHostTransport.ts     # PeerJS-Transport (Presenter)
    │   ├── useVoterTransport.ts    # PeerJS-Transport (Voter)
    │   ├── useServerHostTransport.ts   # WebSocket-Transport (Presenter)
    │   └── useServerVoterTransport.ts  # WebSocket-Transport (Voter)
    ├── lib/
    │   ├── types.ts                # TypeScript-Typen (Messages, State, etc.)
    │   ├── signal-config.ts        # Signal-Server URL-Erkennung
    │   ├── presenter-reducer.ts    # State-Management (Presenter)
    │   ├── voter-reducer.ts        # State-Management (Voter)
    │   ├── pdf-export.ts           # PDF-Generierung (jsPDF + DRK-Branding)
    │   ├── fingerprint.ts          # Browser-Fingerprinting
    │   ├── token.ts                # Stimmkarten-Token-Generierung
    │   ├── voted-rounds.ts         # Tracking abgestimmter Runden
    │   └── utils.ts                # Hilfsfunktionen
    └── Dockerfile                  # Multi-Stage Docker Build (Node 22 Alpine)
```

## Datenschutz und Anonymitaet

- **Keine Registrierung, kein Login** -- Mitglieder scannen einfach den QR-Code
- **Keine Datenbank** -- keine persistente Datenspeicherung
- **Keine Zuordnung von Stimmen zu Personen** -- nur aggregierte Ergebnisse
- **Nach Beenden alles weg** -- keine Spuren auf dem Server
- **Kein Tracking, keine Cookies, keine Analyse-Tools**
- **Keine externen Schriftarten** -- alle Fonts lokal gehostet
- **Open Source** -- der gesamte Quellcode ist einsehbar und ueberpruefbar

**P2P-Modi (Offen / Stimmkarten):** Peer-to-Peer via WebRTC -- Daten fliessen direkt zwischen den Geraeten. Der Signal-Server wird nur fuer den Verbindungsaufbau genutzt.

**Server-Modus:** Daten passieren den Signal-Server (WebSocket-Relay), werden aber nicht gespeichert. Alle Informationen existieren nur im Arbeitsspeicher waehrend der aktiven Versammlung.

Ausfuehrliche Datenschutzerklaerung: [/datenschutz](next-app/app/datenschutz/page.tsx)

## Doppelabstimmungs-Schutz

Mehrstufiges System:

1. **Browser-Fingerprinting** -- anonymer Geraete-Hash aus Browser-Signalen (Canvas, WebGL, Audio, Hardware)
2. **localStorage / sessionStorage** -- Absicherung fuer normale Browser-Fenster und Page Reloads
3. **Presenter-seitige Pruefung** -- eigene Liste aller bereits abgegebenen Stimmen

## Verbindungsstabilitaet

1. **Automatische Wiederverbindung** -- bis zu 5 Versuche (0s, 2s, 5s, 10s, 20s)
2. **Heartbeat/Keep-Alive** -- alle 15 Sekunden Ping/Pong
3. **Visibility-Change-Detection** -- Pruefung bei Tab-Wechsel
4. **Host-seitige Erkennung** -- Echtzeit-Anzeige der Verbindungen, 60-Sekunden-Cleanup
5. **Manueller Retry** -- Button oder QR-Code erneut scannen
6. **Server-Modus als Fallback** -- wenn WebRTC wegen Firewall/NAT nicht funktioniert

## Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `SIGNAL_URL` | URL des Signal-Servers (wird als Build-Arg uebergeben) | `https://signal.drk-abstimmung.de` |
| `APP_URL` | URL der App (Referenz) | `https://drk-abstimmung.de` |
| `PORT` | Port des Signal-Servers (intern) | `9000` |

## Beitragen

Pull Requests sind willkommen!

1. Fork erstellen
2. Feature-Branch anlegen (`git checkout -b feature/mein-feature`)
3. Committen (`git commit -m 'feat: Beschreibung'`)
4. Pushen (`git push origin feature/mein-feature`)
5. Pull Request oeffnen

## Lizenz

Open Source -- frei verwendbar fuer alle DRK-Gliederungen und darueber hinaus.

## Kontakt

DRK-Kreisverband StaedteRegion Aachen e.V.
Henry-Dunant-Platz 1, 52146 Wuerselen
E-Mail: Info@DRK-Aachen.de
Web: https://www.drk-aachen.de

---

*Gebaut mit Liebe fuer das Deutsche Rote Kreuz*
