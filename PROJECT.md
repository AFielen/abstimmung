---
project: DRK Vereinsabstimmung
type: web-app
status: active
updated: 2026-02-19
---

# DRK Vereinsabstimmung

Digitales Abstimmungssystem fuer Vereinsversammlungen des Deutschen Roten Kreuzes. Drei Modi: P2P (WebRTC), Stimmkarten (P2P), Server-Modus (WebSocket-Relay). Vollstaendig anonym, DSGVO-konform.

## What It Does

- Geheime Abstimmungen per QR-Code direkt vom Smartphone
- Drei Modi: Offener Modus (P2P), Stimmkarten-Modus (P2P), Server-Modus (WebSocket-Relay)
- Echtzeit-Ergebnisse mit Live-Balkendiagrammen
- PDF-Protokoll-Export mit DRK-Branding
- Eigener Signaling-Server (PeerJS + WebSocket-Relay in einem Prozess)
- Privacy-first: Keine Datenbank, keine persistente Speicherung
- KI-Agenten-Schnittstelle ueber PeerJS/WebRTC und WebSocket

## Quick Links

- **Live (Original):** https://afielen.github.io/drk/index.html
- **Repo:** https://github.com/DRKAachen/VereinsabstimmungDRK
- **Local Dev:** http://localhost:3000 (npm run dev)
- **Docker:** http://localhost:3334 (docker compose up)
- **Signal-Server:** http://localhost:9000 (PeerJS + WS-Relay)

---

## Tech Stack

### Frontend
- Framework: Next.js 16 (App Router)
- Language: TypeScript 5
- Styling: Tailwind CSS 4
- State Management: useReducer + useRef (Presenter), useReducer (Voter)

### Realtime
- P2P-Transport: PeerJS (WebRTC DataChannel)
- Server-Transport: WebSocket-Relay (ws)
- Protocol: Typed JSON Messages (HostMessage / VoterMessage)
- Reconnect: Exponential Backoff (0s, 2s, 5s, 10s, 20s)
- Heartbeat: Ping/Pong alle 15 Sekunden

### Signal-Server
- Runtime: Node.js 22
- PeerJS-Signaling: `peer` npm Paket auf `/peerjs`
- WebSocket-Relay: `ws` npm Paket auf `/ws`
- Port: 9000 (konfigurierbar ueber `PORT` env)
- Room-Management: 30 Min TTL, max 100 Rooms, max 300 Voter/Room

### PDF
- Library: jsPDF v4
- Branding: DRK-Kopfbalken, farbige Ergebnisbalken, Seitenzahlen

### Infrastructure
- Hosting: Docker on VPS (oder GitHub Pages fuer Original)
- Deployment: `docker compose up -d --build` (2 Services: App + Signal-Server)
- Images: Node 22 Alpine, Multi-Stage Build

### Development
- Package Manager: npm
- Bundler: Next.js (Turbopack in dev)
- Testing: None yet

---

## Architecture

### Directory Structure

```
VereinsabstimmungDRK/
├── docker-compose.yml                  # 2 Services (App + Signal-Server)
├── server/
│   ├── src/
│   │   ├── index.ts                    # HTTP + PeerJS + WS-Relay Server
│   │   └── ws-relay.ts                 # WebSocket Room-Management
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── next-app/
│   ├── app/
│   │   ├── layout.tsx                  # DRK-Header + Footer + Hilfe-Icon
│   │   ├── page.tsx                    # Routing: Presenter vs. Voter (?vote=&mode=)
│   │   ├── globals.css                 # CSS-Variablen, Hero, Steps, Animations
│   │   ├── hilfe/page.tsx              # Hilfe & Anleitung (FAQ, Modi, KI-Agent)
│   │   ├── danke/page.tsx              # Danke-Seite mit Statistiken
│   │   ├── impressum/page.tsx          # Impressum
│   │   └── datenschutz/page.tsx        # Datenschutzerklaerung
│   ├── components/
│   │   ├── presenter/
│   │   │   ├── PresenterApp.tsx        # Orchestrator (Transport-Switching)
│   │   │   ├── SetupForm.tsx           # Versammlungs-Setup (3 Modi-Karten)
│   │   │   ├── NewVoteForm.tsx         # Neue Abstimmung
│   │   │   ├── ActiveVote.tsx          # QR-Code, Live-Bars, Timer
│   │   │   ├── VoteResultDisplay.tsx   # Ergebnisanzeige
│   │   │   ├── VoteHistory.tsx         # Historie + PDF-Export
│   │   │   ├── EndSessionModal.tsx     # Bestaetigungsdialog
│   │   │   └── InfoBox.tsx             # Kontextuelle Hilfe (mit Server-Hinweis)
│   │   └── voter/
│   │       ├── VoterApp.tsx            # Voter-Orchestrator (Transport-Switching)
│   │       └── screens.tsx             # Alle Voter-Screens
│   ├── hooks/
│   │   ├── useHostTransport.ts         # PeerJS Host (init, broadcast, sendTo)
│   │   ├── useVoterTransport.ts        # PeerJS Client (connect, send)
│   │   ├── useServerHostTransport.ts   # WebSocket Host (init, broadcast, sendTo)
│   │   └── useServerVoterTransport.ts  # WebSocket Client (connect, send)
│   ├── lib/
│   │   ├── types.ts                    # HostMessage, VoterMessage, State-Typen
│   │   ├── signal-config.ts            # Signal-Server URL-Erkennung
│   │   ├── presenter-reducer.ts        # PresenterState Actions
│   │   ├── voter-reducer.ts            # VoterState Actions
│   │   ├── pdf-export.ts              # jsPDF mit DRK-Branding
│   │   ├── fingerprint.ts             # Canvas/WebGL/Audio Fingerprint
│   │   ├── token.ts                   # 6-stellige Token-Codes (XXX-XXX)
│   │   ├── voted-rounds.ts            # localStorage-basiertes Round-Tracking
│   │   └── utils.ts                   # Formatierung, Helpers
│   └── Dockerfile
├── index.html                          # Original-App (Single-Page)
├── API-INTEGRATION.md                  # KI-Agenten API-Doku
└── PROJECT.md                          # Diese Datei
```

