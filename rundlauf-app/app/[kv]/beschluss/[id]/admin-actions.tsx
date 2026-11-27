"use client";

import { useState, useTransition } from "react";
import { closeResolution, withdrawResolution } from "./actions";

type Props = {
  kv: string;
  resolutionId: string;
  pastDeadline: boolean;
};

export function AdminActions({ kv, resolutionId, pastDeadline }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function trigger(fn: typeof closeResolution, confirmText: string) {
    if (!confirm(confirmText)) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("resolutionId", resolutionId);
    startTransition(async () => {
      try {
        const r = await fn(null, fd);
        setMsg(r.message ?? null);
      } catch (err) {
        // Häufigster Fall: Server-Action-ID-Mismatch nach Deployment-Wechsel
        // (veralteter Tab). Klick scheint zu versanden, weil das Promise
        // rejected und kein Feedback gesetzt wird. Reload räumt das auf.
        console.error("[admin-actions] action failed", err);
        setMsg(
          "Aktion fehlgeschlagen. Bitte Seite mit Strg+Shift+R (bzw. Cmd+Shift+R) neu laden und erneut versuchen.",
        );
      }
    });
  }

  const closeLabel = pastDeadline ? "Jetzt abschließen" : "Vorzeitig abschließen";
  const closeConfirm = pastDeadline
    ? "Verfahren jetzt abschließen? Das Ergebnis wird mit den vorliegenden Stimmen endgültig festgestellt und protokolliert. Das lässt sich nicht rückgängig machen."
    : "Verfahren vorzeitig abschließen? Noch ausstehende Stimmen werden nicht mehr gezählt; das Ergebnis wird mit dem aktuellen Stand endgültig festgestellt. Das lässt sich nicht rückgängig machen.";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => trigger(closeResolution, closeConfirm)}
        disabled={pending}
        className="drk-btn-secondary"
      >
        {closeLabel}
      </button>
      <button
        type="button"
        onClick={() =>
          trigger(
            withdrawResolution,
            "Verfahren zurückziehen? Es wird ohne Auszählung beendet und als zurückgezogen protokolliert. Das lässt sich nicht rückgängig machen.",
          )
        }
        disabled={pending}
        className="drk-btn-secondary"
      >
        Zurückziehen
      </button>
      {msg ? (
        <span className="text-sm" style={{ color: "var(--text-light)" }}>
          {msg}
        </span>
      ) : null}
    </div>
  );
}
