"use client";

import { useActionState } from "react";
import { updateResolutionMeta } from "./actions";
import { Feedback, initialActionState } from "./feedback";

export function MetaForm({
  kv,
  resolutionId,
  betreff,
  fristEnde,
  voteChangeMode,
  minDays,
}: {
  kv: string;
  resolutionId: string;
  betreff: string;
  fristEnde: string;
  voteChangeMode: "aenderbar" | "fest";
  minDays: number;
}) {
  const [state, action, pending] = useActionState(updateResolutionMeta, initialActionState);
  return (
    <section className="drk-card">
      <h2 className="text-lg font-bold mb-3">Verfahrensdaten</h2>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="kv" value={kv} />
        <input type="hidden" name="resolutionId" value={resolutionId} />

        <div>
          <label className="drk-label" htmlFor="betreff">Betreff (optional)</label>
          <input
            id="betreff"
            name="betreff"
            defaultValue={betreff}
            maxLength={200}
            className="drk-input"
            placeholder="z.B. Beschlussvorlagen Sitzung April 2026"
          />
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
              defaultValue={fristEnde}
              required
              className="drk-input"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
              Mind. {minDays} Tage in der Zukunft.
            </p>
          </div>

          <div>
            <label className="drk-label" htmlFor="voteChangeMode">Stimmänderung</label>
            <select
              id="voteChangeMode"
              name="voteChangeMode"
              defaultValue={voteChangeMode}
              className="drk-input"
            >
              <option value="aenderbar">Änderbar bis Fristende</option>
              <option value="fest">Fest – einmalige Abgabe</option>
            </select>
          </div>
        </div>

        <Feedback state={state} />

        <button type="submit" className="drk-btn-secondary self-start" disabled={pending}>
          {pending ? "Speichere …" : "Verfahrensdaten speichern"}
        </button>
      </form>
    </section>
  );
}
