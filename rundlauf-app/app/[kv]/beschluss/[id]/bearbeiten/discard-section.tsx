"use client";

import Link from "next/link";
import { useTransition } from "react";
import { discardDraft } from "./actions";

export function DiscardSection({ kv, resolutionId }: { kv: string; resolutionId: string }) {
  const [pending, startTransition] = useTransition();

  function trigger() {
    if (!confirm("Entwurf samt aller TOPs und Anlagen unwiderruflich verwerfen?")) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("resolutionId", resolutionId);
    startTransition(async () => {
      await discardDraft(null, fd);
    });
  }

  return (
    <section className="drk-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Entwurf verwerfen</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
            Löscht diesen Entwurf inklusive aller TOPs und Anlagen.
          </p>
        </div>
        <button type="button" onClick={trigger} disabled={pending} className="drk-btn-secondary">
          {pending ? "Lösche …" : "Entwurf verwerfen"}
        </button>
      </div>
      <Link
        href={`/${kv}`}
        className="text-sm mt-3 inline-block"
        style={{ color: "var(--text-light)" }}
      >
        ← Zurück zur Übersicht
      </Link>
    </section>
  );
}
