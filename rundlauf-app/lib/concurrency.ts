// Führt fn für alle Items mit begrenzter Parallelität aus; das Ergebnis-Array
// folgt der Eingabereihenfolge. fn sollte Fehler selbst behandeln (z. B. ein
// Fehlerobjekt zurückgeben) — eine Rejection bricht die gesamte Zuordnung ab.
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
