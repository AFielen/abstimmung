"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestMagicLink, type LoginActionState } from "./actions";

const initialState: LoginActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  if (state.ok) {
    return (
      <div className="drk-fade-in">
        <div
          className="rounded-lg p-4 mb-4"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          {state.message}
        </div>
        <p className="text-sm" style={{ color: "var(--text-light)" }}>
          Falls du keine E-Mail erhältst, prüfe bitte den Spam-Ordner oder
          fordere den Link erneut an.
        </p>
        <Link href="/login" className="drk-btn-secondary mt-4 inline-flex">
          Erneut anfordern
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="drk-label" htmlFor="email">
          E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="dein.name@drk-aachen.de"
          className="drk-input"
        />
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
        {pending ? "Sende Link …" : "Magic-Link senden"}
      </button>
    </form>
  );
}
