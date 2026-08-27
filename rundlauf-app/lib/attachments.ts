import { createHash } from "node:crypto";
import {
  ATTACHMENT_ALLOWED_MIME,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
} from "@/lib/resolution";

export type AttachmentValidationError =
  | { kind: "mime"; message: string }
  | { kind: "size"; message: string }
  | { kind: "magic"; message: string }
  | { kind: "filename"; message: string }
  | { kind: "count"; message: string };

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"

export function sanitizeFilename(raw: string): string {
  const trimmed = raw.trim().replace(/[\r\n\t]/g, "").slice(0, 200);
  // Pfadtrenner entfernen, nur Basename behalten.
  const base = trimmed.split(/[\\/]/).pop() ?? trimmed;
  return base || "anlage.pdf";
}

export function validateAttachment(opts: {
  mimeType: string;
  size: number;
  buf: Buffer;
  filename: string;
  existingCount: number;
}): AttachmentValidationError | null {
  if (opts.existingCount >= ATTACHMENT_MAX_COUNT) {
    return {
      kind: "count",
      message: `Maximal ${ATTACHMENT_MAX_COUNT} Anlagen pro Beschluss.`,
    };
  }
  if (opts.mimeType !== ATTACHMENT_ALLOWED_MIME) {
    return {
      kind: "mime",
      message: "Nur PDF-Dateien sind zulässig (application/pdf).",
    };
  }
  if (opts.size <= 0) {
    return { kind: "size", message: "Datei ist leer." };
  }
  if (opts.size > ATTACHMENT_MAX_BYTES) {
    return {
      kind: "size",
      message: `Datei größer als ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB.`,
    };
  }
  if (opts.buf.length < 4 || !opts.buf.subarray(0, 4).equals(PDF_MAGIC)) {
    return {
      kind: "magic",
      message: "Datei ist kein gültiges PDF (Header fehlt).",
    };
  }
  const cleaned = sanitizeFilename(opts.filename);
  if (!cleaned.toLowerCase().endsWith(".pdf")) {
    return { kind: "filename", message: "Dateiname muss auf .pdf enden." };
  }
  return null;
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
