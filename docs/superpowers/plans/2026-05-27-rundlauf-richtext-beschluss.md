# Rundlauf Rich-Text für Beschlussvorschlag und Sachlage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beschlussvorschlag und Sachlage erhalten einen Tiptap-Markdown-Editor mit Fett/Kursiv/Listen; die Anzeige wird formatiert und ab ~10 Zeilen einklappbar.

**Architektur:** Markdown-Speicherung in den bestehenden DB-Spalten `*Md` (keine Migration), neuer Client-Editor schreibt in ein hidden `<input>`, sodass Server-Actions unverändert bleiben. Anzeige via `marked` + DOMPurify in einer Collapse-Komponente. PDF-Export entfernt Markdown-Syntax vor dem Druck.

**Tech-Stack:** Next.js 16 App Router, React 19, Tiptap v2 (`@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown`), `marked`, `dompurify`, jsPDF.

**Spec:** `docs/superpowers/specs/2026-05-27-rundlauf-richtext-beschluss-design.md`

**Branch:** `feat/rundlauf-richtext-beschluss` (existiert bereits, Spec ist als `dadc242` committet).

**Verifizierung:** Das Repo hat aktuell kein Test-Framework. Wir verifizieren über `npm run build`, `npm run lint`, einen kleinen `tsx`-Smoke-Test für die Pure-Function `stripMarkdown` und manuelle Browser-Verifikation am Ende.

---

## Datei-Übersicht

**Neu:**
- `rundlauf-app/lib/markdown.ts` — Pure-Function `stripMarkdown` für PDF
- `rundlauf-app/lib/markdown.smoke.ts` — `tsx`-Smoke-Test für `stripMarkdown`
- `rundlauf-app/app/[kv]/_components/collapsible-markdown.tsx` — Render + Collapse-Logik
- `rundlauf-app/app/[kv]/_components/rich-text-editor.tsx` — Tiptap-Editor mit hidden Input

**Modifiziert:**
- `rundlauf-app/package.json` — neue Dependencies
- `rundlauf-app/app/globals.css` — `.rich-text-content` Typografie-Klassen
- `rundlauf-app/lib/pdf.ts` Z. 207–213 — Aufrufe mit `stripMarkdown` umwickeln
- `rundlauf-app/app/[kv]/beschluss/[id]/page.tsx` Z. 259–275 — Voter-View
- `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx` Z. 366–377 (Read-Mode) und Z. 462–480 (Edit-Mode)

---

### Task 1: Dependencies installieren

**Files:**
- Modify: `rundlauf-app/package.json` (und `package-lock.json`)

- [ ] **Step 1: Dependencies installieren**

```bash
cd /root/abstimmung/rundlauf-app
npm install @tiptap/react @tiptap/starter-kit tiptap-markdown marked dompurify
npm install --save-dev @types/dompurify
```

- [ ] **Step 2: Build prüfen, dass alles weiterhin kompiliert**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: Build erfolgreich (`✓ Compiled successfully`). Keine neuen TS-Fehler, da noch kein Code die Pakete nutzt.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/package.json rundlauf-app/package-lock.json
git commit -m "chore(rundlauf): add tiptap, marked, dompurify deps"
```

---

### Task 2: `stripMarkdown` Pure-Function + Smoke-Test

**Files:**
- Create: `rundlauf-app/lib/markdown.ts`
- Create: `rundlauf-app/lib/markdown.smoke.ts`

- [ ] **Step 1: Implementierung schreiben**

`rundlauf-app/lib/markdown.ts`:

```ts
/**
 * Entfernt einfache Markdown-Marken vor dem PDF-Druck.
 * Behandelt nur die Marks, die unser Editor produziert:
 *   **fett** / __fett__, *kursiv* / _kursiv_, - listenpunkt
 * Lässt nummerierte Listen ("1. …") unverändert — sind ohnehin lesbar.
 */
