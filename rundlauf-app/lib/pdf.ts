import { jsPDF } from "jspdf";
import type { AgendaItem, Resolution, Tenant, User } from "@/lib/db/schema";
import {
  computeAgendaItemResult,
  parseOptions,
  type ResolutionResult,
} from "@/lib/resolution";

type EligibleSnapshot = {
  userId: string;
  nameSnapshot: string;
  emailSnapshot: string;
  roleSnapshot: string;
};

type VoteWithUser = {
  userId: string;
  agendaItemId: string;
  optionId: string;
  updatedAt: Date;
  submittedAt: Date;
};

export type AttachmentInfo = {
  id: string;
  filename: string;
  sizeBytes: number;
  sha256: string;
  agendaItemId: string | null;
};

export type ProtokollInput = {
  tenant: Tenant;
  resolution: Resolution;
  createdBy: Pick<User, "name" | "email"> | null;
  agendaItems: AgendaItem[];
  eligible: EligibleSnapshot[];
  votes: VoteWithUser[];
  attachments: AttachmentInfo[];
  body?: { name: string; organizationName: string | null } | null;
};

const PAGE_W = 210;
const MARGIN = 18;
const PAGE_BOTTOM = 280;

export function buildProtokollPdf(input: ProtokollInput): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // ── Kopf ────────────────────────────────────────────────────────────
  doc.setFillColor(227, 6, 19);
  doc.rect(0, 0, PAGE_W, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DRK – PROTOKOLL UMLAUFVERFAHREN", MARGIN, 8);
  doc.setTextColor(33, 37, 41);
  y = 22;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(input.tenant.name, MARGIN, y);
  y += 4;
  if (input.body) {
    const bodyLine = input.body.organizationName
      ? `${input.body.organizationName} – ${input.body.name}`
      : input.body.name;
    doc.text(`Gremium: ${bodyLine}`, MARGIN, y);
    y += 4;
  }
  doc.text(`Verfahrens-ID: ${input.resolution.id}`, MARGIN, y);
  y += 4;
  if (input.resolution.betreff) {
    doc.text(`Betreff: ${input.resolution.betreff}`, MARGIN, y);
    y += 4;
  }
  doc.text(
    `Erstellt: ${new Date(input.resolution.createdAt).toLocaleString("de-DE")}`,
    MARGIN,
    y,
  );
  y += 4;
  if (input.resolution.abgeschlossenAm) {
    doc.text(
      `Abgeschlossen: ${new Date(input.resolution.abgeschlossenAm).toLocaleString("de-DE")}`,
      MARGIN,
      y,
    );
    y += 4;
  }
  if (input.createdBy) {
    doc.text(`Anlage: ${input.createdBy.name ?? input.createdBy.email}`, MARGIN, y);
    y += 4;
  }
  y += 4;

  // ── Verfahren ───────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 40);
  y = paragraphHeader(doc, "Verfahren", y);
  const verfahren = [
    ["Rechtsgrundlage", "§ 21 Abs. 6 i.V.m. § 22 Abs. 5 DRK-Satzung KV StädteRegion Aachen"],
    ["Frist (Ende)", new Date(input.resolution.fristEnde).toLocaleString("de-DE")],
    [
      "Stimm-Modus",
      input.resolution.voteChangeMode === "fest"
        ? "Stimmen unwiderruflich (einmalige Abgabe)"
        : "Stimmen änderbar bis Fristende",
    ],
    ["Anzahl TOPs", String(input.agendaItems.length)],
    ["Stimmberechtigte", String(input.eligible.length)],
  ];
  y = drawKeyValueTable(doc, verfahren, y);
  y += 4;

  // ── Stimmberechtigte (umlaufweit) ──────────────────────────────────
  y = ensureSpace(doc, y, 20);
  y = paragraphHeader(doc, `Stimmberechtigte (${input.eligible.length})`, y);
  const eligibleRows: string[][] = [
    ["Name", "Rolle"],
    ...input.eligible.map((e) => [e.nameSnapshot, roleLabel(e.roleSnapshot)]),
  ];
  y = drawTable(doc, eligibleRows, y, [120, 55]);
  y += 6;

  // ── Anlagen-Übersicht (umlaufweit) ─────────────────────────────────
  if (input.attachments.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = paragraphHeader(doc, `Anlagen (${input.attachments.length})`, y);
    const topOrdinal = (id: string | null) => {
      if (!id) return "Umlauf";
      const t = input.agendaItems.find((a) => a.id === id);
      return t ? `TOP ${t.ordinal}` : "—";
    };
    const attRows: string[][] = [
      ["Datei", "Zuordnung", "SHA-256"],
      ...input.attachments.map((a) => [
        `${a.filename} (${formatBytes(a.sizeBytes)})`,
        topOrdinal(a.agendaItemId),
        a.sha256,
      ]),
    ];
    y = drawTable(doc, attRows, y, [70, 30, 75]);
    y += 6;
  }

  // ── Pro TOP ────────────────────────────────────────────────────────
  for (const top of input.agendaItems) {
    y = drawAgendaItem(doc, top, input, y);
  }

  // ── Fußzeile auf jeder Seite ───────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${input.tenant.name} · Erzeugt ${new Date().toLocaleString("de-DE")} · Seite ${i}/${pageCount}`,
      PAGE_W / 2,
      287,
      { align: "center" },
    );
    doc.setTextColor(33, 37, 41);
  }

  const ab = doc.output("arraybuffer");
  return Buffer.from(ab);
}

