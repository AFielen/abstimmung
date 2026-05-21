# Spec: Portal-Startseite mit Verweis auf Rundlaufbeschluss

**Datum:** 2026-05-21
**Status:** Approved
**Repo:** AFielen/abstimmung (+ kleine Änderung in rundlauf-app)

---

## Ziel

Auf `drk-abstimmung.de` soll von der Startseite aus klar erkennbar sein, dass es ein zweites Verfahren gibt: den **Rundlaufbeschluss** unter `rundlauf.drk-abstimmung.de`. Heute landet ein Besucher direkt im SetupForm für die Live-Versammlung — der Rundlauf-Pfad ist nirgendwo sichtbar.

Wir ersetzen die heutige direkte Setup-Startseite durch einen **Portal-Hub** mit zwei gleichberechtigten Karten:

1. **Versammlung** (live, in der Sitzung)
2. **Rundlaufbeschluss** (schriftlich, asynchron)

Das SetupForm zieht nach `/versammlung` um.

---

## Anforderungen

### Funktional

1. **Portal-Seite** auf `/` mit zwei Karten:
   - "Versammlung" → interner Link auf `/versammlung`
   - "Rundlaufbeschluss" → externer Link auf `https://rundlauf.drk-abstimmung.de/`, gleicher Tab
2. **`/versammlung`** zeigt die heutige Presenter-/Setup-UI unverändert.
3. **Backwards-Compat**: URLs mit `?vote=…` (gedruckte QR-Codes laufender Sessions) zeigen weiterhin direkt die VoterApp auf `/`. Keine Änderung an Voter-URLs.
4. **Symmetrie**: Auf `rundlauf.drk-abstimmung.de` in der `LandingPage` (anonyme Ansicht) ein dezenter Rück-Link auf die Versammlung.

### Nicht-Anforderungen (bewusst out of scope)

- Erweiterbarkeit für weitere Tools (NIS-2, Selbstauskunft, …). Das Portal ist explizit auf zwei Karten ausgelegt. Andere DRK-Tools haben eigene Domains und gehören nicht hierher.
- Änderung am Header oder Footer.
- Änderung am Domain-Namen oder Titel.
- Authentifizierte Rundlauf-Ansicht (nur die `LandingPage`-Komponente in rundlauf-app bekommt den Rück-Link).

---

## Design

### Architektur (next-app)

```
next-app/
├── app/
│   ├── page.tsx                     # Refactor: Portal default + ?vote=… → VoterApp
│   ├── versammlung/
│   │   └── page.tsx                 # NEU: rendert PresenterApp in Suspense
│   ├── layout.tsx                   # unverändert
│   └── …
└── components/
    └── portal/
        └── Portal.tsx               # NEU: Hub-Komponente
```

### `app/page.tsx` (Refactor)

Funktional identisches Verhalten für VoterApp-Pfad, sonst Portal statt PresenterApp:

```tsx
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VoterApp from '@/components/voter/VoterApp';
import Portal from '@/components/portal/Portal';

function AppContent() {
  const searchParams = useSearchParams();
  const votePeerId = searchParams.get('vote');
  const mode = searchParams.get('mode');

  if (votePeerId) {
    return (
      <VoterApp
        presenterPeerId={votePeerId}
        transportMode={mode === 'server' ? 'server' : 'p2p'}
      />
    );
  }
  return <Portal />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppContent />
    </Suspense>
  );
}
```

`<LoadingSpinner />` ist das identische Spinner-JSX, das heute schon in `page.tsx` als `Suspense`-Fallback verwendet wird (rotierender Border, DRK-rot). Wird in eine geteilte kleine Helper-Komponente extrahiert (z.B. `components/LoadingSpinner.tsx`), damit `versammlung/page.tsx` denselben Fallback wiederverwendet.

### `app/versammlung/page.tsx` (NEU)

Schlanker Wrapper mit identischer Suspense-Logik:

```tsx
'use client';
import { Suspense } from 'react';
import PresenterApp from '@/components/presenter/PresenterApp';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VersammlungPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PresenterApp />
    </Suspense>
  );
}
```

### `components/portal/Portal.tsx` (NEU)

- Client-Komponente nicht nötig — kann statisch gerendert werden (Server Component).
- Layout:
  - Hero-Heading: H1 "Wählen Sie Ihr Verfahren" (keine Wiederholung des Header-Titels "DRK Vereinsabstimmung"). Darunter Untertitel-Zeile: "Für die Versammlungs-Abstimmung oder den schriftlichen Rundlaufbeschluss."
  - Grid `grid-cols-1 sm:grid-cols-2`, gap-4
  - Karten via `drk-card`-Klasse + Hover-Effekt (Border → DRK-rot)
- Card "Versammlung":
  - Icon: SVG (people-group, Stil wie SetupForm.tsx)
  - Titel "Versammlung"
  - Untertitel "Live-Abstimmung in der Sitzung"
  - Beschreibung 1-2 Zeilen: "Echtzeit-Abstimmungen für Versammlungen. Teilnehmende stimmen per QR-Code direkt ab."
  - Pfeil-Indikator rechts
  - `<Link href="/versammlung">`