### Key Patterns

- **TransportMode orthogonal zu SessionMode:** `TransportMode` (`p2p` | `server`) und `SessionMode` (`open` | `stimmkarten`) sind unabhaengige Konzepte. Server-Modus unterstuetzt beide Session-Modi.
- **Transport-Switching:** Beide Transport-Hooks (P2P + Server) werden immer instanziiert (React Rules of Hooks). Nur der aktive wird `init()`ialisiert.
- **transportRef Pattern:** `transportRef` (useRef) um zirkulaere Abhaengigkeit zwischen useCallback und Transport-Hook zu vermeiden
- **sendTo(string):** Alle Transport-Hooks verwenden `string` (ConnectionId) statt `DataConnection` — transport-agnostisch
- **Data Flow:** Presenter (useReducer) → Transport broadcast → Voter (useReducer)
- **Double-Vote Prevention:** `votedDevices` Set mit `ls:` (localStorage) und `fp:` (fingerprint) Prefixes
- **Timer:** `timerInterval` Ref mit Auto-Close bei Ablauf
- **Routing:** URL-Parameter `?vote=<peerId>&mode=server` unterscheidet Presenter von Voter und P2P von Server
- **Signal-Config:** `NEXT_PUBLIC_SIGNAL_URL` env → Auto-Detect (`hostname:9000`) → PeerJS Cloud Fallback

### Important Locations

- Message-Typen: `next-app/lib/types.ts`
- Signal-Config: `next-app/lib/signal-config.ts`
- Presenter-Logik: `next-app/components/presenter/PresenterApp.tsx`
- Voter-Logik: `next-app/components/voter/VoterApp.tsx`
- PeerJS-Transport: `next-app/hooks/useHostTransport.ts` + `useVoterTransport.ts`
- Server-Transport: `next-app/hooks/useServerHostTransport.ts` + `useServerVoterTransport.ts`
- WS-Relay: `server/src/ws-relay.ts`
- PDF-Generierung: `next-app/lib/pdf-export.ts`
- Hilfe-Seite: `next-app/app/hilfe/page.tsx`

---

## Architecture Decisions

### Peer-to-Peer statt Server

- **Date:** 2025-02-01
- **Context:** Abstimmungssystem soll DSGVO-konform sein, keine Daten speichern
- **Decision:** PeerJS (Peer-to-Peer) als Standard-Transport
- **Rationale:** Keine Daten auf einem Server, keine DSGVO-Bedenken, einfacheres Deployment
- **Trade-offs:** Abhaengigkeit vom Signaling-Server fuer Verbindungsaufbau, WebRTC-Limitierungen bei NAT/Firewall
- **Files:** `next-app/hooks/useHostTransport.ts`, `next-app/hooks/useVoterTransport.ts`

### Eigener Signaling-Server + Server-Modus

- **Date:** 2026-02-19
- **Context:** PeerJS Cloud hat 50-Personen-Limit. WebRTC scheitert in Firmennetzwerken (NAT/Firewall).
- **Options:**
  1. PeerJS Cloud beibehalten (Limit bleibt, Firewall-Probleme bleiben)
  2. Eigener PeerJS-Server (fixt Limit, Firewall bleibt)
  3. Eigener PeerJS-Server + WebSocket-Relay als Alternative (fixt beides)
