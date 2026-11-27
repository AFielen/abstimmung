"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="drk-card text-center max-w-md mx-auto">
        <span className="drk-badge-error">Fehler</span>
        <h1 className="text-2xl font-bold mt-3 mb-2">Da ist etwas schiefgegangen</h1>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Die Seite konnte nicht geladen werden. Versuche es noch einmal; wenn der Fehler
          bleibt, melde dich beim Vorstandsbüro.
          {error.digest ? (
            <>
              {" "}
              <span className="text-xs">(Kennung {error.digest})</span>
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="drk-btn-primary" onClick={() => reset()}>
            Noch einmal versuchen
          </button>
          <Link href="/" className="drk-btn-secondary">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