- Card "Rundlaufbeschluss":
  - Icon: SVG (Clipboard / Dokument mit Häkchen)
  - Titel "Rundlaufbeschluss"
  - Untertitel "Schriftlich, asynchron"
  - Beschreibung: "Umlaufverfahren für Präsidien gemäß § 21 Abs. 6 der DRK-Satzung. Per E-Mail-Einladung, kein Passwort nötig."
  - Pfeil-Indikator + kleines externes-Link-Icon (inline SVG) rechts daneben, um die Subdomain-Navigation kenntlich zu machen
  - Standard-`<a href="https://rundlauf.drk-abstimmung.de/">` (kein Next-`<Link>`, da andere Subdomain) — gleicher Tab, kein `target="_blank"`
- Mobile: Karten stacken (Touch-Targets ≥ 44px, Hover-State an Tap-Highlight angepasst)
- Keine externen Fonts oder Icons (Konvention aus CLAUDE.md)

### Rundlauf-App (`rundlauf-app/app/page.tsx`)

Innerhalb der `LandingPage()`-Function nach der "So funktioniert es"-Section eine neue Sektion ergänzen:

```tsx
<section className="mt-6 drk-card">
  <h3 className="font-bold mb-2">Sie suchen eine Live-Abstimmung?</h3>
  <p className="text-sm mb-3" style={{ color: 'var(--text-light)' }}>
    Für Echtzeit-Abstimmungen in Versammlungen (mit QR-Code für Teilnehmende) nutzen Sie das Schwester-Tool.
  </p>
  <a href="https://drk-abstimmung.de/versammlung" className="drk-btn-secondary inline-block">
    Zur DRK Vereinsabstimmung →
  </a>
</section>
```

Nur in `LandingPage` (anonyme Ansicht). Authentifizierte Nutzer (`HomePage`) bekommen den Hinweis nicht.

---

## Datenfluss & Routing

| URL | Heute | Nach Änderung |
|---|---|---|
| `/` (ohne Query) | PresenterApp / SetupForm | Portal-Hub |
| `/?vote=ABC` | VoterApp | VoterApp (unverändert) |
| `/?vote=ABC&mode=server` | VoterApp Server | VoterApp Server (unverändert) |
| `/versammlung` | 404 | PresenterApp / SetupForm |
| `https://rundlauf.drk-abstimmung.de/` | LandingPage / HomePage | LandingPage mit zusätzlicher Sektion |

Keine Server-seitigen Redirects — alles über Next.js-Routing.

---

## Sicherheit / CSP

- Externer Link auf Subdomain ist normale Top-Level-Navigation — kein CSP-Eingriff (`connect-src`, `frame-src`, `form-action` bleiben unangetastet).
- Kein `target="_blank"`, also kein `rel="noopener noreferrer"`-Risiko.
- Caddy-Config: unverändert. Beide Subdomains sind bereits in `/srv/ops/caddy/sites/drk-abstimmung.de.caddy` konfiguriert.

---

## Tests / Verifikation

Manuelle Test-Checklist nach Implementation:

- [ ] `/` ohne Query → Portal sichtbar, beide Karten klickbar
- [ ] `/?vote=ABC&mode=server` → VoterApp Server-Modus (Regression!)
- [ ] `/?vote=ABC` → VoterApp P2P-Modus (Regression!)
- [ ] `/versammlung` → SetupForm wie heute auf `/`
- [ ] Klick auf "Versammlung" → Navigation nach `/versammlung`
- [ ] Klick auf "Rundlaufbeschluss" → öffnet `https://rundlauf.drk-abstimmung.de/` im gleichen Tab
- [ ] `https://rundlauf.drk-abstimmung.de/` (ausgeloggt) zeigt Rück-Link auf Versammlung
- [ ] `https://rundlauf.drk-abstimmung.de/` (eingeloggt) zeigt **keinen** Rück-Link
- [ ] Mobile-Layout: Karten stacken, Touch-Targets ≥ 44px
- [ ] Dark/Light-Färbung folgt bestehenden DRK-Tokens

---

## Risiken & bewusste Akzeptanz

| Risiko | Bewertung | Mitigation |
|---|---|---|
| Bookmarks auf `/` zeigen jetzt Portal statt direkt SetupForm | gewollt — das ist der Sinn der Änderung | Doku in `/hilfe` ggf. ergänzen, falls Vorstand Rückfragen hat |
| QR-Code-Regression | hoch (Print-Material existiert) | Tests oben (`/?vote=…`-Cases) sind Pflicht vor Deploy |
| Layout-Erweiterbarkeit | bewusst weggelassen | Wenn später 3. Tool dazukommt, ist Refactor des Portal-Grids ein eigener Spec |
| Stilistische Inkonsistenz zw. abstimmung und rundlauf | gering — beide nutzen DRK-Design-Tokens | DRK-Farben, `drk-card`, identische Buttons |

---

## Touchpoints

| Datei | Art | Aufwand |
|---|---|---|
| `next-app/app/page.tsx` | Refactor (PresenterApp → Portal) | klein |
| `next-app/app/versammlung/page.tsx` | NEU | klein |
| `next-app/components/portal/Portal.tsx` | NEU | mittel |
| `next-app/components/LoadingSpinner.tsx` | NEU (Extraktion bestehenden Spinners) | trivial |
| `rundlauf-app/app/page.tsx` | Edit `LandingPage()` | klein |

---

## Deployment-Hinweise

- `next-app`: `cd /root/abstimmung && docker compose up -d --build`
- `rundlauf-app`: gleicher Befehl, da die `rundlauf-app/` Teil des `abstimmung/docker-compose.yml` ist (Container `rundlauf`)
- Beide Services laufen am gleichen Tag auf gleichem VPS — kein Versions-Drift möglich
- Health-Check nach Deploy: `/srv/ops/scripts/health-check.sh`
