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