export function stripMarkdown(input: string | null | undefined): string {
  if (!input) return "";
  return input
    // Inline-Marks: bold (greedy, aber nicht über Zeilen hinweg)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    // Inline-Marks: italic
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1$2")
    // Listenpunkt am Zeilenanfang: "- " oder "* " → "• "
    .replace(/^[ \t]*[-*][ \t]+/gm, "• ");
}
```

- [ ] **Step 2: Smoke-Test schreiben**

`rundlauf-app/lib/markdown.smoke.ts`:

```ts
import { strict as assert } from "node:assert";
import { stripMarkdown } from "./markdown";

function expect(label: string, input: string, expected: string) {
  const actual = stripMarkdown(input);
  assert.equal(actual, expected, `${label}: got ${JSON.stringify(actual)}`);
  console.log(`ok  ${label}`);
}

expect("plain text passes through", "Hallo Welt", "Hallo Welt");
expect("bold wird entfernt", "Wir **beschließen** X", "Wir beschließen X");
expect("italic wird entfernt", "Hinweis: *wichtig*", "Hinweis: wichtig");
expect("kombiniert", "Der **Vorstand** *empfiehlt*", "Der Vorstand empfiehlt");
expect(
  "listenpunkte werden bullets",
  "Beschluss:\n- Punkt eins\n- Punkt zwei",
  "Beschluss:\n• Punkt eins\n• Punkt zwei",
);
expect(
  "nummerierte liste bleibt",
  "1. erstens\n2. zweitens",
  "1. erstens\n2. zweitens",
);
expect("leerer string", "", "");
expect("null wird leer", null as unknown as string, "");

console.log("\nstripMarkdown: alle Erwartungen erfüllt.");
```

- [ ] **Step 3: Smoke-Test laufen lassen**

```bash
cd /root/abstimmung/rundlauf-app && npx tsx lib/markdown.smoke.ts
```

Expected:
```
ok  plain text passes through
ok  bold wird entfernt
ok  italic wird entfernt
ok  kombiniert
ok  listenpunkte werden bullets
ok  nummerierte liste bleibt
ok  leerer string
ok  null wird leer

stripMarkdown: alle Erwartungen erfüllt.
```

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/markdown.ts rundlauf-app/lib/markdown.smoke.ts
git commit -m "feat(rundlauf): stripMarkdown helper für PDF-Export"
```

---

### Task 3: PDF-Export auf `stripMarkdown` umstellen

**Files:**
- Modify: `rundlauf-app/lib/pdf.ts` Z. 207–213

- [ ] **Step 1: Import ergänzen**

Am Kopf von `rundlauf-app/lib/pdf.ts` (nach den bestehenden Imports):

```ts
import { stripMarkdown } from "./markdown";
```

- [ ] **Step 2: Aufrufe von `labeledBlock` für die zwei Felder umwickeln**

Ersetze in `rundlauf-app/lib/pdf.ts` Zeilen ~207–213:

```ts
  // Beschlussvorschlag
  if (top.beschlussvorschlagMd) {
    y = labeledBlock(doc, "Beschlussvorschlag", top.beschlussvorschlagMd, y);
  }
  // Sachlage
  if (top.sachlageMd) {
    y = labeledBlock(doc, "Sachlage", top.sachlageMd, y);
  }
```

durch:

```ts
  // Beschlussvorschlag (Markdown → Plaintext für PDF)
  if (top.beschlussvorschlagMd) {
    y = labeledBlock(doc, "Beschlussvorschlag", stripMarkdown(top.beschlussvorschlagMd), y);
  }
  // Sachlage (Markdown → Plaintext für PDF)
  if (top.sachlageMd) {
    y = labeledBlock(doc, "Sachlage", stripMarkdown(top.sachlageMd), y);
  }
```

`finanzielleAuswirkungen` und `auskunftErteilen` bleiben **unverändert** (keine Rich-Text-Felder).

