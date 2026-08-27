// Gemeinsame Format- und Label-Helfer.
// Bewusst ohne Node-Builtins, damit auch Client-Komponenten importieren koennen.

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function mehrheitLabel(m: string): string {
  return (
    {
      simple: "Einfache Mehrheit",
      two_thirds: "2/3-Mehrheit",
      three_quarters: "3/4-Mehrheit",
    }[m] ?? m
  );
}

export function statusLabel(s: string): string {
  return (
    {
      draft: "Entwurf",
      laufend: "Laufend",
      abgeschlossen: "Abgeschlossen",
      zurueckgezogen: "Zurückgezogen",
    }[s] ?? s
  );
}

export function statusBadgeClass(s: string): string {
  return (
    {
      draft: "drk-badge-warning",
      laufend: "drk-badge-success",
      abgeschlossen: "drk-badge-error",
      zurueckgezogen: "drk-badge-warning",
    }[s] ?? "drk-badge-warning"
  );
}
