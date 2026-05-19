import Papa from "papaparse";
import readXlsxFile from "read-excel-file/node";

export type RawRow = {
  email: string;
  name?: string;
  role?: string;
};

const EMAIL_KEYS = new Set([
  "email",
  "e-mail",
  "e mail",
  "mail",
  "emailadresse",
  "e-mail-adresse",
  "e-mailadresse",
]);
const NAME_KEYS = new Set([
  "name",
  "vollname",
  "vor- und nachname",
  "vor und nachname",
  "vorname nachname",
  "anzeigename",
  "displayname",
]);
const ROLE_KEYS = new Set(["rolle", "role", "funktion"]);

function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .trim()
    .replace(/[._]/g, "")
    .replace(/\s+/g, " ");
}

function toString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  return "";
}

function looksLikeEmail(s: string): boolean {
  return /@/.test(s);
}

function rowsToRawRows(rows: unknown[][]): RawRow[] {
  if (rows.length === 0) return [];

  const headerRow = rows[0].map((c) => toString(c));
  const headerMap: { email?: number; name?: number; role?: number } = {};

  headerRow.forEach((h, i) => {
    const norm = normalizeKey(h);
    if (!norm) return;
    if (EMAIL_KEYS.has(norm)) headerMap.email = i;
    else if (NAME_KEYS.has(norm)) headerMap.name = i;
    else if (ROLE_KEYS.has(norm)) headerMap.role = i;
  });

  let dataRows: unknown[][];
  let mapping: { email: number; name?: number; role?: number };

  if (headerMap.email !== undefined) {
    dataRows = rows.slice(1);
    mapping = { email: headerMap.email, name: headerMap.name, role: headerMap.role };
  } else {
    const firstCell = toString(rows[0][0]).trim();
    const hasHeader = !looksLikeEmail(firstCell);
    dataRows = hasHeader ? rows.slice(1) : rows;
    mapping = { email: 0, name: rows[0].length > 1 ? 1 : undefined, role: rows[0].length > 2 ? 2 : undefined };
  }

  const out: RawRow[] = [];
  for (const row of dataRows) {
    const email = toString(row[mapping.email]).trim();
    if (!email) continue;
    const name =
      mapping.name !== undefined ? toString(row[mapping.name]).trim() : "";
    const role =
      mapping.role !== undefined ? toString(row[mapping.role]).trim() : "";
    out.push({
      email,
      name: name || undefined,
      role: role || undefined,
    });
  }
  return out;
}

function detectFormat(filename: string, buffer: Buffer): "csv" | "xlsx" {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv" || ext === "txt" || ext === "tsv") return "csv";
  // Magic bytes: XLSX is a ZIP (PK\x03\x04), XLS is OLE (D0CF11E0)
  if (buffer.length >= 4) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    if (b0 === 0x50 && b1 === 0x4b) return "xlsx";
    if (b0 === 0xd0 && b1 === 0xcf) return "xlsx";
  }
  return "csv";
}

async function parseCsv(buffer: Buffer): Promise<unknown[][]> {
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  const sample = text.slice(0, 2048);
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  let delimiter: string | undefined;
  if (tabCount > semiCount && tabCount > commaCount) delimiter = "\t";
  else if (semiCount > commaCount) delimiter = ";";

  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    delimiter,
  });
  return result.data as unknown[][];
}

async function parseXlsx(buffer: Buffer): Promise<unknown[][]> {
  const rows = await readXlsxFile(buffer);
  return rows as unknown[][];
}

export async function parseMembersFile(
  buffer: Buffer,
  filename: string,
): Promise<RawRow[]> {
  const format = detectFormat(filename, buffer);
  const rows = format === "xlsx" ? await parseXlsx(buffer) : await parseCsv(buffer);
  return rowsToRawRows(rows);
}
