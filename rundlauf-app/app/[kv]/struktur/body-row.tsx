"use client";

import { useState, useTransition } from "react";
import type { Body } from "@/lib/db/schema";
import { archiveBody, deleteBody, unarchiveBody } from "./actions";

const MAJ_LABEL: Record<string, string> = {
  simple: "einfach",
  two_thirds: "2/3",
  three_quarters: "3/4",
};

export function BodyRow({ kv, body }: { kv: string; body: Body }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const archived = Boolean(body.archivedAt);

  function run(fn: typeof archiveBody, confirmMsg: string | null) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("bodyId", body.id);
    startTransition(async () => {
      const r = await fn(null, fd);
      if (!r.ok) setError(r.message ?? "Fehler");
    });
  }

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <div className="font-medium">
          {body.name}
          {archived ? (
            <span className="ml-2 drk-badge-warning">archiviert</span>
          ) : null}
        </div>
        <div className="text-xs" style={{ color: "var(--text-light)" }}>
          Quorum {body.defaultQuorumPct} % · Mehrheit {MAJ_LABEL[body.defaultMehrheit] ?? body.defaultMehrheit}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {archived ? (
          <button
            type="button"
            onClick={() => run(unarchiveBody, null)}
            disabled={pending}
            className="drk-btn-secondary"
            style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
          >
            Wiederherstellen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run(archiveBody, `"${body.name}" archivieren? (nur möglich wenn alle Beschlüsse abgeschlossen)`)}
            disabled={pending}
            className="drk-btn-secondary"
            style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
          >
            Archivieren
          </button>
        )}
        <button
          type="button"
          onClick={() => run(deleteBody, `"${body.name}" endgültig löschen? (nur möglich wenn keine Beschlüsse vorhanden)`)}
          disabled={pending}
          className="drk-btn-secondary"
          style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
        >
          Löschen
        </button>
      </div>
      {error ? (
        <div
          className="w-full text-sm rounded p-2"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          {error}
        </div>
      ) : null}
    </li>
  );
}
