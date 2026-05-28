"use client";

import { useState, useTransition } from "react";
import { resendAllPendingInvites } from "./actions";

type Feedback = { ok: boolean; message: string } | null;

export function ResendAllButton({ kv, count }: { kv: string; count: number }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleClick() {
    if (!confirm(`Einladung an alle ${count} ausstehenden Mitglieder erneut senden?`)) return;
    const fd = new FormData();
    fd.set("kv", kv);
    startTransition(async () => {
      const r = await resendAllPendingInvites(null, fd);
      setFeedback({ ok: r.ok, message: r.message ?? (r.ok ? "Versendet" : "Fehler") });
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="drk-btn-secondary"
        style={{ padding: "0.5rem 0.9rem", minHeight: 0 }}
      >
        {pending ? "Sende …" : `Alle ausstehenden erneut einladen (${count})`}
      </button>
      {feedback ? (
        <div
          className="text-sm rounded-lg p-2"
          style={{
            background: feedback.ok ? "var(--success-bg)" : "var(--drk-bg)",
            color: feedback.ok ? "var(--success)" : "var(--drk)",
          }}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
