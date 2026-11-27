const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes HTML metacharacters so user-controlled strings (names, tenant
 * names, subjects, rejection reasons) can be interpolated into HTML mail.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}
