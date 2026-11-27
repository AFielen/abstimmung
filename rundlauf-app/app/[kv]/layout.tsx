import { requireTenantContext } from "@/lib/tenant";
import { TenantNav } from "./_components/tenant-nav";

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
      <TenantNav kv={kv} tenantName={ctx.tenant.name} isAdmin={ctx.isAdmin} />
      {children}
    </div>
  );
}
