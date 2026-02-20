import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="drk-card text-center max-w-md">
        <div className="text-6xl mb-4">&#128269;</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Seite nicht gefunden
        </h2>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Die angeforderte Seite existiert leider nicht.
        </p>
        <Link href="/" className="drk-btn-primary inline-block">
          Zur&uuml;ck zur Startseite
        </Link>
      </div>
    </div>
  );
}