- **Decision:** Option 3 — Eigener Node.js Signaling-Server (PeerJS + WebSocket-Relay)
- **Rationale:**
  - PeerJS-Signaling auf eigenem Server → kein 50er-Limit
  - WebSocket-Relay als dritter Modus → umgeht NAT/Firewall vollstaendig
  - Beides im gleichen Prozess (Port 9000) → einfaches Deployment
  - Server-Modus rot markiert → Nutzer sieht klar dass Daten den Server passieren
- **Trade-offs:**
  - Zweiter Docker-Service noetig
  - Server-Modus ist nicht serverlos (Daten passieren den Server, werden aber nicht gespeichert)
- **Files:** `server/`, `next-app/hooks/useServer*.ts`, `next-app/lib/signal-config.ts`

### Doppelabstimmungs-Schutz: Mehrstufig

- **Date:** 2025-02-01
- **Context:** Geheime Abstimmung muss Doppelabstimmungen verhindern, ohne Identitaet zu pruefen
- **Decision:** 3-stufiges System (Fingerprint + localStorage + Presenter-Pruefung)
- **Files:** `next-app/lib/fingerprint.ts`, `next-app/components/presenter/PresenterApp.tsx`

### Next.js Migration

- **Date:** 2026-02-19
- **Context:** Original-App war ein Monolith (index.html + inline JS). Fuer Wartbarkeit und Docker-Deployment auf Next.js migriert.
- **Decision:** Next.js 16 mit App Router
- **Files:** Gesamte `next-app/` Struktur

---

## Current State

### Done (2026-02-19)

- [x] Migration von Monolith auf Next.js 16 + React 19 + TypeScript
- [x] Alle Presenter-Komponenten (8 Dateien)
- [x] Alle Voter-Komponenten (2 Dateien)
- [x] PeerJS Transport-Hooks (Host + Voter)
- [x] **Eigener Signal-Server** (PeerJS-Signaling + WebSocket-Relay)
- [x] **Server-Transport-Hooks** (Host + Voter via WebSocket)
- [x] **Transport-Switching** in PresenterApp + VoterApp
- [x] **3 Modi-Auswahl** auf Setup-Seite (gruen/rot)
- [x] State-Management via useReducer (Presenter + Voter)
- [x] PDF-Export mit jsPDF und DRK-Branding
- [x] Browser-Fingerprinting fuer Doppelabstimmungs-Schutz
- [x] Token-Generierung fuer Stimmkarten-Modus
- [x] Docker-Setup (2 Services: App + Signal-Server)
- [x] Hilfe-Seite mit Hero, FAQ-Accordion, Modi-Erklaerung, KI-Agenten-Hinweis
- [x] README.md, PROJECT.md, API-INTEGRATION.md aktualisiert

### Planned

- [ ] End-to-End Testing
- [ ] Barrierefreiheit (ARIA, Keyboard Navigation)
- [ ] Dark Mode
- [ ] HTTPS-Setup auf VPS
- [ ] Performance-Optimierung bei 100+ Teilnehmern

### Known Issues

- **Edge-Browser:** QR-Code-Darstellung kann eingeschraenkt sein
- **Mobile Safari Inkognito:** localStorage wird bei Tab-Close geloescht (bekanntes Browser-Verhalten)
- **WebRTC-Kapazitaet:** Bei sehr vielen P2P-Verbindungen (100+) kann der Presenter-Rechner an Grenzen stossen → Server-Modus nutzen

---

## Setup & Deployment

### Local Development

```bash
# Terminal 1: Next.js App
cd next-app
npm install
npm run dev

# Terminal 2: Signal-Server
cd server
npm install
npm run dev
```

**Environment Variables:**
- `NEXT_PUBLIC_SIGNAL_URL` — Signal-Server URL (nur bei Reverse Proxy / Cloudflare Tunnel noetig)
- `PORT` — Signal-Server Port (default: 9000)

### Deployment (Docker)

```bash
# Im Repository-Root
docker compose up -d --build
```

**Ports:** 3334 (App → Container 3000), 9000 (Signal-Server)

### Original-App (GitHub Pages)

Die Original-App (index.html) laeuft weiterhin auf GitHub Pages als statische Seite.

---

## Notes & Context

- **Icons:** Inline SVG (no icon library)
- **Fonts:** Source Sans 3 + Source Serif 4 (lokal gehostet, kein Google Fonts)
- **DRK Colors:** `--drk: #e30613` (definiert in `globals.css`)
- **No Analytics:** Bewusste Entscheidung — privacy-first
- **API fuer Agenten:** Siehe `API-INTEGRATION.md` (WebRTC + WebSocket Nachrichtenprotokoll)
- **Schwester-Projekt:** [DRK Selbstauskunft](https://github.com/AFielen/auskunft) — Compliance-Erklaerung fuer DRK-Fuehrungskraefte

---

_Last updated: 2026-02-19_
