import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vielen Dank - DRK Vereinsabstimmung",
  description: "Vielen Dank fuer Ihre Teilnahme an der DRK Vereinsabstimmung",
};

export default function DankeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
