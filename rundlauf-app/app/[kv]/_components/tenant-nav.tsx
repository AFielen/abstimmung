"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TenantNav({
  kv,
  tenantName,
  isAdmin,
}: {
  kv: string;
  tenantName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname() ?? "";
  const items: { href: string; label: string; exact?: boolean }[] = [
    { href: `/${kv}`, label: "Übersicht", exact: true },
    ...(isAdmin
      ? [
          { href: `/${kv}/mitglieder`, label: "Mitglieder" },
          { href: `/${kv}/struktur`, label: "Struktur" },
        ]
      : []),
  ];
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Kreisverband"
      className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-light)" }}>
          Kreisverband
        </div>
        <Link href={`/${kv}`} className="text-xl font-bold hover:underline break-words">
          {tenantName}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="drk-btn-secondary"
            aria-current={isActive(it.href, it.exact) ? "page" : undefined}
          >
            {it.label}
          </Link>
        ))}
        <Link href="/" className="drk-btn-secondary">
          Startseite
        </Link>
        {isAdmin ? (
          <Link href={`/${kv}/beschluss/neu`} className="drk-btn-primary">
            Neues Umlaufverfahren
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
