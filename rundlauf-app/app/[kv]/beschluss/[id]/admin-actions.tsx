"use client";

import { useState, useTransition } from "react";
import { closeResolution, withdrawResolution } from "./actions";

export function AdminActions({ kv, resolutionId }: { kv: string; resolutionId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function trigger(fn: typeof closeResolution, label: string) {
    if (!confirm(`${label} – bist du sicher?`)) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("resolutionId", resolutionId);
    startTransition(async () => {
      const r = await fn(null, fd);
      setMsg(r.message ?? null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => trigger(closeResolution, "Beschluss vorzeitig abschließen")}
        disabled={pending}
        className="drk-btn-primary"
      >
        Vorzeitig abschließen
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