- [ ] **Step 3: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich, keine TS-Fehler.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/lib/pdf.ts
git commit -m "feat(rundlauf): pdf strippt Markdown-Syntax vor dem Druck"
```

---

### Task 4: CSS-Klasse `.rich-text-content` in `globals.css`

**Files:**
- Modify: `rundlauf-app/app/globals.css` (am Ende des Form-Bereichs ergänzen)

- [ ] **Step 1: CSS-Block einfügen**

Hänge an `rundlauf-app/app/globals.css` direkt nach dem `.drk-label`-Block (nach Zeile ~154) folgendes an:

```css

/* ── Rich-Text-Anzeige (Beschluss/Sachlage) ── */
.rich-text-content {
  font-size: 0.875rem;
  line-height: 1.5rem;
  color: var(--text);
}
.rich-text-content p { margin: 0 0 0.75rem 0; }
.rich-text-content p:last-child { margin-bottom: 0; }
.rich-text-content strong { font-weight: 700; }
.rich-text-content em { font-style: italic; }
.rich-text-content ul { margin: 0.5rem 0 0.75rem 1.25rem; list-style: disc; }
.rich-text-content ol { margin: 0.5rem 0 0.75rem 1.25rem; list-style: decimal; }
.rich-text-content li { margin: 0.125rem 0; }

/* Collapse-Wrapper: dezenter Fade am unteren Rand wenn collapsed */
.rich-text-collapse-wrapper {
  position: relative;
}
.rich-text-collapse-wrapper[data-collapsed="true"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.5rem;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1));
}

/* ── Tiptap-Editor: Erscheinungsbild wie .drk-input ── */
.rich-text-editor {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  background: white;
}
.rich-text-editor:focus-within {
  outline: none;
  border-color: var(--drk);
  box-shadow: 0 0 0 3px rgba(227, 6, 19, 0.15);
}
.rich-text-editor-toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--border);
  background: #f8f9fa;
  border-top-left-radius: var(--radius);
  border-top-right-radius: var(--radius);
}
.rich-text-editor-toolbar button {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  min-width: 2rem;
}
.rich-text-editor-toolbar button:hover {
  background: #e9ecef;
}
.rich-text-editor-toolbar button[data-active="true"] {
  background: #e9ecef;
  border-color: var(--border);
  font-weight: 700;
}
.rich-text-editor .ProseMirror {
  padding: 0.75rem 1rem;
  min-height: 15rem;
  outline: none;
  font-size: 1rem;
}
.rich-text-editor .ProseMirror p { margin: 0 0 0.75rem 0; }
.rich-text-editor .ProseMirror p:last-child { margin-bottom: 0; }
.rich-text-editor .ProseMirror ul { margin: 0.5rem 0 0.75rem 1.25rem; list-style: disc; }
.rich-text-editor .ProseMirror ol { margin: 0.5rem 0 0.75rem 1.25rem; list-style: decimal; }
.rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
  float: left;
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/globals.css
git commit -m "feat(rundlauf): rich-text und collapse styles"
```

---

### Task 5: `CollapsibleMarkdown`-Komponente

**Files:**
- Create: `rundlauf-app/app/[kv]/_components/collapsible-markdown.tsx`

- [ ] **Step 1: Komponente schreiben**

`rundlauf-app/app/[kv]/_components/collapsible-markdown.tsx`:

```tsx
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Props = {
  markdown: string | null | undefined;
  collapsedLines?: number;
  forceExpanded?: boolean;
  className?: string;
};

const ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li"];
const LINE_HEIGHT_PX = 24; // muss zu .rich-text-content line-height passen

marked.setOptions({
  gfm: true,
  breaks: false, // Soft-Break per Zeilenumbruch deaktiviert (wir nutzen <br> aus dem Editor)
});

