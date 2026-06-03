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

  function trigger(fn: typeof closeResolution, confirmLabel: string) {
    if (!confirm(`${confirmLabel} – bist du sicher?`)) return;
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
    ? "Beschluss jetzt abschließen"
    : "Beschluss vorzeitig abschließen";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => trigger(closeResolution, closeConfirm)}
        disabled={pending}
        className="drk-btn-primary"
      >
        {closeLabel}
      </button>
      <button
        type="button"
        onClick={() => trigger(withdrawResolution, "Beschluss zurückziehen")}
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
