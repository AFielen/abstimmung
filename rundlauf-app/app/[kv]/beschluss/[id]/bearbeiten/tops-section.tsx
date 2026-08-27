"use client";

import { useActionState, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { addAgendaItem, deleteAgendaItem, updateAgendaItem } from "./actions";
import { CollapsibleMarkdown } from "../../../_components/collapsible-markdown";
import { mehrheitLabel } from "@/lib/format";
import type { DraftTop } from "./draft-types";
import { Feedback, initialActionState } from "./feedback";

const RichTextEditor = dynamic(
  () => import("../../../_components/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="rich-text-editor" style={{ minHeight: "16rem" }} /> },
);

export function TopsSection({
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
  const [state, action, pending] = useActionState(addAgendaItem, initialActionState);
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
  const [updateState, updateAction, updatePending] = useActionState(updateAgendaItem, initialActionState);
  const [, deleteAction, deletePending] = useActionState(deleteAgendaItem, initialActionState);

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
          <div className="mt-3 text-sm">
            <strong>Beschlussvorschlag:</strong>
            <CollapsibleMarkdown
              markdown={top.beschlussvorschlagMd}
              collapsedLines={10}
              className="mt-1"
            />
          </div>
        ) : null}
        {top.sachlageMd ? (
          <div className="mt-3 text-sm">
            <strong>Sachlage:</strong>
            <CollapsibleMarkdown
              markdown={top.sachlageMd}
              collapsedLines={10}
              className="mt-1"
            />
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
        <RichTextEditor
          name="beschlussvorschlag"
          defaultValue={defaultBeschluss}
          required
          ariaLabel="Beschlussvorschlag"
          placeholder="Konkrete Beschlussfassung, über die abgestimmt wird."
        />
      </div>
      <div>
        <label className="drk-label">Sachlage / Erläuterung</label>
        <RichTextEditor
          name="sachlage"
          defaultValue={defaultSachlage}
          ariaLabel="Sachlage"
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
