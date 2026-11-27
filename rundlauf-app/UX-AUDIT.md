# UX-AUDIT.md — Rundlauf-App

UX/UI-Produktionsreife-Prüfung vom 2026-11-27 (ergänzt `SECURITY-AUDIT.md`).

## Methode

- Screenshots aller 29 Routen/Zustände × Desktop 1280 px und Mobil 390 px × anonym/Mitglied/Admin
  (56 Aufnahmen), automatischer WCAG-2.1-AA-Check mit axe-core 4.10 je Seite, Meta-Checks
  (Titel, Überschriftenstruktur, Labels, Klickziele, horizontaler Überlauf, Konsolen-/Hydration-Fehler).
- Acht unabhängige Review-Agenten je Dimension (Barrierefreiheit, Admin-Fluss, Mitglieder-Fluss,
  Design-System, Mobil, Texte, Formulare, E-Mail/PDF) mit Code-, Screenshot- und Live-Prüfung;
  167 Rohbefunde, nach Dedup und Plausibilisierung umgesetzt.
- Nachmessung auf dem Produktions-Image aus diesem Branch in einem isolierten Stack:
  Browser-E2E (43 Prüfpunkte) und axe-Lauf (56 Aufnahmen).

## Kriterien und Status

| Kriterium | vorher | nachher |
|---|---|---|
| axe-core: keine serious/critical-Verstöße | 56 color-contrast, 2 label, 4 select-name, 4 progressbar-name | **0 Verstöße** (auch moderate) |
| Hauptflüsse am 390-px-Gerät ohne horizontalen Scroll | 1 Seite mit Überlauf, gequetschte TOP-Karten/Titel | kein Überlauf |
| Seitentitel und Überschriften | 2× h1 je Seite, 5 Seiten ohne h1, Titel uneinheitlich | 1 h1 je Seite, Titel-Template |
| Formulare: Pflichtfelder, Pending, verständliche Meldungen | englische Zod-Texte, Eingaben gingen bei Fehlern verloren | deutsch, Eingaben bleiben, role=status/alert |
| Irreversible Aktionen mit Bestätigung und Folgen | nur generisches „bist du sicher?“, Fest-Modus ohne Dialog | Eröffnen/Abschließen/Zurückziehen/Entfernen/Fest-Stimme mit Folgen |
| Fehlerzustände | ungültiger Link stumm, englische 404/Error-Seiten, Mailfehler → Technikseite | erklärt, deutsch, Rücksprung zur Zielseite nach Login |
| Texte konsistent, Hilfe stimmt mit Verhalten überein | „Magic-Link“, falsche Optionen/Status in der Hilfe | angeglichen |
| E-Mails und PDF | kein Reply-To, keine Ergebnis-Mail, PDF schnitt Titel ab, Aachener Satzung hart codiert | Reply-To, Ergebnis-Mail, Umbrüche/Metadaten, generisch |
| Tastatur/Fokus | Browser-Standard-Fokus, Radio-Gruppen ohne Legende | sichtbarer Fokusring, fieldset/legend |
| Konsolen-/Hydration-Fehler | 1 (React #418 auf /admin) | 0 |

## Bewusste Entscheidungen

- `--drk-bg` von `#fef2f2` auf `#fff5f5`: DRK-Rot als Text erreicht damit 4,6:1 (WCAG AA) statt 4,46:1.
  Abweichung vom Token in `CLAUDE.md`, visuell nicht wahrnehmbar.
- Header ohne Spenden-Icon und Footer mit drei Links: Rundlauf ist ein internes Gremien-Werkzeug; die
  „IMMER gleich“-Vorgabe aus `CLAUDE.md` gilt für die öffentliche Live-Abstimmung. Entscheidung Owner.
- PDF nutzt weiterhin Helvetica (WinAnsi): Namen mit Zeichen außerhalb (Ł, Ş, Đ) würden fehlerhaft
  gedruckt. Ein eingebetteter Unicode-Font ist vorbereitet denkbar, wurde wegen Bundle-Größe vertagt.
- Nicht umgesetzt (P2, Produktentscheidung): Suchfeld in der Stimmberechtigten-Auswahl, Onboarding-
  Karte für neue Kreisverbände, manuelle Erinnerung, Eingeladene bei Eröffnung per Mail informieren.
- Telefonnummern in Impressum (02405 6038-0) und Datenschutzerklärung (02405 6039-100) weichen
  voneinander ab; welche gilt, muss der Verantwortliche klären.

## Wiederholen der Messung

Siehe Smoke-Harness-Beschreibung im Ops-Repo (`/srv/ops/docs/runbook.md` → Rundlauf) bzw.
`shots.mjs`/`test.mjs` des Audit-Scratchpads: Image bauen, isolierten Compose-Stack starten,
Seed einspielen, Playwright-Container im Netz-Namespace des App-Containers starten.
