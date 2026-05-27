# Rundlauf: Rich-Text für Beschlussvorschlag und Sachlage

**Datum:** 2026-05-27
**Scope:** `rundlauf-app` (Domain `drk-abstimmung.de` / Rundlauf-Modul)
**Status:** Design

## Problem

In der Beschlussanzeige werden „Beschlussvorschlag" und „Sachlage" als unformatierter Fließtext mit `whitespace-pre-wrap` ausgegeben. Längere Texte wirken blockartig, sind schwer lesbar und überfrachten die Beschlussansicht vertikal. Im Bearbeitungs-Formular fehlen Möglichkeiten, Schlüsselsätze hervorzuheben oder Aufzählungen sauber zu setzen.

## Ziel

- WYSIWYG-Editor für die beiden Felder mit Fett, Kursiv und Listen
- Formatierte Anzeige in der Voter-View und im Editor-Read-Modus
- Lange Texte werden auf ca. 10 Zeilen begrenzt mit „Mehr anzeigen" / „Weniger anzeigen"
- Bestehende Plaintext-Beschlüsse funktionieren weiter (keine Datenmigration)
- Kein XSS-Risiko durch unsicheres HTML-Rendering
- PDF-Export bleibt funktional, ohne unschöne Markdown-Syntax (`**fett**`)

## Entscheidungen

### Format: Markdown mit Tiptap-Markdown-Output

Statt HTML-Speicherung wie in der ursprünglichen Anleitung skizziert wird Markdown gespeichert. Begründung:

- DB-Spalten heißen bereits `beschlussvorschlagMd` und `sachlageMd` — semantisch konsistent
- Plaintext-Bestandsdaten funktionieren ohne Konvertierung: ein Markdown-Renderer behandelt reinen Text als Absätze
- Keine HTML-Sanitization beim Speichern nötig (Markdown ist text)
- PDF-Export bleibt textbasiert (jsPDF kann kein HTML rendern)
- Editor bleibt WYSIWYG dank `tiptap-markdown` — Nutzer sehen Fett im Editor, gespeichert wird `**fett**`

### Toolbar-Umfang: Fett + Kursiv + Listen

