import { jsPDF } from "jspdf";
import type { Resolution, Tenant, User } from "@/lib/db/schema";
import { computeResult, parseOptions, type ResolutionResult } from "@/lib/resolution";

type EligibleSnapshot = {
  userId: string;
  nameSnapshot: string;
  emailSnapshot: string;
  roleSnapshot: string;
};

type VoteWithUser = {
  userId: string;
  optionId: string;
  updatedAt: Date;
  submittedAt: Date;
};

export type ProtokollInput = {
  tenant: Tenant;
  resolution: Resolution;
  createdBy: Pick<User, "name" | "email"> | null;
  eligible: EligibleSnapshot[];
  votes: VoteWithUser[];
  body?: { name: string; organizationName: string | null } | null;
};

export function buildProtokollPdf(input: ProtokollInput): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  let y = margin;

  const options = parseOptions(input.resolution.optionen);
  const optionLabel = (id: string) => options.find((o) => o.id === id)?.label ?? id;

  const voteCounts: Record<string, number> = {};
  for (const v of input.votes) voteCounts[v.optionId] = (voteCounts[v.optionId] ?? 0) + 1;
  const result: ResolutionResult =
    (input.resolution.ergebnis as ResolutionResult | null) ??
    computeResult({
      resolution: input.resolution,
      eligibleCount: input.eligible.length,
      voteCounts,
    });

  // ── Kopf ────────────────────────────────────────────────────────────
  doc.setFillColor(227, 6, 19);
  doc.rect(0, 0, pageW, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DRK – PROTOKOLL UMLAUFBESCHLUSS", margin, 8);
  doc.setTextColor(33, 37, 41);
  y = 22;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(input.tenant.name, margin, y);
  y += 4;
  if (input.body) {
    const bodyLine = input.body.organizationName
      ? `${input.body.organizationName} – ${input.body.name}`
      : input.body.name;
    doc.text(`Gremium: ${bodyLine}`, margin, y);
    y += 4;
  }
  doc.text(
    `Beschluss-ID: ${input.resolution.id}`,
    margin,
    y,
  );
  y += 4;
  doc.text(
    `Erstellt: ${new Date(input.resolution.createdAt).toLocaleString("de-DE")}`,
    margin,
    y,
  );
  y += 4;
  if (input.resolution.abgeschlossenAm) {
    doc.text(
      `Abgeschlossen: ${new Date(input.resolution.abgeschlossenAm).toLocaleString("de-DE")}`,
      margin,
      y,
    );
    y += 4;
  }
  if (input.createdBy) {
    doc.text(
      `Anlage: ${input.createdBy.name ?? input.createdBy.email}`,
      margin,
      y,
    );
    y += 4;
  }
  y += 4;

  // ── Beschluss-Titel & Text ──────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Beschlussgegenstand", margin, y);
  y += 7;
  doc.setFontSize(12);
  doc.text(input.resolution.titel, margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (input.resolution.begruendungMd) {
    const lines = doc.splitTextToSize(input.resolution.begruendungMd, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ── Verfahren ───────────────────────────────────────────────────────
  ensureSpace(doc, y, 40);
  y = paragraphHeader(doc, "Verfahren", y, margin);
  const verfahren = [
    ["Rechtsgrundlage", "§ 21 Abs. 6 i.V.m. § 22 Abs. 5 DRK-Satzung KV StädteRegion Aachen"],
    ["Frist (Ende)", new Date(input.resolution.fristEnde).toLocaleString("de-DE")],
    ["Erforderliches Quorum", `${input.resolution.quorumPct} % der Stimmberechtigten`],
    ["Erforderliche Mehrheit", mehrheitLabel(input.resolution.mehrheit)],
    [
      "Stimm-Modus",
      input.resolution.voteChangeMode === "fest"
        ? "Stimmen unwiderruflich (einmalige Abgabe)"
        : "Stimmen änderbar bis Fristende",
    ],
  ];
  y = drawKeyValueTable(doc, verfahren, y, margin, pageW);
  y += 4;

  // ── Stimmberechtigte ────────────────────────────────────────────────
  ensureSpace(doc, y, 20);
  y = paragraphHeader(doc, `Stimmberechtigte (${input.eligible.length})`, y, margin);
  const voteByUserId = new Map(input.votes.map((v) => [v.userId, v]));
  const eligibleRows: string[][] = [
    ["Name", "Rolle", "Stimme", "Abgegeben am"],
    ...input.eligible.map((e) => {
      const v = voteByUserId.get(e.userId);
      return [
        e.nameSnapshot,
        roleLabel(e.roleSnapshot),
        v ? optionLabel(v.optionId) : "—",
        v ? new Date(v.updatedAt).toLocaleString("de-DE") : "—",
      ];
    }),
  ];
  y = drawTable(doc, eligibleRows, y, margin, pageW, [60, 30, 35, 50]);
  y += 4;

  // ── Ergebnis ────────────────────────────────────────────────────────
  ensureSpace(doc, y, 60);
  y = paragraphHeader(doc, "Ergebnis", y, margin);
  const ergebnisRows = [
    ["Stimmberechtigte", String(result.eligibleCount)],
    [
      "Abgegebene Stimmen",
      `${result.voteCount} (${result.participationPct.toFixed(1)} %)`,
    ],
    ["Quorum erreicht", result.quorumReached ? "Ja" : "Nein"],
    ...result.perOption.map((o) => [o.label, String(o.count)]),
    ["Mehrheit (Schwelle)", `${result.thresholdPct.toFixed(2).replace(/\.00$/, "")} %`],
    ["Mehrheit erreicht", result.majorityReached ? "Ja" : "Nein"],
  ];
  y = drawKeyValueTable(doc, ergebnisRows, y, margin, pageW);
  y += 4;

  ensureSpace(doc, y, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  if (input.resolution.status === "zurueckgezogen") {
    doc.setTextColor(180, 83, 9);
    doc.text("Status: Zurückgezogen", margin, y + 6);
  } else if (result.accepted) {
    doc.setTextColor(40, 167, 69);
    doc.text("Status: Beschluss angenommen", margin, y + 6);
  } else {
    doc.setTextColor(198, 40, 40);
    doc.text("Status: Beschluss nicht angenommen", margin, y + 6);
  }
  doc.setTextColor(33, 37, 41);
  y += 14;

  // ── Fußzeile auf jeder Seite ───────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${input.tenant.name} · Erzeugt ${new Date().toLocaleString("de-DE")} · Seite ${i}/${pageCount}`,
      pageW / 2,
      287,
      { align: "center" },
    );
    doc.setTextColor(33, 37, 41);
  }

  const ab = doc.output("arraybuffer");
  return Buffer.from(ab);
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed > 280) {
    doc.addPage();
    return 22;
  }
  return y;
}

function paragraphHeader(doc: jsPDF, label: string, y: number, margin: number): number {
  y = ensureSpace(doc, y, 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  return y + 5;
}

function drawKeyValueTable(
  doc: jsPDF,
  rows: Array<[string, string]> | string[][],
  startY: number,
  margin: number,
  pageW: number,
): number {
  const colW = [70, pageW - 2 * margin - 70];
  let y = startY;
  doc.setFontSize(10);
  for (const row of rows) {
    y = ensureSpace(doc, y, 6);
    doc.setFont("helvetica", "bold");
    doc.text(String(row[0]), margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(row[1]), colW[1]);
    doc.text(lines, margin + colW[0], y);
    y += Math.max(5, lines.length * 4);
  }
  return y;
}

function drawTable(
  doc: jsPDF,
  rows: string[][],
  startY: number,
  margin: number,
  pageW: number,
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
      doc.rect(margin, y - 4, pageW - 2 * margin, 6, "F");
    }
    let x = margin;
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

function mehrheitLabel(m: string): string {
  return {
    simple: "Einfache Mehrheit (> 50 %)",
    two_thirds: "Zwei-Drittel-Mehrheit (≥ 66,67 %)",
    three_quarters: "Drei-Viertel-Mehrheit (≥ 75 %)",
  }[m] ?? m;
}
