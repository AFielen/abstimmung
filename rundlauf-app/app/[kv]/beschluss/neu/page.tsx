import { requireAdmin } from "@/lib/tenant";
import { MIN_FRIST_DAYS } from "@/lib/resolution";
import { CreateForm } from "./form";

export const metadata = { title: "Neuer Beschluss" };
export const dynamic = "force-dynamic";

export default async function NewResolutionPage({
  params,
}: {
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  await requireAdmin(kv);

  return (
    <div className="drk-card max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Neuer Umlaufbeschluss</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-light)" }}>
        Sobald du den Beschluss anlegst, werden alle aktiven Mitglieder per E-Mail
        eingeladen. Die Frist muss laut § 21 Abs. 6 mindestens {MIN_FRIST_DAYS} Tage
        betragen.
      </p>
      <CreateForm kv={kv} minDays={MIN_FRIST_DAYS} />
    </div>
  );
}
