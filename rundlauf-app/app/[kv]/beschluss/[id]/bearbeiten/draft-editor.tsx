"use client";

import { MetaForm } from "./meta-form";
import { TopsSection } from "./tops-section";
import { AttachmentsSection } from "./attachments-section";
import { EligibilitySection } from "./eligibility-section";
import { DiscardSection } from "./discard-section";
import type { DraftAttachment, DraftMember, DraftTop } from "./draft-types";

export type { DraftAttachment, DraftMember, DraftTop } from "./draft-types";

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
