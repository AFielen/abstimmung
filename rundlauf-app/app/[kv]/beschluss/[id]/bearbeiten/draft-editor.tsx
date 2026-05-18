"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  addAgendaItem,
  deleteAgendaItem,
  deleteAttachment,
  discardDraft,
  publishResolution,
  updateAgendaItem,
  updateResolutionMeta,
  type ActionState,
} from "./actions";

const initial: ActionState = { ok: false };

export type DraftTop = {
  id: string;
  ordinal: number;
  titel: string;
  beschlussvorschlagMd: string;
  sachlageMd: string;
  finanzielleAuswirkungen: string;
  auskunftErteilen: string;
  quorumPct: number;
  mehrheit: "simple" | "two_thirds" | "three_quarters";
};

export type DraftAttachment = {
  id: string;
  filename: string;
  sizeBytes: number;
  sha256: string;
  agendaItemId: string | null;
  uploadedAt: Date;
};

export type DraftMember = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function DraftEditor(props: {
  kv: string;
  resolutionId: string;
  bodyName: string;
  defaultQuorum: number;
  defaultMehrheit: "simple" | "two_thirds" | "three_quarters";
  betreff: string;
  fristEnde: string;
  voteChangeMode: "aenderbar" | "fest";
  tops: DraftTop[];
  attachments: DraftAttachment[];
  members: DraftMember[];
  suggestedEligibleIds: string[];
  minDays: number;
}) {
  const {
    kv,
    resolutionId,
    bodyName,
    defaultQuorum,
    defaultMehrheit,
    betreff,
    fristEnde,
    voteChangeMode,
    tops,
    attachments,
    members,
    suggestedEligibleIds,
    minDays,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      <header className="drk-card">
        <span className="drk-badge-warning">Entwurf</span>
        <h1 className="text-2xl font-bold mt-2">Umlaufverfahren bearbeiten</h1>
        <div className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
          Gremium: {bodyName}
        </div>
        <p className="text-sm mt-3" style={{ color: "var(--text-light)" }}>
          Erfasse Tagesordnungspunkte und Anlagen. Nach der Eröffnung werden alle
          Stimmberechtigten per E-Mail informiert — Anlagen und TOPs sind dann
          nicht mehr änderbar.
        </p>
      </header>

      <MetaForm
        kv={kv}
        resolutionId={resolutionId}
        betreff={betreff}
        fristEnde={fristEnde}
        voteChangeMode={voteChangeMode}
        minDays={minDays}
      />

      <TopsSection
        kv={kv}
        resolutionId={resolutionId}
        tops={tops}
        defaultQuorum={defaultQuorum}
        defaultMehrheit={defaultMehrheit}
      />

      <AttachmentsSection
        kv={kv}
        resolutionId={resolutionId}
        attachments={attachments}
        tops={tops}
      />

      <EligibilitySection
        kv={kv}
        resolutionId={resolutionId}
        members={members}
        suggestedIds={suggestedEligibleIds}
        hasTops={tops.length > 0}
      />

      <DiscardSection kv={kv} resolutionId={resolutionId} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Meta-Form

function MetaForm({
  kv,
  resolutionId,
  betreff,
  fristEnde,
  voteChangeMode,
  minDays,
}: {
  kv: string;
  resolutionId: string;
  betreff: string;
  fristEnde: string;
  voteChangeMode: "aenderbar" | "fest";
  minDays: number;
}) {
  const [state, action, pending] = useActionState(updateResolutionMeta, initial);
  return (
    <section className="drk-card">
      <h2 className="text-lg font-bold mb-3">Verfahrensdaten</h2>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="kv" value={kv} />
        <input type="hidden" name="resolutionId" value={resolutionId} />

        <div>
          <label className="drk-label" htmlFor="betreff">Betreff (optional)</label>
          <input
            id="betreff"
            name="betreff"
            defaultValue={betreff}
            maxLength={200}
            className="drk-input"
            placeholder="z.B. Beschlussvorlagen Sitzung April 2026"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="drk-label" htmlFor="fristEnde">
              Frist (Ende) <span style={{ color: "var(--drk)" }}>*</span>
            </label>
            <input
              id="fristEnde"
              name="fristEnde"
              type="datetime-local"
              defaultValue={fristEnde}
              required
              className="drk-input"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
              Mind. {minDays} Tage in der Zukunft.
            </p>
          </div>

          <div>
            <label className="drk-label" htmlFor="voteChangeMode">Stimmänderung</label>
            <select
              id="voteChangeMode"
              name="voteChangeMode"
              defaultValue={voteChangeMode}
              className="drk-input"
            >
              <option value="aenderbar">Änderbar bis Fristende</option>
              <option value="fest">Fest – einmalige Abgabe</option>
            </select>
          </div>
        </div>

        <Feedback state={state} />

        <button type="submit" className="drk-btn-secondary self-start" disabled={pending}>
          {pending ? "Speichere …" : "Verfahrensdaten speichern"}
        </button>
      </form>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TOPs

function TopsSection({
  kv,
  resolutionId,
  tops,
  defaultQuorum,
  defaultMehrheit,
}: {
  kv: string;
  resolutionId: string;
  tops: DraftTop[];
  defaultQuorum: number;
  defaultMehrheit: "simple" | "two_thirds" | "three_quarters";
}) {
  const [adding, setAdding] = useState(tops.length === 0);

  return (
    <section className="drk-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">
          Tagesordnungspunkte ({tops.length})
        </h2>
        {!adding ? (
          <button type="button" className="drk-btn-secondary" onClick={() => setAdding(true)}>
            + TOP hinzufügen
          </button>
        ) : null}
      </div>

      {tops.length === 0 && !adding ? (
        <p style={{ color: "var(--text-light)" }}>
          Noch keine TOPs erfasst. Mindestens einer wird zum Eröffnen benötigt.
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {tops.map((t) => (
          <li key={t.id}>
            <TopCard
              kv={kv}
              resolutionId={resolutionId}
              top={t}
            />
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold mb-3">Neuer TOP</h3>
          <NewTopForm
            kv={kv}
            resolutionId={resolutionId}
            defaultQuorum={defaultQuorum}
            defaultMehrheit={defaultMehrheit}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}
    </section>
  );
}

function NewTopForm({
  kv,
  resolutionId,
  defaultQuorum,
  defaultMehrheit,
  onCancel,
}: {
  kv: string;
  resolutionId: string;
  defaultQuorum: number;
  defaultMehrheit: "simple" | "two_thirds" | "three_quarters";
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(addAgendaItem, initial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        action(fd);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="kv" value={kv} />
      <input type="hidden" name="resolutionId" value={resolutionId} />
      <TopFields defaultQuorum={defaultQuorum} defaultMehrheit={defaultMehrheit} />
      <Feedback state={state} />
      <div className="flex gap-2">
        <button type="submit" className="drk-btn-primary" disabled={pending}>
          {pending ? "Lege an …" : "TOP speichern"}
        </button>
        <button type="button" className="drk-btn-secondary" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function TopCard({
  kv,
  resolutionId,
  top,
}: {
  kv: string;
  resolutionId: string;
  top: DraftTop;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateAgendaItem, initial);
  const [, deleteAction, deletePending] = useActionState(deleteAgendaItem, initial);

  if (!editing) {
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
              TOP {top.ordinal}
            </div>
            <h3 className="font-bold mt-1">{top.titel}</h3>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="drk-btn-secondary" onClick={() => setEditing(true)}>
              Bearbeiten
            </button>
            <form action={deleteAction}>
              <input type="hidden" name="kv" value={kv} />
              <input type="hidden" name="resolutionId" value={resolutionId} />
              <input type="hidden" name="agendaItemId" value={top.id} />
              <button
                type="submit"
                className="drk-btn-secondary"
                disabled={deletePending}
                onClick={(e) => {
                  if (!confirm(`TOP "${top.titel}" entfernen?`)) e.preventDefault();
                }}
              >
                Entfernen
              </button>
            </form>
          </div>
        </div>
        {top.beschlussvorschlagMd ? (
          <div className="mt-3 whitespace-pre-wrap text-sm">
            <strong>Beschlussvorschlag:</strong>
            <div className="mt-1">{top.beschlussvorschlagMd}</div>
          </div>
        ) : null}
        {top.sachlageMd ? (
          <div className="mt-3 whitespace-pre-wrap text-sm">
            <strong>Sachlage:</strong>
            <div className="mt-1">{top.sachlageMd}</div>
          </div>
        ) : null}
        {top.finanzielleAuswirkungen ? (
          <div className="mt-3 text-sm">
            <strong>Finanzielle Auswirkungen:</strong>{" "}
            <span>{top.finanzielleAuswirkungen}</span>
          </div>
        ) : null}
        {top.auskunftErteilen ? (
          <div className="mt-3 text-sm">
            <strong>Auskunft erteilen:</strong> <span>{top.auskunftErteilen}</span>
          </div>
        ) : null}
        <div className="mt-3 text-xs" style={{ color: "var(--text-light)" }}>
          Quorum {top.quorumPct} % · {mehrheitLabel(top.mehrheit)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--drk)" }}>
      <div className="text-xs uppercase tracking-wide mb-3" style={{ color: "var(--text-light)" }}>
        TOP {top.ordinal} bearbeiten
      </div>
      <form action={updateAction} className="flex flex-col gap-3">
        <input type="hidden" name="kv" value={kv} />
        <input type="hidden" name="resolutionId" value={resolutionId} />
        <input type="hidden" name="agendaItemId" value={top.id} />
        <TopFields
          defaultTitel={top.titel}
          defaultBeschluss={top.beschlussvorschlagMd}
          defaultSachlage={top.sachlageMd}
          defaultFinanzen={top.finanzielleAuswirkungen}
          defaultAuskunft={top.auskunftErteilen}
          defaultQuorum={top.quorumPct}
          defaultMehrheit={top.mehrheit}
        />
        <Feedback state={updateState} />
        <div className="flex gap-2">
          <button type="submit" className="drk-btn-primary" disabled={updatePending}>
            {updatePending ? "Speichere …" : "Änderungen speichern"}
          </button>
          <button type="button" className="drk-btn-secondary" onClick={() => setEditing(false)}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

function TopFields({
  defaultTitel = "",
  defaultBeschluss = "",
  defaultSachlage = "",
  defaultFinanzen = "",
  defaultAuskunft = "",
  defaultQuorum,
  defaultMehrheit,
}: {
  defaultTitel?: string;
  defaultBeschluss?: string;
  defaultSachlage?: string;
  defaultFinanzen?: string;
  defaultAuskunft?: string;
  defaultQuorum: number;
  defaultMehrheit: "simple" | "two_thirds" | "three_quarters";
}) {
  return (
    <>
      <div>
        <label className="drk-label">Titel <span style={{ color: "var(--drk)" }}>*</span></label>
        <input
          name="titel"
          required
          maxLength={200}
          defaultValue={defaultTitel}
          className="drk-input"
          placeholder="z.B. Aufnahme neuer Ortsverein Würselen"
        />
      </div>
      <div>
        <label className="drk-label">
          Beschlussvorschlag <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <textarea
          name="beschlussvorschlag"
          required
          rows={4}
          defaultValue={defaultBeschluss}
          className="drk-input"
          placeholder="Konkrete Beschlussfassung, über die abgestimmt wird."
        />
      </div>
      <div>
        <label className="drk-label">Sachlage / Erläuterung</label>
        <textarea
          name="sachlage"
          rows={4}
          defaultValue={defaultSachlage}
          className="drk-input"
          placeholder="Hintergrund, Sachstand, Begründung."
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="drk-label">Finanzielle Auswirkungen</label>
          <input
            name="finanzielleAuswirkungen"
            defaultValue={defaultFinanzen}
            maxLength={2000}
            className="drk-input"
            placeholder="z.B. ca. 5.000 € einmalig, ab 2027 jährlich 1.200 €"
          />
        </div>
        <div>
          <label className="drk-label">Auskunft erteilen</label>
          <input
            name="auskunftErteilen"
            defaultValue={defaultAuskunft}
            maxLength={500}
            className="drk-input"
            placeholder="Name, Funktion"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="drk-label">Quorum (%) <span style={{ color: "var(--drk)" }}>*</span></label>
          <input
            name="quorumPct"
            type="number"
            min={50}
            max={100}
            required
            defaultValue={defaultQuorum}
            className="drk-input"
          />
        </div>
        <div>
          <label className="drk-label">Erforderliche Mehrheit</label>
          <select name="mehrheit" defaultValue={defaultMehrheit} className="drk-input">
            <option value="simple">Einfache Mehrheit (&gt; 50 %)</option>
            <option value="two_thirds">Zwei Drittel</option>
            <option value="three_quarters">Drei Viertel</option>
          </select>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Attachments

function AttachmentsSection({
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
  const [, deleteAction, deletePending] = useActionState(deleteAttachment, initial);

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

// ──────────────────────────────────────────────────────────────────────────
// Eligibility & Publish

function EligibilitySection({
  kv,
  resolutionId,
  members,
  suggestedIds,
  hasTops,
}: {
  kv: string;
  resolutionId: string;
  members: DraftMember[];
  suggestedIds: string[];
  hasTops: boolean;
}) {
  const [state, action, pending] = useActionState(publishResolution, initial);
  const initSet = useMemo(
    () => new Set(suggestedIds.length > 0 ? suggestedIds : members.map((m) => m.userId)),
    [suggestedIds, members],
  );
  const [selected, setSelected] = useState<Set<string>>(initSet);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(members.map((m) => m.userId)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  return (
    <section className="drk-card">
      <h2 className="text-lg font-bold mb-3">
        Stimmberechtigte ({selected.size} von {members.length})
      </h2>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="kv" value={kv} />
        <input type="hidden" name="resolutionId" value={resolutionId} />
        {Array.from(selected).map((id) => (
          <input key={id} type="hidden" name="eligibleUserIds" value={id} />
        ))}

        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="flex-1 text-xs" style={{ color: "var(--text-light)" }}>
            Vorschlag: aus letztem Umlaufverfahren desselben Gremiums (falls vorhanden).
          </span>
          <button type="button" onClick={selectAll} className="drk-btn-secondary"
            style={{ padding: "0.3rem 0.7rem", minHeight: 0, fontSize: "0.8rem" }}>
            Alle
          </button>
          <button type="button" onClick={selectNone} className="drk-btn-secondary"
            style={{ padding: "0.3rem 0.7rem", minHeight: 0, fontSize: "0.8rem" }}>
            Keine
          </button>
        </div>

        <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {members.map((m) => {
            const checked = selected.has(m.userId);
            return (
              <li key={m.userId}>
                <label
                  className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                  style={{ background: checked ? "var(--drk-bg)" : undefined }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.userId)}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--drk)" }}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{m.displayName}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-light)" }}>
                      {m.email} · {m.role}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <Feedback state={state} />

        <button
          type="submit"
          className="drk-btn-primary"
          disabled={pending || selected.size < 2 || !hasTops}
        >
          {pending ? "Eröffne …" : "Verfahren eröffnen und einladen"}
        </button>

        {!hasTops ? (
          <p className="text-xs" style={{ color: "var(--text-light)" }}>
            Mindestens ein TOP wird zum Eröffnen benötigt.
          </p>
        ) : null}
        {selected.size < 2 ? (
          <p className="text-xs" style={{ color: "var(--text-light)" }}>
            Wähle mindestens 2 Stimmberechtigte aus.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function DiscardSection({ kv, resolutionId }: { kv: string; resolutionId: string }) {
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

// ──────────────────────────────────────────────────────────────────────────
// Shared

function Feedback({ state }: { state: ActionState }) {
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

function mehrheitLabel(m: string) {
  return {
    simple: "Einfache Mehrheit",
    two_thirds: "2/3-Mehrheit",
    three_quarters: "3/4-Mehrheit",
  }[m] ?? m;
}
