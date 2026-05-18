"use client";

import { useActionState, useRef } from "react";
import { createResolution, type CreateResolutionState } from "./actions";

const initial: CreateResolutionState = { ok: false };

function computeDefaultFrist(minDays: number): string {
  const def = new Date(Date.now() + (minDays + 1) * 24 * 60 * 60 * 1000);
  def.setMinutes(0, 0, 0);
  def.setHours(18);
  const offset = def.getTimezoneOffset() * 60_000;
  return new Date(def.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateForm({ kv, minDays }: { kv: string; minDays: number }) {
  const [state, formAction, pending] = useActionState(createResolution, initial);
  const fristRef = useRef<HTMLInputElement>(null);

  // Default-Wert per ref nach Mount setzen, damit Render rein bleibt.
  const onMountInput = (node: HTMLInputElement | null) => {
    fristRef.current = node;
    if (node && !node.value) {
      node.value = computeDefaultFrist(minDays);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="kv" value={kv} />

      <div>
        <label className="drk-label" htmlFor="titel">
          Titel <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <input
          id="titel"
          name="titel"
          required
          maxLength={200}
          className="drk-input"
          placeholder="z.B. Aufnahme neuer Ortsverein Würselen"
        />
      </div>

      <div>
        <label className="drk-label" htmlFor="begruendung">
          Beschlusstext / Begründung
        </label>
        <textarea
          id="begruendung"
          name="begruendung"
          rows={6}
          className="drk-input"
          placeholder="Erläutere den Beschlussgegenstand. Markdown ist erlaubt."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="fristEnde">
            Frist (Ende der Abstimmung) <span style={{ color: "var(--drk)" }}>*</span>
          </label>
          <input
            id="fristEnde"
            name="fristEnde"
            type="datetime-local"
            required
            ref={onMountInput}
            className="drk-input"
          />
        </div>

        <div>
          <label className="drk-label" htmlFor="quorumPct">
            Quorum (%) <span style={{ color: "var(--drk)" }}>*</span>
          </label>
          <input
            id="quorumPct"
            name="quorumPct"
            type="number"
            min={50}
            max={100}
            defaultValue={75}
            required
            className="drk-input"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
            Standard 75 % (§ 21 Abs. 6)
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="mehrheit">
            Erforderliche Mehrheit
          </label>
          <select id="mehrheit" name="mehrheit" defaultValue="simple" className="drk-input">
            <option value="simple">Einfache Mehrheit (&gt; 50 %)</option>
            <option value="two_thirds">Zwei Drittel</option>
            <option value="three_quarters">Drei Viertel</option>
          </select>
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
        {pending ? "Lege an …" : "Beschluss eröffnen und einladen"}
      </button>
    </form>
  );
}
