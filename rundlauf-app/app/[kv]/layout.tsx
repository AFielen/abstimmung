import Link from "next/link";
import { requireTenantContext } from "@/lib/tenant";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ kv: string }>;
}) {
  const { kv } = await params;
  const ctx = await requireTenantContext(kv);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav
        className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
            Kreisverband
          </div>
          <Link href={`/${kv}`} className="text-xl font-bold hover:underline">
            {ctx.tenant.name}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${kv}`} className="drk-btn-secondary">
            Übersicht
          </Link>
          <Link href={`/${kv}/beschluss/neu`} className="drk-btn-primary">
            Neuer Beschluss
          </Link>
          {ctx.isAdmin ? (
            <Link href={`/${kv}/mitglieder`} className="drk-btn-secondary">
              Mitglieder
            </Link>
          ) : null}
          <Link href="/" className="drk-btn-secondary">
            Alle KVs
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
