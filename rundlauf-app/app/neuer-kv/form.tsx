"use client";

import { useActionState, useState } from "react";
import { createTenant, type CreateTenantState } from "./actions";

const initial: CreateTenantState = { ok: false };

function slugifyLive(v: string): string {
  const m: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  return v
    .trim()
    .replace(/[äöüß]/g, (c) => m[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenant, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  if (state.ok) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--success-bg)", color: "var(--success)" }}
      >
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="drk-label" htmlFor="name">
          Name des Kreisverbands
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(slugifyLive(e.target.value));
          }}
          placeholder="DRK Kreisverband StädteRegion Aachen e.V."
          className="drk-input"
        />
      </div>

      <div>
        <label className="drk-label" htmlFor="slug">
          URL-Kennung
        </label>
        <input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(slugifyLive(e.target.value))}
          placeholder="staedteregion-aachen"
          className="drk-input"
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
          Wird in der URL benutzt: <code>/{slug || "kv-slug"}</code>
        </p>
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
        {pending ? "Sende Antrag …" : "Antrag einreichen"}
      </button>
    </form>
  );
}
