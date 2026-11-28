"use client";

import { useActionState, useState } from "react";
import { submitVote, type VoteState } from "./actions";
import type { ResolutionOption } from "@/lib/resolution";

const initial: VoteState = { ok: false };

export function VoteForm({
  kv,
  resolutionId,
  agendaItemId,
  options,
  currentOptionId,
  mode,
  alreadyVoted,
  legend,
}: {
  /** Sichtbare Gruppenbezeichnung der Optionen, z. B. "TOP 1: Haushalt". */
  legend: string;
  kv: string;
  resolutionId: string;
  agendaItemId: string;
  options: ResolutionOption[];
  currentOptionId: string | null;
  mode: "aenderbar" | "fest";
  alreadyVoted: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitVote, initial);
  const [selected, setSelected] = useState<string>(currentOptionId ?? "");

  if (mode === "fest" && alreadyVoted) {
    return (
      <div
        className="rounded-lg p-3 text-sm"
        style={{ background: "var(--success-bg)", color: "var(--success)" }}
      >
        Stimme abgegeben (unwiderruflich):{" "}
        <strong>
          {options.find((o) => o.id === currentOptionId)?.label ?? currentOptionId}
        </strong>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (mode !== "fest") return;
        const label = options.find((o) => o.id === selected)?.label ?? selected;
        if (
          !confirm(
            `Stimme „${label}“ verbindlich abgeben?\n\nIn diesem Verfahren kann eine abgegebene Stimme nicht mehr geändert werden.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="kv" value={kv} />
      <input type="hidden" name="resolutionId" value={resolutionId} />
      <input type="hidden" name="agendaItemId" value={agendaItemId} />

      <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
        <legend className="sr-only">Deine Stimme zu {legend}</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className="flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer hover:bg-gray-50"
            style={{ borderColor: selected === o.id ? "var(--drk)" : "var(--border)" }}
          >
            <input
              type="radio"
              name="optionId"
              value={o.id}
              required
              checked={selected === o.id}
              onChange={() => setSelected(o.id)}
              className="w-4 h-4"
              style={{ accentColor: "var(--drk)" }}
            />
            <span className="font-medium">{o.label}</span>
          </label>
        ))}
      </fieldset>

      {state.message ? (
        <div
          role={state.ok ? "status" : "alert"}
          className="rounded-lg p-3 text-sm"
          style={{
            background: state.ok ? "var(--success-bg)" : "var(--drk-bg)",
            color: state.ok ? "var(--success)" : "var(--drk)",
          }}
        >
          {state.message}
        </div>
      ) : null}

      {!selected ? (
        <p className="text-xs" style={{ color: "var(--text-light)" }}>
          Wähle zuerst eine Option, dann kannst du abgeben.
        </p>
      ) : null}
      <button
        type="submit"
        className="drk-btn-primary w-full sm:w-auto sm:self-start"
        disabled={pending || !selected}
      >
        {pending
          ? "Wird gespeichert …"
          : alreadyVoted
            ? "Stimme ändern"
            : mode === "fest"
              ? "Verbindlich abgeben"
              : "Stimme abgeben"}
      </button>

      {mode === "fest" && !alreadyVoted ? (
        <p className="text-xs" style={{ color: "var(--text-light)" }}>
          ⚠ Diese Stimme kann nach Abgabe nicht mehr geändert werden.
        </p>
      ) : null}
    </form>
  );
}
