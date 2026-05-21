import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { memberships, tenants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  const myMemberships = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")));

  const tenantIds = myMemberships.map((m) => m.tenantId);
  const myTenants = tenantIds.length
    ? await db
        .select()
        .from(tenants)
        .where(and(inArray(tenants.id, tenantIds), eq(tenants.status, "active")))
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hallo {user.name ?? user.email}</h1>
          <div className="text-sm" style={{ color: "var(--text-light)" }}>
            {user.email}
            {user.isSuperadmin ? " · Super-Admin" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.isSuperadmin ? (
            <Link href="/admin" className="drk-btn-secondary">
              Moderation
            </Link>
          ) : null}
          <Link href="/logout" className="drk-btn-secondary" prefetch={false}>
            Abmelden
          </Link>
        </div>
      </div>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-4">Deine Kreisverbände</h2>
        {myTenants.length === 0 ? (
          <p style={{ color: "var(--text-light)" }}>
            Du gehörst noch keinem aktiven Kreisverband an. Du kannst einen neuen
            anlegen oder auf eine Einladung warten.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {myTenants.map((t) => {
              const m = myMemberships.find((mm) => mm.tenantId === t.id);
              return (
                <li key={t.id}>
                  <Link
                    href={`/${t.slug}`}
                    className="block rounded-xl border p-4 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="font-bold">{t.name}</div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-light)" }}
                    >
                      <code>/{t.slug}</code>
                      {m ? ` · Rolle: ${m.role}` : ""}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <Link href="/neuer-kv" className="drk-btn-primary">
            Neuen Kreisverband anlegen
          </Link>
        </div>
      </section>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="hero">
        <div className="hero-icon">📋</div>
        <h1 className="text-3xl font-bold mb-2">Rundlaufbeschlüsse</h1>
        <p className="text-white/90">
          Digitales Umlaufverfahren für Präsidien gemäß § 21 Abs. 6 der DRK-Satzung.
        </p>
      </div>

      <div className="overlap-card drk-fade-in">
        <h2 className="text-xl font-bold mb-4">Loslegen</h2>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Melde dich mit deiner E-Mail-Adresse an oder lege einen neuen
          Kreisverband an. Wir senden dir einen Magic-Link – kein Passwort nötig.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="drk-btn-primary flex-1 text-center">
            Anmelden
          </Link>
          <Link href="/registrieren" className="drk-btn-secondary flex-1 text-center">
            Neu registrieren
          </Link>
        </div>
      </div>

      <section className="mt-10 drk-card">
        <h3 className="font-bold mb-3">So funktioniert es</h3>
        <ol className="steps-list">
          <li>E-Mail-Adresse eingeben, Magic-Link erhalten.</li>
          <li>Kreisverband anlegen (wird vom Super-Admin freigeschaltet).</li>
          <li>Mitglieder per E-Mail einladen.</li>
          <li>Beschlüsse anlegen, Stimmen einsammeln, Protokoll als PDF.</li>
        </ol>
      </section>

      <section className="mt-6 drk-card">
        <h3 className="font-bold mb-2">Sie suchen eine Live-Abstimmung?</h3>
        <p className="text-sm mb-3" style={{ color: "var(--text-light)" }}>
          Für Echtzeit-Abstimmungen in Versammlungen (mit QR-Code für
          Teilnehmende) nutzen Sie das Schwester-Tool.
        </p>
        <a
          href="https://drk-abstimmung.de/versammlung"
          className="drk-btn-secondary inline-block"
        >
          Zur DRK Vereinsabstimmung →
        </a>
      </section>
    </div>
  );
}
