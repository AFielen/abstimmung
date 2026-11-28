import Link from "next/link";

export const metadata = { title: "Seite nicht gefunden" };

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="drk-card text-center max-w-md mx-auto">
        <span className="drk-badge-warning">404</span>
        <h1 className="text-2xl font-bold mt-3 mb-2">Seite nicht gefunden</h1>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Die aufgerufene Seite gibt es nicht oder du hast keinen Zugriff darauf.
          Prüfe den Link aus deiner E-Mail oder gehe zur Übersicht.
        </p>
        <Link href="/" className="drk-btn-primary inline-block">
          Zur Übersicht
        </Link>
      </div>
    </div>
  );
}
