"use client";

import { useState, useTransition } from "react";
import { approveTenant, rejectTenant } from "./actions";

type Props = {
  tenantId: string;
  name: string;
  slug: string;
  createdAt: Date;
  creatorEmail: string;
};

export function ModerationRow({ tenantId, name, slug, createdAt, creatorEmail }: Props) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    const fd = new FormData();
    fd.set("tenantId", tenantId);
    startTransition(async () => {
      const res = await approveTenant(null, fd);
      if (!res.ok) setError(res.message ?? "Fehler");
    });
  }

  function handleReject() {
    if (reason.trim().length < 3) {
      setError("Begründung erforderlich (3-500 Zeichen)");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("tenantId", tenantId);
    fd.set("reason", reason);
    startTransition(async () => {
      const res = await rejectTenant(null, fd);
      if (!res.ok) setError(res.message ?? "Fehler");
    });
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-sm" style={{ color: "var(--text-light)" }}>
            Kennung: <code>{slug}</code> · Angelegt von {creatorEmail}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {new Date(createdAt).toLocaleString("de-DE")}
          </div>
        </div>
      </div>

      {showReject ? (
        <div className="flex flex-col gap-2 mt-3">
          <textarea
            className="drk-input"
            placeholder="Grund für Ablehnung"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={pending}
              className="drk-btn-primary"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="drk-btn-secondary"
              disabled={pending}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={pending}
            className="drk-btn-primary"
          >
            Freischalten
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="drk-btn-secondary"
            disabled={pending}
          >
            Ablehnen
          </button>
        </div>
      )}

      {error ? (
        <div
          className="mt-2 text-sm rounded p-2"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