export function CollapsibleMarkdown({
  markdown,
  collapsedLines = 10,
  forceExpanded = false,
  className,
}: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  const html = useMemo(() => {
    if (!markdown) return "";
    const raw = marked.parse(markdown, { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: [],
    });
  }, [markdown]);

  useLayoutEffect(() => {
    if (forceExpanded) {
      setNeedsCollapse(false);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const collapsedHeight = collapsedLines * LINE_HEIGHT_PX;
    setNeedsCollapse(el.scrollHeight > collapsedHeight + 1);
  }, [html, collapsedLines, forceExpanded]);

  if (!markdown || !html) return null;

  const showCollapsed = needsCollapse && !expanded && !forceExpanded;
  const maxHeight = showCollapsed ? `${collapsedLines * LINE_HEIGHT_PX}px` : undefined;

  return (
    <div className={className}>
      <div
        className="rich-text-collapse-wrapper"
        data-collapsed={showCollapsed ? "true" : "false"}
      >
        <div
          ref={contentRef}
          className="rich-text-content"
          style={{
            maxHeight,
            overflow: showCollapsed ? "hidden" : "visible",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {needsCollapse && !forceExpanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs underline"
          style={{ color: "var(--drk)" }}
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich. Hinweis: Die Komponente wird in diesem Schritt noch nicht importiert, das ist OK — Build prüft trotzdem ihre TS-Korrektheit.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/\[kv\]/_components/collapsible-markdown.tsx
git commit -m "feat(rundlauf): CollapsibleMarkdown component"
```

---

### Task 6: `RichTextEditor`-Komponente

**Files:**
- Create: `rundlauf-app/app/[kv]/_components/rich-text-editor.tsx`

- [ ] **Step 1: Komponente schreiben**

`rundlauf-app/app/[kv]/_components/rich-text-editor.tsx`:

```tsx
"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

export function RichTextEditor({
  name,
  defaultValue,
  required,
  ariaLabel,
  placeholder,
}: Props) {
  const initial = defaultValue ?? "";
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState<string>(initial);

  const editor = useEditor({
    immediatelyRender: false, // verhindert SSR/Hydration-Mismatch
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Markdown.configure({
        html: false,
        breaks: false,
        transformPastedText: true,
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel ?? name,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => {
      // tiptap-markdown exponiert editor.storage.markdown.getMarkdown()
      const md = editor.storage.markdown.getMarkdown() as string;
      setValue(md);
    },
  });

  // Falls die Form per JS submitted wird, ist `value` immer aktuell.
  useEffect(() => {
    if (hiddenRef.current) hiddenRef.current.value = value;
  }, [value]);

  if (!editor) {
    // SSR-Fallback: rendert hidden input mit initial-Wert, damit das Feld bei
    // direktem Submit (ohne JS-Hydration) trotzdem ankommt.
    return (
      <div className="rich-text-editor">
        <input ref={hiddenRef} type="hidden" name={name} defaultValue={initial} required={required} />
        <div className="ProseMirror" />
      </div>
    );
  }

  return (
    <div className="rich-text-editor">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={initial} required={required} />
      <div className="rich-text-editor-toolbar">
        <button
          type="button"
          data-active={editor.isActive("bold")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fett (Strg+B)"
        >
          <strong>F</strong>
        </button>
        <button
          type="button"
          data-active={editor.isActive("italic")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (Strg+I)"
        >
          <em>K</em>
        </button>
        <button
          type="button"
          data-active={editor.isActive("bulletList")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Aufzählung"
        >
          • Liste
        </button>
        <button
          type="button"
          data-active={editor.isActive("orderedList")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Nummerierte Liste"
        >
          1. Liste
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
```

- [ ] **Step 2: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich. Wenn TS über `editor.storage.markdown` meckert, ist die Cast-Lösung oben (`as string`) bereits eingebaut.

- [ ] **Step 3: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/\[kv\]/_components/rich-text-editor.tsx
git commit -m "feat(rundlauf): RichTextEditor (tiptap + markdown-output)"
```

---

### Task 7: Voter-View (`page.tsx`) auf `CollapsibleMarkdown` umstellen

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/page.tsx` Z. 1–25 (Import), Z. 259–275 (Beschluss/Sachlage)

- [ ] **Step 1: Import ergänzen**

In `rundlauf-app/app/[kv]/beschluss/[id]/page.tsx` direkt nach Zeile 24 (`import { ResolutionStatus } …`):

```tsx
import { CollapsibleMarkdown } from "../../_components/collapsible-markdown";
```

- [ ] **Step 2: Beschluss/Sachlage-Blöcke ersetzen**

Ersetze in `rundlauf-app/app/[kv]/beschluss/[id]/page.tsx` Zeilen ~259–275:

```tsx
            {top.beschlussvorschlagMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Beschlussvorschlag
                </div>
                <div className="whitespace-pre-wrap mt-1">{top.beschlussvorschlagMd}</div>
              </div>
            ) : null}

            {top.sachlageMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Sachlage
                </div>
                <div className="whitespace-pre-wrap mt-1 text-sm">{top.sachlageMd}</div>
              </div>
            ) : null}
```

durch:

```tsx
            {top.beschlussvorschlagMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Beschlussvorschlag
                </div>
                <CollapsibleMarkdown
                  markdown={top.beschlussvorschlagMd}
                  collapsedLines={10}
                  className="mt-1"
                />
              </div>
            ) : null}

            {top.sachlageMd ? (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
                  Sachlage
                </div>
                <CollapsibleMarkdown
                  markdown={top.sachlageMd}
                  collapsedLines={10}
                  className="mt-1"
                />
              </div>
            ) : null}
```

- [ ] **Step 3: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/\[kv\]/beschluss/\[id\]/page.tsx
git commit -m "feat(rundlauf): voter-view rendert beschluss/sachlage formatiert"
```

---

### Task 8: Editor-Read-Mode (`draft-editor.tsx`) auf `CollapsibleMarkdown` umstellen

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx` Imports + Z. 366–377

- [ ] **Step 1: Import ergänzen**

In `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx` nach den bestehenden Imports (nach Zeile 14):

```tsx
import { CollapsibleMarkdown } from "../../../_components/collapsible-markdown";
```

- [ ] **Step 2: Read-Mode-Blöcke ersetzen**

Ersetze in `draft-editor.tsx` Zeilen ~366–377:

```tsx
        {top.beschlussvorschlagMd ? (
          <div className="mt-3 whitespace-pre-wrap text-sm">
            <strong>Beschlussvorschlag:</strong>
            <div className="mt-1">{top.beschlussvorschlagMd}</div>
          </div>
        ) : null}
        {top.sachlageMd ? (
          <div className="mt-3 whitespace-pre-wrap text-sm">
            <strong>Sachlage:</strong>
            <div className="mt-1">{top.sachlageMd}</div>
          </div>
        ) : null}
```

durch:

```tsx
        {top.beschlussvorschlagMd ? (
          <div className="mt-3 text-sm">
            <strong>Beschlussvorschlag:</strong>
            <CollapsibleMarkdown
              markdown={top.beschlussvorschlagMd}
              collapsedLines={10}
              className="mt-1"
            />
          </div>
        ) : null}
        {top.sachlageMd ? (
          <div className="mt-3 text-sm">
            <strong>Sachlage:</strong>
            <CollapsibleMarkdown
              markdown={top.sachlageMd}
              collapsedLines={10}
              className="mt-1"
            />
          </div>
        ) : null}
```

- [ ] **Step 3: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich.

- [ ] **Step 4: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/\[kv\]/beschluss/\[id\]/bearbeiten/draft-editor.tsx
git commit -m "feat(rundlauf): editor-read-mode rendert beschluss/sachlage formatiert"
```

---

### Task 9: Edit-Mode-Textareas durch `RichTextEditor` ersetzen

**Files:**
- Modify: `rundlauf-app/app/[kv]/beschluss/[id]/bearbeiten/draft-editor.tsx` Imports (dynamic import) + Z. 462–480 (TopFields)

- [ ] **Step 1: Dynamischen Import ergänzen**

Direkt unter dem bestehenden `CollapsibleMarkdown`-Import (aus Task 8) in `draft-editor.tsx`:

```tsx
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../../_components/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="rich-text-editor" style={{ minHeight: "16rem" }} /> },
);
```

`dynamic` + `ssr: false` hält Tiptap aus dem Server-Bundle raus und vermeidet Hydration-Mismatch.

- [ ] **Step 2: Beschlussvorschlag- und Sachlage-Textarea ersetzen**

Ersetze in `draft-editor.tsx` Zeilen ~458–480 (in `TopFields`):

```tsx
      <div>
        <label className="drk-label">
          Beschlussvorschlag <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <textarea
          name="beschlussvorschlag"
          required
          rows={4}
          defaultValue={defaultBeschluss}
          className="drk-input"
          placeholder="Konkrete Beschlussfassung, über die abgestimmt wird."
        />
      </div>
      <div>
        <label className="drk-label">Sachlage / Erläuterung</label>
        <textarea
          name="sachlage"
          rows={4}
          defaultValue={defaultSachlage}
          className="drk-input"
          placeholder="Hintergrund, Sachstand, Begründung."
        />
      </div>
```

durch:

```tsx
      <div>
        <label className="drk-label">
          Beschlussvorschlag <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <RichTextEditor
          name="beschlussvorschlag"
          defaultValue={defaultBeschluss}
          required
          ariaLabel="Beschlussvorschlag"
          placeholder="Konkrete Beschlussfassung, über die abgestimmt wird."
        />
      </div>
      <div>
        <label className="drk-label">Sachlage / Erläuterung</label>
        <RichTextEditor
          name="sachlage"
          defaultValue={defaultSachlage}
          ariaLabel="Sachlage"
          placeholder="Hintergrund, Sachstand, Begründung."
        />
      </div>
```

`finanzielleAuswirkungen` und `auskunftErteilen` bleiben **unverändert** als `<input>` bzw. `<textarea>`.

- [ ] **Step 3: Build prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run build
```

Expected: erfolgreich. Tiptap landet in einem eigenen JS-Chunk für die `bearbeiten`-Route.

- [ ] **Step 4: Lint prüfen**

```bash
cd /root/abstimmung/rundlauf-app && npm run lint
```

Expected: keine neuen Errors. Warnings (etwa zu `dangerouslySetInnerHTML` in `CollapsibleMarkdown`) sind akzeptabel — der Sanitizer rechtfertigt das.

- [ ] **Step 5: Commit**

```bash
cd /root/abstimmung
git add rundlauf-app/app/\[kv\]/beschluss/\[id\]/bearbeiten/draft-editor.tsx
git commit -m "feat(rundlauf): edit-mode nutzt RichTextEditor für Beschluss/Sachlage"
```

---

### Task 10: Manuelle Verifikation gegen Akzeptanzkriterien

Dieser Schritt wird nicht automatisiert. Er produziert ein kurzes Verifikations-Protokoll und ggf. einen Fix-Commit.

**Files:**
- ggf. Modify: bei Bugs

- [ ] **Step 1: Container neu bauen und deployen**

```bash
cd /root/abstimmung && docker compose up -d --build rundlauf
```

Warte bis `docker ps` `rundlauf` als healthy/running zeigt:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep rundlauf
```

- [ ] **Step 2: Browser-Verifikation — Edit-Mode**

Login auf `https://drk-abstimmung.de/<test-kv>` als Admin, einen Entwurfs-TOP öffnen.

Prüfen (Akzeptanzkriterien 1–3 aus Spec):
1. Beschlussvorschlag: Text eingeben, ein Wort markieren, „F"-Button klicken → wird fett angezeigt
2. Mehrere Absätze über Enter erfassen
3. Liste via „• Liste"-Button erstellen, zwei Punkte
4. Dasselbe für Sachlage
5. Speichern → ohne Fehler

- [ ] **Step 3: Browser-Verifikation — Read-Mode + Voter-View**

Nach Speichern:
6. Im Editor-Read-Mode (Bearbeiten-Seite, nicht-editierender TOP) erscheinen Fett, Liste, Absätze korrekt formatiert (Akzeptanzkriterium 4 für Editor-Read-Mode)
7. Beschluss versenden (Test-Empfänger) und Voter-View öffnen — Beschlussvorschlag + Sachlage formatiert (Akzeptanzkriterium 4)

- [ ] **Step 4: Browser-Verifikation — Collapse**

8. Im Editor einen sehr langen Text einfügen (≥ 15 Zeilen), speichern
9. In Voter-View und Editor-Read-Mode wird der Text auf ~10 Zeilen begrenzt, Button „Mehr anzeigen" erscheint (Akzeptanzkriterien 5+6)
10. Klick auf „Mehr anzeigen" → voller Text, Button wird zu „Weniger anzeigen" (Akzeptanzkriterium 9 aus ursprünglicher Anleitung)
11. Kurze Texte (< 10 Zeilen) zeigen keinen Button

- [ ] **Step 5: Plaintext-Backwards-Compat**

12. Prüfen, dass ein älterer Beschluss (mit reinem Plaintext in `beschlussvorschlagMd`) weiterhin korrekt angezeigt wird — Doppelumbruch wird Absatz (Akzeptanzkriterium 7)

- [ ] **Step 6: PDF-Export**

13. Aus der Voter-View den PDF-Export auslösen (falls UI-Button vorhanden) oder einen abgeschlossenen Beschluss exportieren
14. PDF öffnen — Beschlussvorschlag und Sachlage zeigen den vollständigen Text, keine `**` oder `*` Zeichen sichtbar, Listenpunkte als `•` (Akzeptanzkriterium 8)

- [ ] **Step 7: Verifikations-Ergebnis dokumentieren**

In der Commit-Message des nächsten Commits (oder als Notiz in der PR) die Punkte 1–14 abhaken. Falls Probleme auftraten: separate Fix-Commits mit klarer Message.

- [ ] **Step 8: Branch-Status**

```bash
cd /root/abstimmung && git log --oneline main..feat/rundlauf-richtext-beschluss
```

Expected: 7–8 Commits — Spec + Deps + stripMarkdown + PDF + CSS + CollapsibleMarkdown + RichTextEditor + Voter-View + Editor-Read + Editor-Edit + ggf. Fixes.

---

## Hinweise

- **Branch existiert bereits** als `feat/rundlauf-richtext-beschluss` mit der Spec als ersten Commit. Alle weiteren Commits auf diesen Branch.
- **Keine DB-Migration**: Spalten `beschlussvorschlag_md` / `sachlage_md` bleiben unverändert. Bestandsdaten funktionieren live.
- **Tiptap-Bundle**: ~70–80kB minified, landet dank `dynamic({ ssr: false })` nur im Bearbeiten-Route-Chunk. `marked` (~30kB) + `dompurify` (~20kB) sind in Voter-View und Editor-Read-Mode geladen — das ist akzeptabel, weil diese Komponenten die zentrale Funktionalität tragen.
- **XSS**: `CollapsibleMarkdown` ist der einzige Ort mit `dangerouslySetInnerHTML`. DOMPurify-Sanitize läuft direkt davor, mit strikter Allowlist. Nicht woanders kopieren.
- **DB_PASSWORD-Guard** ([[feedback_db_password_env_guard]]): vor `docker compose up` auf Prod sicherstellen, dass `DB_PASSWORD` im Umfeld gesetzt ist.
