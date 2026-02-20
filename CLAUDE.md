# DRK Vereinsabstimmung – Konventionen für Claude Code

## Überblick

Digitales Abstimmungssystem für Vereinsversammlungen des Deutschen Roten Kreuzes. Entwickelt vom DRK Kreisverband StädteRegion Aachen e.V.

**Basiert auf:** [drk-app-template](https://github.com/AFielen/drk-app-template)

---

## Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| Next.js | 16 | App-Framework (App Router) |
| React | 19 | UI-Library |
| TypeScript | strict | Typisierung |
| Tailwind CSS | 4 | Styling |
| PeerJS | 1.5 | WebRTC P2P-Kommunikation |
| WebSocket (ws) | 8.18 | Server-Modus Relay |

**NICHT verwenden:**
- Keine CSS-Module, kein styled-components, kein Sass
- Keine externen Fonts – System-Font-Stack
- Keine externen Analytics/Tracking-Dienste
- Keine Cookies
- Kein jQuery oder andere Legacy-Libraries

---

## Projektstruktur

```
abstimmung/
├── CLAUDE.md                         # ← Diese Datei
├── AUDIT.md                          # Template-Abgleich
├── README.md
├── PROJECT.md
├── API-INTEGRATION.md
├── LICENSE
├── docker-compose.yml
│
├── next-app/                         # Next.js Frontend (Port 3000)
│   ├── app/
│   │   ├── layout.tsx                # DRK Header + Footer
│   │   ├── page.tsx                  # Startseite (Presenter/Voter Router)
│   │   ├── globals.css               # DRK Design Tokens + Utility-Klassen
│   │   ├── not-found.tsx             # Custom 404
│   │   ├── danke/page.tsx            # Danke-Seite nach Session
│   │   ├── hilfe/page.tsx            # Hilfe & FAQ
│   │   ├── impressum/page.tsx        # Pflicht
│   │   ├── datenschutz/page.tsx      # Pflicht
│   │   └── spenden/page.tsx          # Pflicht
│   ├── components/
│   │   ├── presenter/                # 8 Presenter-Komponenten
│   │   └── voter/                    # 2 Voter-Komponenten
│   ├── hooks/                        # 4 Transport-Hooks (P2P + Server)
│   ├── lib/
│   │   ├── types.ts                  # Shared TypeScript Types
│   │   ├── version.ts                # App-Version
│   │   ├── presenter-reducer.ts      # Presenter State Management
│   │   ├── voter-reducer.ts          # Voter State Management
│   │   └── ...                       # Utils, Fingerprinting, PDF
│   └── public/
│       ├── logo.png / logo.svg
│       └── favicon.svg
│
└── server/                           # Signal-Server (Port 9000)
    └── src/
        ├── index.ts                  # Express + PeerJS Signaling
        └── ws-relay.ts               # WebSocket Room Relay
```

---

## Design-System

### CSS-Variablen (in globals.css)

```css
:root {
  --drk: #e30613;          /* DRK Rot */
  --drk-dark: #b8000f;
  --drk-light: #ff1a2e;
  --drk-bg: #fef2f2;
  --text: #212529;
  --text-light: #6b7280;
  --text-muted: #9ca3af;
  --bg: #f8f9fa;
  --bg-card: #ffffff;
  --border: #e5e7eb;
  --success: #28a745;
  --warning: #ffc107;
  --danger: #c62828;
  --info: #17a2b8;
}
```

**WICHTIG:** `style={{ color: 'var(--drk)' }}` für DRK-Farben, Tailwind-Klassen für Layout.

### Utility-Klassen

- `.drk-card` – Weiße Karte (rounded-xl, shadow-lg, padding)
- `.drk-btn-primary` – Roter Button (44px min-height)
- `.drk-btn-secondary` – Grauer Button
- `.drk-input` – Input-Feld mit rotem Focus-Ring
- `.drk-label` – Label (bold, 0.875rem)
- `.drk-fade-in` / `.drk-slide-up` – Animationen

### Header (IMMER gleich)

- Hintergrund: `#e30613` (inline style)
- Links: Logo + Titel als `<Link href="/">`
- Rechts: Spenden-Icon (❤) + Hilfe-Icon (❓), SVG stroke-basiert
- NICHT sticky/fixed

### Footer (IMMER gleich)

1. "DEUTSCHES ROTES KREUZ" – Rot, uppercase
2. "Kreisverband StädteRegion Aachen e.V."
3. Links: Impressum · Datenschutz · Hilfe · Unterstützen
4. "made with ❤ for ✚"

---

## Deployment

### Server-Variante (Docker)

```
next.config.ts: output: 'standalone'
Docker: node:22-alpine, Multi-Stage, non-root user
docker-compose.yml: 2 Services (vereinsabstimmung:3334, signal-server:9000)
```

---

## Code-Konventionen

### TypeScript
- `strict: true`, keine `any`
- Interfaces für Props, Types für Unions
- Function Components only

### Dateibenennungen
- Komponenten: `PascalCase.tsx`
- Hooks: `use*.ts`
- Utils: `kebab-case.ts`
- Pages: `page.tsx`

### Commits
- `feat:` / `fix:` / `docs:` / `style:` / `refactor:`

---

## Pflicht-Seiten

| Route | Inhalt |
|-------|--------|
| `/impressum` | Angaben gemäß § 5 TMG |
| `/datenschutz` | DSGVO, keine Cookies, P2P |
| `/hilfe` | FAQ, Abstimmungsmodi, Anleitung |
| `/spenden` | DRK-Unterstützung, Spendenoptionen |

---

## Kontakt

DRK Kreisverband StädteRegion Aachen e.V.
Henry-Dunant-Platz 1, 52146 Würselen
E-Mail: Info@DRK-Aachen.de
Web: https://www.drk-aachen.de
