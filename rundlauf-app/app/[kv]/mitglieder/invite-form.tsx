"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "./actions";

const initial: InviteState = { ok: false };

export function InviteForm({ kv }: { kv: string }) {
  const [state, formAction, pending] = useActionState(inviteMember, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="kv" value={kv} />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" required className="drk-input" />
        </div>
        <div>
          <label className="drk-label" htmlFor="name">Name (optional)</label>
          <input id="name" name="name" type="text" className="drk-input" placeholder="Maria Mustermann" />
        </div>
      </div>

      <div>
        <label className="drk-label" htmlFor="role">Rolle</label>
        <select id="role" name="role" defaultValue="member" className="drk-input">
          <option value="member">Mitglied (Präsidium)</option>
          <option value="admin">Administrator</option>
        </select>
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
        {pending ? "Sende Einladung …" : "Einladung versenden"}
      </button>
    </form>
  );
}
