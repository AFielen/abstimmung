"use client";

import { useActionState, useRef, useState } from "react";
import { deleteAttachment } from "./actions";
import { formatBytes } from "@/lib/format";
import type { DraftAttachment, DraftTop } from "./draft-types";
import { initialActionState } from "./feedback";

export function AttachmentsSection({
  kv,
  resolutionId,
  attachments,
  tops,
}: {
  kv: string;
  resolutionId: string;
  attachments: DraftAttachment[];
  tops: DraftTop[];
}) {
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, deleteAction, deletePending] = useActionState(deleteAttachment, initialActionState);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadMsg(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!fileRef.current?.files?.[0]) {
      setUploadMsg({ ok: false, text: "Keine Datei ausgewählt." });
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/${kv}/beschluss/${resolutionId}/anlagen`, {
        method: "POST",
        body: data,
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setUploadMsg({ ok: false, text: json.message ?? `Upload fehlgeschlagen (${res.status})` });
      } else {
        setUploadMsg({ ok: true, text: "Anlage hochgeladen." });
        form.reset();
        window.location.reload();
      }
    } catch {
      setUploadMsg({ ok: false, text: "Upload fehlgeschlagen." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="drk-card">
      <h2 className="text-lg font-bold mb-3">
        Anlagen ({attachments.length}/10)
      </h2>

      <ul className="flex flex-col gap-2 mb-4">
        {attachments.length === 0 ? (
          <li style={{ color: "var(--text-light)" }}>Noch keine Anlagen.</li>
        ) : (
          attachments.map((a) => {
            const top = tops.find((t) => t.id === a.agendaItemId);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0">
                  <a
                    href={`/${kv}/beschluss/${resolutionId}/anlagen/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium"
                    style={{ color: "var(--drk)" }}
                  >
                    {a.filename}
                  </a>
                  <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                    {formatBytes(a.sizeBytes)} ·{" "}
                    {top ? `TOP ${top.ordinal}` : "Umlauf gesamt"} · SHA-256{" "}
                    {a.sha256.slice(0, 12)}…
                  </div>
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="kv" value={kv} />
                  <input type="hidden" name="resolutionId" value={resolutionId} />
                  <input type="hidden" name="attachmentId" value={a.id} />
                  <button
                    type="submit"
                    className="drk-btn-secondary"
                    disabled={deletePending}
                    onClick={(e) => {
                      if (!confirm(`Anlage "${a.filename}" entfernen?`)) e.preventDefault();
                    }}
                  >
                    Entfernen
                  </button>
                </form>
              </li>
            );
          })
        )}
      </ul>

      {attachments.length < 10 ? (
        <form onSubmit={handleUpload} className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold">PDF hochladen</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="drk-label" htmlFor="att-file">PDF-Datei (max. 20 MB)</label>
              <input
                id="att-file"
                ref={fileRef}
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="drk-input"
              />
            </div>
            <div>
              <label className="drk-label" htmlFor="att-top">Zuordnung</label>
              <select id="att-top" name="agendaItemId" defaultValue="" className="drk-input">
                <option value="">Umlauf gesamt</option>
                {tops.map((t) => (
                  <option key={t.id} value={t.id}>
                    TOP {t.ordinal} – {t.titel}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {uploadMsg ? (
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                background: uploadMsg.ok ? "var(--success-bg)" : "var(--drk-bg)",
                color: uploadMsg.ok ? "var(--success)" : "var(--drk)",
              }}
            >
              {uploadMsg.text}
            </div>
          ) : null}
          <button type="submit" className="drk-btn-secondary self-start" disabled={uploading}>
            {uploading ? "Lade hoch …" : "Hochladen"}
          </button>
        </form>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-light)" }}>
          Maximum von 10 Anlagen erreicht.
        </p>
      )}
    </section>
  );
}
