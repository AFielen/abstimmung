# Template-Alignment Audit

**Projekt:** DRK Vereinsabstimmung (`abstimmung`)
**Template:** [drk-app-template](https://github.com/AFielen/drk-app-template) — `CLAUDE.md`
**Datum:** 2026-02-20
**Zweck:** Abgleich des bestehenden Projekts mit den Konventionen des offiziellen DRK-App-Templates. Keine Code-Änderungen.

---

## 1. Stimmt bereits überein

### Tech-Stack

| Vorgabe | Status | Datei |
|---------|--------|-------|
| Next.js 16 (App Router) | ✅ | `next-app/package.json` — `"next": "16.1.6"` |
| React 19 | ✅ | `next-app/package.json` — `"react": "19.2.3"` |
| TypeScript `strict: true` | ✅ | `next-app/tsconfig.json` — `"strict": true` |
| Tailwind CSS 4 | ✅ | `next-app/package.json` — `"tailwindcss": "^4"`, PostCSS-Plugin konfiguriert |

### Verbotene Technologien (korrekt vermieden)

| Verboten laut Template | Status |
|------------------------|--------|
| CSS-Module | ✅ Nicht verwendet |
| styled-components | ✅ Nicht verwendet |
| Sass | ✅ Nicht verwendet |
| Externe Fonts (Google Fonts) | ✅ Fonts lokal gehostet als WOFF2 (`next-app/public/fonts/`) |
| Externe Analytics/Tracking | ✅ Nicht verwendet |
| Cookies | ✅ Nicht verwendet (localStorage stattdessen) |
| jQuery / Legacy-Libraries | ✅ Nicht verwendet |

### Deployment

| Vorgabe | Status | Detail |
|---------|--------|--------|
| Server-Variante (`output: 'standalone'`) | ✅ | `next-app/next.config.ts` |
| Docker Multi-Stage Build | ✅ | `next-app/Dockerfile` — 3-Stage (deps → builder → runner) |
| Node 22 Alpine | ✅ | `FROM node:22-alpine` in beiden Dockerfiles |
| Non-Root User | ✅ | `nextjs` (next-app), `signal` (server) |
| Healthcheck | ✅ | Beide Container |
| docker-compose.yml | ✅ | Vorhanden im Root |

### Pflichtseiten

| Seite | Status | Datei |
|-------|--------|-------|
| `/impressum` | ✅ | `next-app/app/impressum/page.tsx` |
| `/datenschutz` | ✅ | `next-app/app/datenschutz/page.tsx` |
| `/hilfe` | ✅ | `next-app/app/hilfe/page.tsx` |

### Header-Grundstruktur

| Vorgabe | Status | Detail |
|---------|--------|--------|
| Hintergrund `#e30613` (inline style) | ✅ | `layout.tsx:18` — `style={{ background: "#e30613" }}` |
| Text weiß | ✅ | `style={{ color: "#fff" }}` |
| DRK-Logo `logo.png` 42×42 | ✅ | `<img src="/logo.png" width={42} height={42}>` |
| Titel `text-[1.4rem] font-bold` | ✅ | Identisch |
| Untertitel `text-[0.8rem] opacity-85` | ✅ | Identisch |
| Hilfe-Icon (SVG, stroke-basiert) | ✅ | Lucide-Style Question-Circle SVG |
| Layout `flex items-center justify-between` | ✅ | Identisch |
| Nicht sticky/fixed | ✅ | Scrollt mit der Seite |

### Footer-Grundstruktur

| Vorgabe | Status | Detail |
|---------|--------|--------|
| Heller Hintergrund (nicht dunkelgrau) | ✅ | Kein dunkler Hintergrund |
| "DEUTSCHES ROTES KREUZ" rot, uppercase, bold | ✅ | `layout.tsx:55` |
| "Kreisverband StädteRegion Aachen e.V." grau | ✅ | `layout.tsx:58` |
| Links: Impressum · Datenschutz · Hilfe | ✅ | `layout.tsx:62–66` |
| "made with ❤ for ✚" | ✅ | `layout.tsx:68–75` mit Rotkreuz-SVG |
| Zentriert, `text-center py-10 mt-8 border-t` | ✅ | Identisch |

### Code-Konventionen

| Vorgabe | Status | Detail |
|---------|--------|--------|
| `strict: true`, keine `any` | ✅ | Saubere Typisierung mit Discriminated Unions in `lib/types.ts` |
| Interfaces für Props, Types für Unions | ✅ | `VoteData` (Interface), `SessionMode` (Type Union) |
| Function Components only | ✅ | Keine Class Components |
| Komponenten: `PascalCase.tsx` | ✅ | `PresenterApp.tsx`, `SetupForm.tsx`, etc. |
| Hooks: `use*.ts` | ✅ | `useHostTransport.ts`, `useVoterTransport.ts`, etc. |
| Utils: `kebab-case.ts` | ✅ | `signal-config.ts`, `pdf-export.ts`, `voted-rounds.ts` |
| Pages: `page.tsx` | ✅ | Alle Routen verwenden `page.tsx` |
| Path Alias `@/*` | ✅ | `tsconfig.json` — `"@/*": ["./*"]` |

### Dokumentation

| Datei | Status |
|-------|--------|
| README.md | ✅ Vorhanden (Features, Installation, Tech-Stack, Datenschutz, Lizenz) |
| PROJECT.md | ✅ Vorhanden (Architektur, Entscheidungen, Known Issues) |
| API-INTEGRATION.md | ✅ Vorhanden (Message-Protokoll, Verbindungsaufbau) |
| LICENSE (MIT) | ✅ Vorhanden |

### UX-Prinzipien

| Vorgabe | Status | Detail |
|---------|--------|--------|
| Kein Login/Registrierung | ✅ | Sofort nutzbar, kein Account nötig |
| Exit-Guard (beforeunload) | ✅ | `PresenterApp.tsx` verwendet `beforeunload` Event |
| localStorage-Zwischenspeicherung | ✅ | `voted-rounds.ts` für Abstimmungstracking |
| Fehlermeldungen auf Deutsch | ✅ | Alle UI-Texte auf Deutsch |
| Mobile First / Touch-Ziele | ✅ | Buttons mit ausreichender Größe |

### Commit-Konventionen (teilweise)

| Vorgabe | Status | Detail |
|---------|--------|--------|
| `feat:` / `fix:` / `chore:` Prefixes | ✅ | Neuere Commits folgen der Konvention (`fix: downgrade Express`, `chore: add compiled server dist files`) |

---

## 2. Weicht ab

### Projektstruktur

| Vorgabe (Template) | Ist-Zustand | Auswirkung |
|---------------------|-------------|------------|
| Flache Struktur: `app/`, `components/`, `lib/` im Projekt-Root | Verschachtelt unter `next-app/` + separates `server/`-Verzeichnis | Die Verschachtelung ist durch den zusätzlichen Signal-Server bedingt. Das Template kennt nur Single-App-Projekte. Die `next-app/`-interne Struktur folgt dem Template-Muster. |

**Dateien im Template-Root:**
```
Template:    app/ components/ lib/ public/ package.json tsconfig.json ...
Abstimmung:  next-app/app/ next-app/components/ next-app/lib/ next-app/public/ ...
             server/src/ server/package.json server/tsconfig.json ...
```

### Typografie

| Vorgabe | Ist-Zustand | Datei |
|---------|-------------|-------|
| System-Font-Stack (kein externes Font-Loading) | Custom Fonts: Source Sans 3 (5 Gewichte) + Source Serif 4 (2 Gewichte), lokal als WOFF2 gehostet | `next-app/app/globals.css:36–90` |

> Die Fonts sind zwar lokal gehostet (keine Google Fonts), aber das Template verlangt den System-Font-Stack **ohne** Font-Loading. Die 7 Font-Dateien erhöhen die initiale Ladezeit.

### CSS-Variablen — Farbwerte

| Variable | Template-Wert | Ist-Wert | Datei |
|----------|--------------|----------|-------|
| `--drk-dark` | `#b8000f` | `#b70510` | `globals.css:5,21` |
| `--drk-light` | `#ff1a2e` | `#ff2d3a` | `globals.css:6,22` |
| `--text` | `#212529` | `#2a2a2a` | `globals.css:10,27` |
| `--text-light` | `#6b7280` | `#777` | `globals.css:11,28` |
| `--bg` | `#f8f9fa` | `#f4f4f4` | `globals.css:8,24` |
| `--border` | `#e5e7eb` | `#e0e0e0` | `globals.css:12,29` |
| `--success` | `#28a745` | `#2e7d32` | `globals.css:13,29` |
| `--warning` | `#ffc107` | `#f9a825` | `globals.css:14,30` |

> Die Primärfarbe `--drk: #e30613` stimmt überein. Die Sekundär- und Statusfarben weichen leicht ab.

### CSS-Variablen — Fehlende/Abweichende Namen

| Template definiert | Projekt verwendet stattdessen |
|--------------------|-------------------------------|
| `--drk-bg: #fef2f2` | Nicht vorhanden |
| `--text-muted: #9ca3af` | Nicht vorhanden |
| `--bg-card: #ffffff` | `--card: #fff` (anderer Name) |
| `--info: #17a2b8` | `--danger: #c62828` (andere Semantik, kein `--info`) |

### Header-Abweichungen

| Vorgabe | Ist-Zustand | Datei |
|---------|-------------|-------|
| Titel-Bereich als `<Link href="/">` (klickbar → Startseite) | Titel-Bereich ist `<div>`, nicht klickbar | `layout.tsx:19` |
| Spenden-Icon (❤-SVG) links neben Hilfe-Icon verlinkt auf `/spenden` | Kein Spenden-Icon im Header | `layout.tsx:26–47` |
| Zwei Icons rechts: Spenden + Hilfe in `<div className="flex items-center gap-1">` | Nur ein Icon (Hilfe), direkt ohne Wrapper-div | `layout.tsx:27–47` |

### Footer-Abweichungen

| Vorgabe | Ist-Zustand | Datei |
|---------|-------------|-------|
| Footer-Links enthalten "Unterstützen" (→ `/spenden`) | Nur Impressum · Datenschutz · Hilfe | `layout.tsx:62–66` |

### Utility-CSS-Klassen

| Template definiert | Ist-Zustand |
|--------------------|-------------|
| `.drk-card` (weiß, rounded-xl, shadow-lg, padding) | Nicht vorhanden — Styling wird inline oder per Tailwind-Klassen gelöst |
| `.drk-btn-primary` (rot, weiß, font-semibold, 44px) | Nicht vorhanden |
| `.drk-btn-secondary` (grau) | Nicht vorhanden |
| `.drk-label` (bold, dunkel) | Nicht vorhanden |
| `.drk-input` (border, rounded, focus-ring rot) | Nicht vorhanden |

> Das Projekt nutzt stattdessen eigene CSS-Klassen wie `.hero`, `.overlap-card`, `.feature-grid`, `.steps-list` in `globals.css`. Die visuelle Konsistenz ist gegeben, aber die einheitliche Klassennomenklatur des Templates wird nicht befolgt.

### Favicon-Format

| Vorgabe | Ist-Zustand | Datei |
|---------|-------------|-------|
| `favicon.svg` (SVG) | `favicon.ico` (ICO) | `next-app/app/favicon.ico` |

### Konfigurationsunterschiede

| Datei | Vorgabe | Ist-Zustand |
|-------|---------|-------------|
| `next.config.ts` | Nur `output` gesetzt | Zusätzlich `poweredByHeader: false`, `compress: true` (sinnvolle Erweiterungen, aber nicht im Template vorgesehen) |
| `tsconfig.json` → `jsx` | `"preserve"` | `"react-jsx"` (funktional äquivalent für Next.js, aber abweichend) |

### Hilfe-Seite: FAQ-Implementierung

| Vorgabe | Ist-Zustand | Datei |
|---------|-------------|-------|
| FAQ mit nativen `<details>`-Elementen | Custom Accordion mit `useState` + Button-Click-Handler | `next-app/app/hilfe/page.tsx:30,244–273` |

> Das Template empfiehlt native `<details>`-Elemente für FAQ-Accordions. Die Abstimmungs-App verwendet einen Custom-Accordion mit React-State. Funktional identisch, aber weniger semantisch und erfordert JavaScript.

---

## 3. Fehlt

### Dateien

| Fehlende Datei | Template-Vorgabe | Priorität |
|----------------|------------------|-----------|
| **`CLAUDE.md`** | Muss im Projekt-Root liegen, definiert alle Konventionen für KI-Agenten | Hoch |
| **`app/not-found.tsx`** | Custom 404-Seite im DRK-Design | Mittel |
| **`app/spenden/page.tsx`** | Pflichtseite: Dank, Open-Source-Hinweis, Spendenoptionen (Online, Überweisung, Fördermitgliedschaft) | Hoch |
| **`lib/i18n.ts`** | Zweisprachigkeit DE/EN, alle sichtbaren Texte über i18n-Keys | Mittel |
| **`lib/version.ts`** | Versionsverwaltung | Niedrig |
| **`public/favicon.svg`** | SVG-Favicon (statt ICO) | Niedrig |

### Features

| Fehlendes Feature | Template-Vorgabe | Detail |
|-------------------|------------------|--------|
| **Zweisprachigkeit (i18n)** | DE/EN-Umschaltung über Button im Header oder Footer | Aktuell nur Deutsch, kein i18n-System. Alle Texte sind hardcoded in Deutsch. |
| **Spenden-Integration** | ❤-Icon im Header → `/spenden`, "Unterstützen"-Link im Footer | Weder Icon noch Seite noch Footer-Link vorhanden. |
| **DSGVO-Checkliste** | Formale Checkliste im Projekt (10 Punkte) | Keine formale Checkliste vorhanden. Inhaltlich sind die meisten Punkte erfüllt (keine Cookies, keine DB, Fonts lokal, Impressum/Datenschutz vorhanden), aber nicht dokumentiert. |

### Konfiguration

| Fehlend | Template-Vorgabe | Detail |
|---------|------------------|--------|
| **Prettier** | Code-Formatting (implizit durch konsistenten Code-Stil im Template) | Kein Prettier installiert, keine `.prettierrc`. ESLint ist konfiguriert, aber kein automatisches Formatting. |

---

## Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| ✅ Stimmt überein | 35+ Einzelpunkte |
| ⚠️ Weicht ab | 14 Einzelpunkte |
| ❌ Fehlt | 9 Einzelpunkte |

### Bewertung

Das Projekt erfüllt die **Kern-Anforderungen** des Templates zuverlässig: Tech-Stack, Deployment, Code-Konventionen, Pflichtseiten (3 von 4), Header/Footer-Grundstruktur und Dokumentation.

Die **Abweichungen** sind überwiegend kosmetischer Natur (Farbwerte, Font-Strategie, CSS-Klassennamen) oder durch die Projekt-Architektur bedingt (verschachtelte Struktur wegen Signal-Server).

Die **fehlenden Elemente** lassen sich in drei Gruppen einteilen:
1. **Schnell nachholbar** — `CLAUDE.md`, `not-found.tsx`, `favicon.svg`, DSGVO-Checkliste
2. **Mittlerer Aufwand** — `/spenden`-Seite, Spenden-Icon im Header/Footer
3. **Größerer Aufwand** — i18n-System (betrifft alle Texte im gesamten Projekt)
