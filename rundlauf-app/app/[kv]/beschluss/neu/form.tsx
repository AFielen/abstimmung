"use client";

import { useActionState, useRef, useState } from "react";
import { createResolution, type CreateResolutionState } from "./actions";

const initial: CreateResolutionState = { ok: false };

export type BodyChoice = {
  id: string;
  name: string;
  organizationName: string | null;
};

function computeDefaultFrist(minDays: number): string {
  const def = new Date(Date.now() + (minDays + 1) * 24 * 60 * 60 * 1000);
  def.setMinutes(0, 0, 0);
  def.setHours(18);
  const offset = def.getTimezoneOffset() * 60_000;
  return new Date(def.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateForm({
  kv,
  minDays,
  bodies,
}: {
  kv: string;
  minDays: number;
  bodies: BodyChoice[];
}) {
  const [state, formAction, pending] = useActionState(createResolution, initial);
  const fristRef = useRef<HTMLInputElement>(null);
  const [bodyId, setBodyId] = useState<string>(bodies[0]?.id ?? "");

  const onMountFrist = (node: HTMLInputElement | null) => {
    fristRef.current = node;
    if (node && !node.value) {
      node.value = computeDefaultFrist(minDays);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="kv" value={kv} />

      {/* Gremium */}
      <div>
        <label className="drk-label" htmlFor="bodyId-select">
          Gremium <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <select
          id="bodyId-select"
          name="bodyId"
          value={bodyId}
          onChange={(e) => setBodyId(e.target.value)}
          className="drk-input"
          required
        >
          {bodies.map((b) => (
            <option key={b.id} value={b.id}>
              {b.organizationName ? `${b.organizationName} · ` : ""}{b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Betreff */}
      <div>
        <label className="drk-label" htmlFor="betreff">
          Betreff (optional)
        </label>
        <input
          id="betreff"
          name="betreff"
          maxLength={200}
          className="drk-input"
          placeholder="z.B. Beschlussvorlagen Sitzung April 2026"
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
          Übergreifender Titel des Umlaufverfahrens. Einzelne TOPs werden im
          nächsten Schritt angelegt.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="fristEnde">
            Frist (Ende) <span style={{ color: "var(--drk)" }}>*</span>
          </label>
          <input
            id="fristEnde"
            name="fristEnde"
            type="datetime-local"
            required
            ref={onMountFrist}
            className="drk-input"
          />
        </div>

        <div>
          <label className="drk-label" htmlFor="voteChangeMode">
            Stimmänderung
          </label>
          <select
            id="voteChangeMode"
            name="voteChangeMode"
            defaultValue="aenderbar"
            className="drk-input"
          >
            <option value="aenderbar">Änderbar bis Fristende</option>
            <option value="fest">Fest – einmalige Abgabe</option>
          </select>
        </div>
      </div>

      {state.message && !state.ok ? (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          {state.message}
        </div>
      ) : null}

      <button type="submit" className="drk-btn-primary" disabled={pending}>
        {pending ? "Lege an …" : "Entwurf anlegen und Inhalte erfassen"}
      </button>

      <p className="text-xs" style={{ color: "var(--text-light)" }}>
        Im nächsten Schritt: Tagesordnungspunkte hinzufügen, Anlagen hochladen,
        Stimmberechtigte auswählen — und dann eröffnen.
      </p>
    </form>
  );
}
