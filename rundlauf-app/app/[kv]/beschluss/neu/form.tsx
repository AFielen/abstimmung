"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createResolution, type CreateResolutionState } from "./actions";

const initial: CreateResolutionState = { ok: false };

export type BodyChoice = {
  id: string;
  name: string;
  organizationName: string | null;
  defaultQuorumPct: number;
  defaultMehrheit: "simple" | "two_thirds" | "three_quarters";
};

export type MemberChoice = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
};

function computeDefaultFrist(minDays: number): string {
  const def = new Date(Date.now() + (minDays + 1) * 24 * 60 * 60 * 1000);
  def.setMinutes(0, 0, 0);
  def.setHours(18);
  const offset = def.getTimezoneOffset() * 60_000;
  return new Date(def.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateForm({
  kv,
  minDays,
  bodies,
  members,
  suggestionsByBody,
}: {
  kv: string;
  minDays: number;
  bodies: BodyChoice[];
  members: MemberChoice[];
  suggestionsByBody: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState(createResolution, initial);
  const fristRef = useRef<HTMLInputElement>(null);

  const [bodyId, setBodyId] = useState<string>(bodies[0]?.id ?? "");

  const allMemberIds = useMemo(() => members.map((m) => m.userId), [members]);

  const initialSelected = useMemo(() => {
    const suggested = suggestionsByBody[bodies[0]?.id ?? ""];
    return new Set(suggested && suggested.length > 0 ? suggested : allMemberIds);
  }, [bodies, suggestionsByBody, allMemberIds]);

  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [hasManualOverride, setHasManualOverride] = useState(false);

  const currentBody = bodies.find((b) => b.id === bodyId);
  const hasSuggestion = bodyId
    ? (suggestionsByBody[bodyId]?.length ?? 0) > 0
    : false;

  const onMountFrist = (node: HTMLInputElement | null) => {
    fristRef.current = node;
    if (node && !node.value) {
      node.value = computeDefaultFrist(minDays);
    }
  };

  function handleBodyChange(newId: string) {
    setBodyId(newId);
    if (!hasManualOverride) {
      const suggested = suggestionsByBody[newId];
      setSelected(new Set(suggested && suggested.length > 0 ? suggested : allMemberIds));
    }
  }

  function toggleMember(userId: string) {
    setHasManualOverride(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function resetToSuggestion() {
    setHasManualOverride(false);
    const suggested = suggestionsByBody[bodyId];
    setSelected(new Set(suggested && suggested.length > 0 ? suggested : allMemberIds));
  }

  function selectAll() {
    setHasManualOverride(true);
    setSelected(new Set(allMemberIds));
  }

  function selectNone() {
    setHasManualOverride(true);
    setSelected(new Set());
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="kv" value={kv} />
      <input type="hidden" name="bodyId" value={bodyId} />
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="eligibleUserIds" value={id} />
      ))}

      {/* Gremium */}
      <div>
        <label className="drk-label" htmlFor="bodyId-select">
          Gremium <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <select
          id="bodyId-select"
          value={bodyId}
          onChange={(e) => handleBodyChange(e.target.value)}
          className="drk-input"
          required
        >
          {bodies.map((b) => (
            <option key={b.id} value={b.id}>
              {b.organizationName ? `${b.organizationName} · ` : ""}{b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Titel */}
      <div>
        <label className="drk-label" htmlFor="titel">
          Titel <span style={{ color: "var(--drk)" }}>*</span>
        </label>
        <input
          id="titel"
          name="titel"
          required
          maxLength={200}
          className="drk-input"
          placeholder="z.B. Aufnahme neuer Ortsverein Würselen"
        />
      </div>

      {/* Begründung */}
      <div>
        <label className="drk-label" htmlFor="begruendung">
          Beschlusstext / Begründung
        </label>
        <textarea
          id="begruendung"
          name="begruendung"
          rows={6}
          className="drk-input"
          placeholder="Erläutere den Beschlussgegenstand."
        />
      </div>

      {/* Stimmberechtigte */}
      <fieldset className="border rounded-xl p-4" style={{ borderColor: "var(--border)" }}>
        <legend className="text-sm font-bold px-2">
          Stimmberechtigte ({selected.size} von {members.length})
        </legend>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs" style={{ color: "var(--text-light)" }}>
            {hasSuggestion
              ? hasManualOverride
                ? "Manuelle Auswahl"
                : "Vorschlag aus letztem Beschluss dieses Gremiums"
              : "Erster Beschluss in diesem Gremium – bitte manuell auswählen"}
          </span>
          <span className="flex-1" />
          {hasSuggestion ? (
            <button
              type="button"
              onClick={resetToSuggestion}
              className="drk-btn-secondary"
              style={{ padding: "0.3rem 0.7rem", minHeight: 0, fontSize: "0.8rem" }}
            >
              Vorschlag wiederherstellen
            </button>
          ) : null}
          <button
            type="button"
            onClick={selectAll}
            className="drk-btn-secondary"
            style={{ padding: "0.3rem 0.7rem", minHeight: 0, fontSize: "0.8rem" }}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="drk-btn-secondary"
            style={{ padding: "0.3rem 0.7rem", minHeight: 0, fontSize: "0.8rem" }}
          >
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
                    onChange={() => toggleMember(m.userId)}
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
      </fieldset>

      {/* Frist / Quorum */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="fristEnde">
            Frist (Ende) <span style={{ color: "var(--drk)" }}>*</span>
          </label>
          <input
            id="fristEnde"
            name="fristEnde"
            type="datetime-local"
            required
            ref={onMountFrist}
            className="drk-input"
          />
        </div>

        <div>
          <label className="drk-label" htmlFor="quorumPct">
            Quorum (%) <span style={{ color: "var(--drk)" }}>*</span>
          </label>
          <input
            id="quorumPct"
            name="quorumPct"
            type="number"
            min={50}
            max={100}
            defaultValue={currentBody?.defaultQuorumPct ?? 75}
            key={`q-${bodyId}`}
            required
            className="drk-input"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="drk-label" htmlFor="mehrheit">
            Erforderliche Mehrheit
          </label>
          <select
            id="mehrheit"
            name="mehrheit"
            defaultValue={currentBody?.defaultMehrheit ?? "simple"}
            key={`m-${bodyId}`}
            className="drk-input"
          >
            <option value="simple">Einfache Mehrheit (&gt; 50 %)</option>
            <option value="two_thirds">Zwei Drittel</option>
            <option value="three_quarters">Drei Viertel</option>
          </select>
        </div>

        <div>
          <label className="drk-label" htmlFor="voteChangeMode">
            Stimmänderung
          </label>
          <select
            id="voteChangeMode"
            name="voteChangeMode"
            defaultValue="aenderbar"
            className="drk-input"
          >
            <option value="aenderbar">Änderbar bis Fristende</option>
            <option value="fest">Fest – einmalige Abgabe</option>
          </select>
        </div>
      </div>

      {state.message && !state.ok ? (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        className="drk-btn-primary"
        disabled={pending || selected.size < 2}
      >
        {pending ? "Lege an …" : "Beschluss eröffnen und einladen"}
      </button>

      {selected.size < 2 ? (
        <p className="text-xs" style={{ color: "var(--text-light)" }}>
          Wähle mindestens 2 Stimmberechtigte aus.
        </p>
      ) : null}
    </form>
  );
}