Ungeordnete und geordnete Listen sind in Beschlussvorlagen häufig hilfreich („Der Vorstand beschließt: 1. … 2. …"). StarterKit bringt das ohnehin mit. Headings, Links, Bilder bleiben außen vor.

### PDF: Plaintext-Degradation

Markdown-Syntax wird vor dem PDF-Druck gestrippt (`**fett**` → `fett`, `- item` → `• item`). Begründung:

- jsPDF ist zellbasiert; HTML-Rendering wäre ein viel größerer Eingriff
- Headless-Browser-PDF (Puppeteer) ist für den Scope Overkill
- PDF dient als Dokumentations-Snapshot, formatfreie Lesbarkeit reicht

### Scope: nur Beschlussvorschlag + Sachlage

`finanzielleAuswirkungen` und `auskunftErteilen` bleiben einfache Textfelder. Diese sind typischerweise kurz und brauchen keine Hervorhebung.

## Architektur

```
rundlauf-app/
  app/_components/
    RichTextEditor.tsx          ← NEU: Tiptap + StarterKit + tiptap-markdown
    CollapsibleMarkdown.tsx     ← NEU: marked → DOMPurify → Collapse-Logik
  app/[kv]/beschluss/[id]/
    page.tsx                    ← Voter-View: pre-wrap → CollapsibleMarkdown
    bearbeiten/
      draft-editor.tsx          ← Edit-Mode: textarea → RichTextEditor
                                  Read-Mode: pre-wrap → CollapsibleMarkdown
  app/globals.css               ← .rich-text-content Typografie-Klassen
  lib/
    markdown.ts                 ← NEU: stripMarkdown() für PDF
    pdf.ts                      ← labeledBlock-Argumente via stripMarkdown
  package.json                  ← +@tiptap/react, @tiptap/starter-kit,
                                   tiptap-markdown, marked, dompurify
```

### Datenfluss

Editor (Client) erzeugt Markdown-String → hidden `<input>` → bestehende Server-Action `actions.ts` liest `formData.get("beschlussvorschlag")` unverändert → DB-Spalte `beschlussvorschlag_md` (text, ≤ 20.000 Zeichen wie bisher) → Server-Component liest String → `CollapsibleMarkdown` parst via `marked` → `DOMPurify` mit Allowlist → `dangerouslySetInnerHTML`.

### Datenhaltung

Keine DB-Migration. Spalten bleiben unverändert (`beschlussvorschlagMd text NOT NULL`, `sachlageMd text NULL`).

Bestand: Plaintext-Werte werden bei der Anzeige durch `marked` interpretiert. Reiner Text ohne Markdown-Marker wird zu Absätzen, Doppelzeilenumbrüche zu `<p>` — also visuell identisch zur bisherigen `whitespace-pre-wrap`-Ausgabe.

## Komponenten

### `RichTextEditor.tsx` (Client)

```ts
type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  ariaLabel?: string;
};
```

- Tiptap `EditorContent` mit `StarterKit` (bold, italic, paragraph, bullet/ordered list) und `tiptap-markdown` (Output-Mode `markdown`)
- Toolbar oberhalb: vier Toggle-Buttons — Fett, Kursiv, Liste, nummerierte Liste
- Enter erzeugt neuen Absatz, Shift+Enter Soft-Break (`<br>` / Markdown `  \n`)
- Mindesthöhe ca. 10 Zeilen (`min-h-[15rem]`), Rahmen-Optik analog `.drk-input`
- Hidden `<input type="hidden" name={name}>` synchronisiert Markdown-Output bei jedem `update`-Event — die bestehenden Server-Actions bleiben unverändert
- Initialwert wird als Markdown geladen (Tiptap-Markdown-Extension parst auch Plaintext sauber)
- Import in `draft-editor.tsx` via `next/dynamic({ ssr: false })`, um Hydration-Mismatch durch ProseMirror zu vermeiden

### `CollapsibleMarkdown.tsx` (Client)

```ts
type Props = {
  markdown: string | null | undefined;
  collapsedLines?: number;     // default 10
  forceExpanded?: boolean;
  className?: string;
};
```

- `marked.parse(markdown)` → HTML
- `DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p','br','strong','em','b','i','ul','ol','li'], ALLOWED_ATTR: [] })`
- Rendering in `<div className="rich-text-content" dangerouslySetInnerHTML={{ __html }}>`
- Collapse-Logik per `useRef` + `useLayoutEffect`: misst `scrollHeight`, vergleicht mit `collapsedLines * lineHeight` (Konstante 24px). Wenn größer → Button-Toggle. Wenn nicht → kein Button.
- Stil im collapsed-Zustand: `maxHeight`, `overflow:hidden`, dezenter Fade-Verlauf am unteren Rand via `::after`
- `forceExpanded === true` deaktiviert Collapse vollständig
- Bei `markdown == null || markdown === ''` rendert die Komponente nichts (kein Wrapper)

### `lib/markdown.ts`

```ts
export function stripMarkdown(input: string): string;
```

- Entfernt `**`, `__` (bold), `*`, `_` (italic) als Inline-Marks
- Wandelt Zeilenanfang `- ` und `* ` in `• `
- `1. ` etc. bleiben unverändert (sind bereits lesbar)
- Trimmt keine sonstigen Zeichen — keine Aggressivität, nur kosmetisch

### CSS in `globals.css`

```css
.rich-text-content { font-size: 0.875rem; line-height: 1.5rem; }
.rich-text-content p { margin: 0 0 0.75rem 0; }
.rich-text-content p:last-child { margin-bottom: 0; }
.rich-text-content strong { font-weight: 700; }
.rich-text-content em { font-style: italic; }
.rich-text-content ul { margin: 0.5rem 0 0.75rem 1.25rem; list-style: disc; }
.rich-text-content ol { margin: 0.5rem 0 0.75rem 1.25rem; list-style: decimal; }
```

## Anpassungen pro Datei

### `app/[kv]/beschluss/[id]/page.tsx` (Voter-View)

Zeilen 259–275: die beiden `<div className="whitespace-pre-wrap …">{top.…}</div>` durch
`<CollapsibleMarkdown markdown={top.beschlussvorschlagMd} collapsedLines={10} />`
und entsprechend für `sachlageMd` ersetzen.

### `app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx`

- **Read-Mode (Zeilen 366–377):** beide `<div className="… whitespace-pre-wrap …">` durch `CollapsibleMarkdown` ersetzen
- **Edit-Mode `TopFields` (Zeilen 462–470, 472–480):** die zwei `<textarea name="beschlussvorschlag">` / `<textarea name="sachlage">` durch `<RichTextEditor name="beschlussvorschlag" defaultValue={defaultBeschluss} required />` etc. ersetzen
- `finanzielleAuswirkungen` und `auskunftErteilen` bleiben unverändert

### `lib/pdf.ts`

Zeilen 207–213: Aufrufe um `stripMarkdown(…)` umschließen:
```ts
y = labeledBlock(doc, "Beschlussvorschlag", stripMarkdown(top.beschlussvorschlagMd), y);
y = labeledBlock(doc, "Sachlage", stripMarkdown(top.sachlageMd), y);
```

### `app/[kv]/beschluss/[id]/bearbeiten/actions.ts`

Keine Änderung. `formData.get("beschlussvorschlag")` liefert weiterhin den String, die Zod-`max(20000)`-Validierung gilt unverändert (Markdown-Syntax kostet ein paar Zeichen mehr, fällt aber nicht ins Gewicht).

### `package.json`

Neue Dependencies:
- `@tiptap/react`
- `@tiptap/starter-kit`
- `tiptap-markdown`
- `marked`
- `dompurify`
- `@types/dompurify` (devDependency)

Tiptap wird via `dynamic({ ssr: false })` nur in der Bearbeiten-Route gebündelt.

## Sicherheit

- Editor-Output ist Markdown (Text), keine HTML-Injection beim Speichern
- Anzeige-Pfad: `marked` → `DOMPurify` mit strikter Allowlist (`p`, `br`, `strong`, `em`, `b`, `i`, `ul`, `ol`, `li`), keine Attribute. Damit kein `<script>`, kein `<iframe>`, keine `onclick`-Handler, keine `<a href="javascript:…">`
- `dangerouslySetInnerHTML` ist nur unmittelbar nach DOMPurify-Sanitize vertretbar — nicht woanders im Code wiederverwenden

## Akzeptanzkriterien

1. In der Bearbeitung lassen sich in Beschlussvorschlag und Sachlage Fett, Kursiv und Listen anwenden
2. Mehrere Absätze möglich (Enter), Soft-Break mit Shift+Enter
3. Speicherung erhält die Formatierung (`**` etc. landen in DB, kommen unverändert zurück)
4. Voter-View und Editor-Read-Mode zeigen Fettungen, Kursiv, Listen und Absätze formatiert
5. Texte länger als ~10 Zeilen werden initial gekürzt mit „Mehr anzeigen", pro Bereich eigener State
6. Kurze Texte zeigen keinen Button
7. Bestehende Plaintext-Beschlüsse werden weiterhin korrekt angezeigt (Doppelumbruch wird Absatz)
8. PDF zeigt vollständigen Text, Markdown-Syntax wird vor dem Druck entfernt (kein `**` im PDF), Listen-Bullets bleiben als `•` sichtbar
9. Kein XSS-Risiko: gerendertes HTML stammt ausschließlich aus `marked` + DOMPurify mit Allowlist
10. Tiptap wird nur in der `/[kv]/beschluss/[id]/bearbeiten`-Route gebündelt (Code-Splitting)

## Nicht im Scope

- Rich-Text für `finanzielleAuswirkungen` / `auskunftErteilen`
- Tabellen, Bilder, Links, Headings
- Aktive Migration alter Plaintext-Daten (Live-Konvertierung beim Render genügt)
- Anpassungen an Einladungs-E-Mails (zitieren aktuell keinen Beschlusstext)
- Print-Stylesheets im Web (PDF bleibt der offizielle Druckweg)