function drawAgendaItem(
  doc: jsPDF,
  top: AgendaItem,
  input: ProtokollInput,
  startY: number,
): number {
  let y = startY;

  // Voting-Zahlen
  const votesForTop = input.votes.filter((v) => v.agendaItemId === top.id);
  const counts: Record<string, number> = {};
  for (const v of votesForTop) counts[v.optionId] = (counts[v.optionId] ?? 0) + 1;
  const result: ResolutionResult =
    (top.ergebnis as ResolutionResult | null) ??
    computeAgendaItemResult({
      agendaItem: top,
      eligibleCount: input.eligible.length,
      voteCounts: counts,
    });
  const options = parseOptions(top.optionen);
  const optionLabel = (id: string) => options.find((o) => o.id === id)?.label ?? id;
  const voteByUserId = new Map(votesForTop.map((v) => [v.userId, v]));

  y = ensureSpace(doc, y, 60);
  // Trennlinie
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`TOP ${top.ordinal} – ${top.titel}`, MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  // Beschlussvorschlag
  if (top.beschlussvorschlagMd) {
    y = labeledBlock(doc, "Beschlussvorschlag", top.beschlussvorschlagMd, y);
  }
  // Sachlage
  if (top.sachlageMd) {
    y = labeledBlock(doc, "Sachlage", top.sachlageMd, y);
  }
  if (top.finanzielleAuswirkungen) {
    y = labeledBlock(doc, "Finanzielle Auswirkungen", top.finanzielleAuswirkungen, y);
  }
  if (top.auskunftErteilen) {
    y = labeledBlock(doc, "Auskunft erteilen", top.auskunftErteilen, y);
  }

  // Anlagen pro TOP
  const topAtts = input.attachments.filter((a) => a.agendaItemId === top.id);
  if (topAtts.length > 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.text("Anlagen:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 4;
    for (const a of topAtts) {
      y = ensureSpace(doc, y, 4);
      const lines = doc.splitTextToSize(
        `• ${a.filename} (${formatBytes(a.sizeBytes)}) – SHA-256 ${a.sha256.slice(0, 24)}…`,
        PAGE_W - 2 * MARGIN,
      );
      doc.setFontSize(9);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4;
      doc.setFontSize(10);
    }
    y += 2;
  }

  // Abstimmungstabelle pro TOP
  y = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Stimmen", MARGIN, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 4;
  const rows: string[][] = [
    ["Name", "Stimme", "Abgegeben am"],
    ...input.eligible.map((e) => {
      const v = voteByUserId.get(e.userId);
      return [
        e.nameSnapshot,
        v ? optionLabel(v.optionId) : "—",
        v ? new Date(v.updatedAt).toLocaleString("de-DE") : "—",
      ];
    }),
  ];
  y = drawTable(doc, rows, y, [80, 40, 55]);
  y += 4;

  // Ergebnis
  y = ensureSpace(doc, y, 40);
  const ergebnisRows = [
    [
      "Abgegebene Stimmen",
      `${result.voteCount} / ${result.eligibleCount} (${result.participationPct.toFixed(1)} %)`,
    ],
    ["Quorum", `${top.quorumPct} % – ${result.quorumReached ? "erreicht" : "verfehlt"}`],
    ["Mehrheit (Schwelle)", `${result.thresholdPct.toFixed(2).replace(/\.00$/, "")} %`],
    ["Mehrheit", result.majorityReached ? "erreicht" : "verfehlt"],
    ...result.perOption.map((o) => [o.label, String(o.count)]),
  ];
  y = drawKeyValueTable(doc, ergebnisRows, y);
  y += 2;

  y = ensureSpace(doc, y, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  if (input.resolution.status === "zurueckgezogen") {
    doc.setTextColor(180, 83, 9);
    doc.text("Status: Zurückgezogen", MARGIN, y + 5);
  } else if (result.accepted) {
    doc.setTextColor(40, 167, 69);
    doc.text("Status: Angenommen", MARGIN, y + 5);
  } else {
    doc.setTextColor(198, 40, 40);
    doc.text("Status: Nicht angenommen", MARGIN, y + 5);
  }
  doc.setTextColor(33, 37, 41);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 10;

  return y;
}

function labeledBlock(doc: jsPDF, label: string, body: string, startY: number): number {
  let y = ensureSpace(doc, startY, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${label}:`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  y += 4;
  const lines = doc.splitTextToSize(body, PAGE_W - 2 * MARGIN);
  // Mehrere Seiten falls Text zu lang
  for (const line of lines) {
    y = ensureSpace(doc, y, 4);
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 2;
  return y;
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 22;
  }
  return y;
}

function paragraphHeader(doc: jsPDF, label: string, y: number): number {
  y = ensureSpace(doc, y, 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  return y + 5;
}

function drawKeyValueTable(
  doc: jsPDF,
  rows: Array<[string, string]> | string[][],
  startY: number,
): number {
  const colW = [70, PAGE_W - 2 * MARGIN - 70];
  let y = startY;
  doc.setFontSize(10);
  for (const row of rows) {
    y = ensureSpace(doc, y, 6);
    doc.setFont("helvetica", "bold");
    doc.text(String(row[0]), MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(row[1]), colW[1]);
    doc.text(lines, MARGIN + colW[0], y);
    y += Math.max(5, lines.length * 4);
  }
  return y;
}

function drawTable(
  doc: jsPDF,
  rows: string[][],
  startY: number,
  colWidths: number[],
): number {
  let y = startY;
  doc.setFontSize(9);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    y = ensureSpace(doc, y, 6);
    doc.setFont("helvetica", r === 0 ? "bold" : "normal");
    if (r === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(MARGIN, y - 4, PAGE_W - 2 * MARGIN, 6, "F");
    }
    let x = MARGIN;
    for (let c = 0; c < row.length; c++) {
      const w = colWidths[c] ?? 30;
      const lines = doc.splitTextToSize(row[c] ?? "", w - 2);
      doc.text(lines, x + 1, y);
      x += w;
    }
    y += 5;
  }
  doc.setFontSize(10);
  return y;
}

function roleLabel(r: string): string {
  return { owner: "Owner", admin: "Admin", member: "Mitglied" }[r] ?? r;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
