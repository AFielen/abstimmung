"use client";

import type { ActionState } from "./actions";

export const initialActionState: ActionState = { ok: false };

export function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm"
      style={{
        background: state.ok ? "var(--success-bg)" : "var(--drk-bg)",
        color: state.ok ? "var(--success)" : "var(--drk)",
      }}
    >
      {state.message}
    </div>
  );
}
