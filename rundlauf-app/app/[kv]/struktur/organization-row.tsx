"use client";

import { useState, useTransition } from "react";
import type { Organization } from "@/lib/db/schema";
import { deleteOrganization } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  verein: "Verein",
  gmbh: "GmbH",
  ggmbh: "gGmbH",
  gug: "gUG",
  kdoer: "Körperschaft d.ö.R.",
  sonstige: "Sonstige",
};

export function OrganizationRow({ kv, org }: { kv: string; org: Organization }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Organisation "${org.name}" wirklich löschen? Zugeordnete Gremien bleiben erhalten, verlieren aber den Bezug.`)) {
      return;
    }
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("organizationId", org.id);
    startTransition(async () => {
      const r = await deleteOrganization(null, fd);
      if (!r.ok) setError(r.message ?? "Fehler");
    });
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
          {TYPE_LABEL[org.type] ?? org.type}
        </div>
        <div className="text-lg font-bold">{org.name}</div>
        {org.description ? (
          <div className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
            {org.description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="drk-btn-secondary"
        style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
      >
        Löschen
      </button>
      {error ? (
        <div
          className="w-full text-sm rounded p-2"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
