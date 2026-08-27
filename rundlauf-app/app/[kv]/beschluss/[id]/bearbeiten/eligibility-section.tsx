"use client";

import { useActionState, useMemo, useState } from "react";
import { publishResolution } from "./actions";
import type { DraftMember } from "./draft-types";
import { Feedback, initialActionState } from "./feedback";

export function EligibilitySection({
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
  const [state, action, pending] = useActionState(publishResolution, initialActionState);
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

        {members.some((m) => m.status === "invited") ? (
          <p
            className="text-xs"
            style={{ color: "var(--text-light)" }}
          >
            Eingeladene Mitglieder erhalten den Abstimmungslink automatisch,
            sobald sie der KV-Einladung folgen.
          </p>
        ) : null}

        <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {members.map((m) => {
            const checked = selected.has(m.userId);
            const isInvited = m.status === "invited";
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
                    <span
                      className="text-xs ml-2"
                      style={{ color: "var(--text-light)" }}
                    >
                      {m.email} · {m.role}
                    </span>
                    {isInvited ? (
                      <span
                        className="text-xs ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                          background: "var(--drk-bg)",
                          color: "var(--drk)",
                        }}
                        title="Mitglied hat die KV-Einladung noch nicht angenommen"
                      >
                        ⏳ Eingeladen
                      </span>
                    ) : null}
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
