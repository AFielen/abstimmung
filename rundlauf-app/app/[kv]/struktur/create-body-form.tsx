"use client";

import { useActionState } from "react";
import { createBody, type StrukturState } from "./actions";

const initial: StrukturState = { ok: false };

export function CreateBodyForm({
  kv,
  organizationId,
}: {
  kv: string;
  organizationId?: string;
}) {
  const [state, formAction, pending] = useActionState(createBody, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="kv" value={kv} />
      {organizationId ? (
        <input type="hidden" name="organizationId" value={organizationId} />
      ) : null}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className="drk-label" htmlFor={`body-name-${organizationId ?? "free"}`}>
            Name des Gremiums
          </label>
          <input
            id={`body-name-${organizationId ?? "free"}`}
            name="name"
            required
            maxLength={120}
            className="drk-input"
            placeholder="z.B. Präsidium, Aufsichtsrat, Beirat"
          />
        </div>
        <div>
          <label className="drk-label" htmlFor={`body-quorum-${organizationId ?? "free"}`}>
            Standard-Quorum (%)
          </label>
          <input
            id={`body-quorum-${organizationId ?? "free"}`}
            name="defaultQuorumPct"
            type="number"
            min={50}
            max={100}
            defaultValue={75}
            className="drk-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="drk-label" htmlFor={`body-majority-${organizationId ?? "free"}`}>
            Standard-Mehrheit
          </label>
          <select
            id={`body-majority-${organizationId ?? "free"}`}
            name="defaultMehrheit"
            defaultValue="simple"
            className="drk-input"
          >
            <option value="simple">Einfache Mehrheit (&gt; 50 %)</option>
            <option value="two_thirds">Zwei Drittel</option>
            <option value="three_quarters">Drei Viertel</option>
          </select>
        </div>
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
        {pending ? "Lege an …" : "Gremium anlegen"}
      </button>
    </form>
  );
}
