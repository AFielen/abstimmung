import type { z } from "zod";

// Einheitlicher Fehlerzweig nach der Eingabe-Validierung: ohne Argument die
// generische Meldung, mit ZodError die erste Issue-Meldung (gleicher Fallback).
export function invalidInput(error?: z.ZodError): { ok: false; message: string } {
  return { ok: false, message: error?.issues[0]?.message ?? "Ungültige Eingabe" };
}

// Existenz- und Mandanten-Check in einem Prädikat; narrowt row auf nicht-null.
// Reines Prädikat, damit Actions (ActionState) und Route-Handler
// (NextResponse) ihre jeweilige Fehlerantwort behalten können.
export function belongsToTenant<T extends { tenantId: string }>(
  row: T | null | undefined,
  tenantId: string,
): row is T {
  return row != null && row.tenantId === tenantId;
}
