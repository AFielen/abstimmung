import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : undefined;
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="drk-card drk-fade-in">
        <h1 className="text-2xl font-bold mb-2">Anmelden</h1>
        {error === "invalid" ? (
          <div
            role="alert"
            className="rounded-lg p-3 text-sm mb-4"
            style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
          >
            Dieser Anmelde-Link ist ungültig oder abgelaufen. Links gelten 60 Minuten
            und nur einmal. Fordere unten einfach einen neuen an.
          </div>
        ) : null}
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Wir schicken dir einen Anmelde-Link per E-Mail – ein Passwort brauchst du nicht.
        </p>
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
