// Gemeinsame Typen des Entwurfs-Editors (von page.tsx befuellt, von den
// Sektions-Komponenten konsumiert).

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
  status: "active" | "invited";
};
