"use client";

import { useState, useTransition } from "react";
import {
  confirmMemberImport,
  previewMemberImport,
  type ImportPreviewRow,
  type ImportRunResult,
  type ImportStatus,
} from "../actions";

type Stage = "upload" | "preview" | "result";

const STATUS_META: Record<
  ImportStatus,
  { label: string; tone: "ok" | "warn" | "info" | "error" }
> = {
  new: { label: "Neu", tone: "ok" },
  resend: { label: "Erneut einladen", tone: "info" },
  already_active: { label: "Bereits aktiv", tone: "warn" },
  invalid_email: { label: "Ungültige E-Mail", tone: "error" },
  duplicate_in_file: { label: "Doppelt", tone: "warn" },
  self: { label: "Du selbst", tone: "warn" },
};

const TONE_BADGE: Record<"ok" | "warn" | "info" | "error", string> = {
  ok: "drk-badge-success",
  warn: "drk-badge-warning",
  info: "drk-badge-warning",
  error: "drk-badge-error",
};

function isImportable(status: ImportStatus): boolean {
  return status === "new" || status === "resend";
}

export function ImportForm({ kv }: { kv: string }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [totalRead, setTotalRead] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportRunResult | null>(null);

  function reset() {
    setStage("upload");
    setRows([]);
    setSelected(new Set());
    setTotalRead(0);
    setError(null);
    setResult(null);
  }

  function handleUpload(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await previewMemberImport(kv, formData);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setRows(r.rows);
      setTotalRead(r.totalRead);
      const initialSelection = new Set<number>();
      r.rows.forEach((row, i) => {
        if (isImportable(row.status)) initialSelection.add(i);
      });
      setSelected(initialSelection);
      setStage("preview");
    });
  }

  function toggleRow(i: number) {
    const row = rows[i];
    if (!row || !isImportable(row.status)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll(check: boolean) {
    if (!check) {
      setSelected(new Set());
      return;
    }
    const next = new Set<number>();
    rows.forEach((row, i) => {
      if (isImportable(row.status)) next.add(i);
    });
    setSelected(next);
  }

  function handleConfirm() {
    setError(null);
    const toImport = Array.from(selected)
      .map((i) => rows[i])
      .filter((r): r is ImportPreviewRow => Boolean(r) && isImportable(r.status))
      .map((r) => ({ email: r.email, name: r.name, role: r.role }));

    if (toImport.length === 0) {
      setError("Mindestens eine Zeile auswählen");
      return;
    }
    startTransition(async () => {
      const r = await confirmMemberImport(kv, toImport);
      if (!r.ok) {
        setError(r.message ?? "Fehler beim Import");
        return;
      }
      setResult(r);
      setStage("result");
    });
  }

  if (stage === "upload") {
    return (
      <form
        action={handleUpload}
        className="flex flex-col gap-4"
        encType="multipart/form-data"
      >
        <div>
          <label className="drk-label" htmlFor="file">
            CSV oder Excel-Datei
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="drk-input"
          />
        </div>

        {error ? <ErrorBox message={error} /> : null}

        <button type="submit" className="drk-btn-primary" disabled={pending}>
          {pending ? "Datei wird gelesen …" : "Datei einlesen"}
        </button>
      </form>
    );
  }

  if (stage === "preview") {
    const importable = rows.filter((r) => isImportable(r.status)).length;
    const skipped = rows.length - importable;
    const selectedCount = selected.size;
    const allSelectable = rows.every(
      (r, i) => !isImportable(r.status) || selected.has(i),
    );

    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        >
          <strong>{totalRead}</strong> Zeile{totalRead === 1 ? "" : "n"} gelesen
          {" · "}
          <strong>{importable}</strong> importierbar
          {skipped > 0 ? (
            <>
              {" · "}
              <strong>{skipped}</strong> übersprungen
            </>
          ) : null}
        </div>

        {importable > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelectable && importable > 0}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            Alle importierbaren auswählen ({selectedCount} / {importable})
          </label>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2">E-Mail</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Rolle</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const meta = STATUS_META[row.status];
                const can = isImportable(row.status);
                const checked = selected.has(i);
                return (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td className="p-2 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(i)}
                        disabled={!can}
                      />
                    </td>
                    <td className="p-2 align-top break-all">{row.email}</td>
                    <td className="p-2 align-top">{row.name ?? ""}</td>
                    <td className="p-2 align-top">
                      {row.role === "admin" ? "Administrator" : "Gremiumsmitglied"}
                    </td>
                    <td className="p-2 align-top">
                      <span className={TONE_BADGE[meta.tone]}>{meta.label}</span>
                      {row.message ? (
                        <div
                          className="text-xs mt-1"
                          style={{ color: "var(--text-light)" }}
                        >
                          {row.message}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error ? <ErrorBox message={error} /> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="drk-btn-primary"
            onClick={handleConfirm}
            disabled={pending || selectedCount === 0}
          >
            {pending
              ? "Einladungen werden versendet …"
              : `${selectedCount} Einladung${selectedCount === 1 ? "" : "en"} versenden`}
          </button>
          <button
            type="button"
            className="drk-btn-secondary"
            onClick={reset}
            disabled={pending}
          >
            Andere Datei wählen
          </button>
        </div>
      </div>
    );
  }

  // stage === "result"
  if (!result) return null;
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-lg p-4 text-sm"
        style={{ background: "var(--success-bg)", color: "var(--success)" }}
      >
        <div className="font-semibold mb-2">Import abgeschlossen</div>
        <ul className="list-disc pl-5">
          <li>{result.created} neue Einladung{result.created === 1 ? "" : "en"} versendet</li>
          <li>{result.resent} Einladung{result.resent === 1 ? "" : "en"} erneut versendet</li>
          {result.alreadyActive > 0 ? (
            <li>{result.alreadyActive} bereits aktiv (übersprungen)</li>
          ) : null}
          {result.failed.length > 0 ? (
            <li>{result.failed.length} fehlgeschlagen</li>
          ) : null}
        </ul>
      </div>

      {result.failed.length > 0 ? (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          <div className="font-semibold mb-2">Fehlgeschlagene Zeilen</div>
          <ul className="list-disc pl-5">
            {result.failed.map((f, i) => (
              <li key={i} className="break-all">
                {f.email}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button type="button" className="drk-btn-primary" onClick={reset}>
          Weitere importieren
        </button>
        <a
          href={`/${kv}/mitglieder`}
          className="drk-btn-secondary"
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          Zur Mitgliederliste
        </a>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg p-3 text-sm"
      style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
    >
      {message}
    </div>
  );
}
