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
}: {
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
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="kv" value={kv} />
      <input type="hidden" name="resolutionId" value={resolutionId} />
      <input type="hidden" name="agendaItemId" value={agendaItemId} />

      <div className="flex flex-col gap-2">
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

      <button type="submit" className="drk-btn-primary self-start" disabled={pending || !selected}>
        {pending
          ? "Speichere …"
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
