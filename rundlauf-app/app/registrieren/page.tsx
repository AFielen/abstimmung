import { LoginForm } from "../login/login-form";

export const metadata = { title: "Registrieren – DRK Rundlaufbeschlüsse" };

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="drk-card drk-fade-in">
        <h1 className="text-2xl font-bold mb-2">Registrieren</h1>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Trage deine E-Mail-Adresse ein. Wir schicken dir einen Magic-Link.
          Nach Bestätigung kannst du einen Kreisverband anlegen.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
