import Link from "next/link";
import { requireAdmin } from "@/lib/tenant";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function MemberImportPage({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  await requireAdmin(kv);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/${kv}/mitglieder`}
          className="text-sm"
          style={{ color: "var(--drk)" }}
        >
          ← Zurück zu den Mitgliedern
        </Link>
      </div>

      <section className="drk-card">
        <h2 className="text-xl font-bold mb-2">Mitglieder importieren</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          Lade eine <strong>CSV-</strong> oder <strong>Excel-Datei (.xlsx)</strong> mit
          deinen Gremiumsmitgliedern hoch. Erforderlich ist eine Spalte{" "}
          <code>E-Mail</code>, optional eine Spalte <code>Name</code> sowie eine
          Spalte <code>Rolle</code> (<code>admin</code> oder <code>member</code>).
          Maximal 500 Zeilen pro Import.
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          <a
            href="/mitglieder-vorlage.csv"
            download
            className="underline"
            style={{ color: "var(--drk)" }}
          >
            CSV-Vorlage herunterladen
          </a>
        </p>

        <ImportForm kv={kv} />
      </section>
    </div>
  );
}
