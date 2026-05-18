"use client";

import { useActionState } from "react";
import { createOrganization, type StrukturState } from "./actions";

const initial: StrukturState = { ok: false };

const TYPE_OPTIONS = [
  { value: "verein", label: "Verein (e.V.)" },
  { value: "gmbh", label: "GmbH" },
  { value: "ggmbh", label: "gGmbH" },
  { value: "gug", label: "gUG" },
  { value: "kdoer", label: "Körperschaft d.ö.R." },
  { value: "sonstige", label: "Sonstige" },
];

export function CreateOrganizationForm({ kv }: { kv: string }) {
  const [state, formAction, pending] = useActionState(createOrganization, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="kv" value={kv} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="drk-label" htmlFor="org-name">Name</label>
          <input id="org-name" name="name" required maxLength={160} className="drk-input"
            placeholder="DRK Soziale Dienste gGmbH" />
        </div>
        <div>
          <label className="drk-label" htmlFor="org-type">Rechtsform</label>
          <select id="org-type" name="type" defaultValue="ggmbh" className="drk-input">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="drk-label" htmlFor="org-desc">Beschreibung (optional)</label>
        <input id="org-desc" name="description" maxLength={500} className="drk-input" />
      </div>
      {state.message ? (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: state.ok ? "var(--success-bg)" : "var(--drk-bg)",
            color: state.ok ? "var(--success)" : "var(--drk)",
          }}
        >
          {state.message}
        </div>
      ) : null}
      <button type="submit" className="drk-btn-primary" disabled={pending}>
        {pending ? "Lege an …" : "Organisation anlegen"}
      </button>
    </form>
  );
}
