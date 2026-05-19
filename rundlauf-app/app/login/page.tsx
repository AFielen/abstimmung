import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden – DRK Rundlaufbeschlüsse" };

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="drk-card drk-fade-in">
        <h1 className="text-2xl font-bold mb-2">Anmelden</h1>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Wir schicken dir einen Magic-Link per E-Mail.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
