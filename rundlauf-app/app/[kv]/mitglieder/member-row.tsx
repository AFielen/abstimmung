"use client";

import { useState, useTransition } from "react";
import { changeRole, removeMember, resendInvite } from "./actions";

type Feedback = { ok: boolean; message: string } | null;

type Props = {
  kv: string;
  membershipId: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  canModify: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  invited: "Eingeladen",
  removed: "Entfernt",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Gremiumsmitglied",
};

export function MemberRow({ kv, membershipId, email, name, role, status, canModify }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleRoleChange(newRole: string) {
    if (newRole === role) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("membershipId", membershipId);
    fd.set("role", newRole);
    startTransition(async () => {
      const r = await changeRole(null, fd);
      setFeedback(r.ok ? null : { ok: false, message: r.message ?? "Fehler" });
    });
  }

  function handleRemove() {
    if (!confirm(`${email} wirklich entfernen?`)) return;
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("membershipId", membershipId);
    startTransition(async () => {
      const r = await removeMember(null, fd);
      setFeedback(r.ok ? null : { ok: false, message: r.message ?? "Fehler" });
    });
  }

  function handleResend() {
    const fd = new FormData();
    fd.set("kv", kv);
    fd.set("membershipId", membershipId);
    startTransition(async () => {
      const r = await resendInvite(null, fd);
      setFeedback({ ok: r.ok, message: r.message ?? (r.ok ? "Versendet" : "Fehler") });
    });
  }

  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0">
        <div className="font-medium">{name ?? email}</div>
        <div className="text-xs" style={{ color: "var(--text-light)" }}>
          {email}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            status === "active"
              ? "drk-badge-success"
              : status === "invited"
                ? "drk-badge-warning"
                : "drk-badge-error"
          }
        >
          {STATUS_LABEL[status] ?? status}
        </span>

        {canModify ? (
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={pending}
            className="drk-input"
            style={{ padding: "0.4rem 0.6rem", width: "auto" }}
          >
            <option value="admin">Administrator</option>
            <option value="member">Gremiumsmitglied</option>
          </select>
        ) : (
          <span className="text-sm" style={{ color: "var(--text-light)" }}>
            {ROLE_LABEL[role] ?? role}
          </span>
        )}

        {canModify && status === "invited" ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={pending}
            className="drk-btn-secondary"
            style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
          >
            Einladung erneut senden
          </button>
        ) : null}

        {canModify ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="drk-btn-secondary"
            style={{ padding: "0.4rem 0.8rem", minHeight: 0 }}
          >
            Entfernen
          </button>
        ) : null}
      </div>

      {feedback ? (
        <div
          className="w-full text-sm rounded p-2"
          style={{
            background: feedback.ok ? "var(--success-bg)" : "var(--drk-bg)",
            color: feedback.ok ? "var(--success)" : "var(--drk)",
          }}
        >
          {feedback.message}
        </div>
      ) : null}
    </li>
  );
}
