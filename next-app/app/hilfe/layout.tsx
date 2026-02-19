import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hilfe & Anleitung - DRK Vereinsabstimmung",
  description: "Anleitung, FAQ und Sicherheitsinformationen zur DRK Vereinsabstimmung",
};

export default function HilfeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
