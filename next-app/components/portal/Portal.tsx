import Link from 'next/link';

function UsersIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2z" />
      <path d="M5 6h14v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6z" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function Portal() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: 'var(--text)' }}
        >
          Wählen Sie Ihr Verfahren
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-light)' }}>
          Für die Versammlungs-Abstimmung oder den schriftlichen Rundlaufbeschluss.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Versammlung (internal) */}
        <Link
          href="/versammlung"
          className="drk-card portal-card group flex flex-col justify-between min-h-[200px] transition-all"
        >
          <div>
            <div className="mb-3" style={{ color: 'var(--drk)' }}>
              <UsersIcon />
            </div>
            <h2 className="text-lg font-bold mb-1">Versammlung</h2>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--drk)' }}>
              Live-Abstimmung in der Sitzung
            </p>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Echtzeit-Abstimmungen für Versammlungen. Teilnehmende stimmen per
              QR-Code direkt ab.
            </p>
          </div>
          <div
            className="flex items-center justify-end mt-4 text-sm font-medium"
            style={{ color: 'var(--drk)' }}
          >
            Starten
            <span className="ml-1.5">
              <ArrowRightIcon />
            </span>
          </div>
        </Link>

        {/* Card 2: Rundlaufbeschluss (external subdomain) */}
        <a
          href="https://rundlauf.drk-abstimmung.de/"
          className="drk-card portal-card group flex flex-col justify-between min-h-[200px] transition-all"
        >
          <div>
            <div className="mb-3" style={{ color: 'var(--drk)' }}>
              <ClipboardCheckIcon />
            </div>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-1.5">
              Rundlaufbeschluss
              <span style={{ color: 'var(--text-light)' }}>
                <ExternalLinkIcon />
              </span>
            </h2>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--drk)' }}>
              Schriftlich, asynchron
            </p>
            <p className="text-sm" style={{ color: 'var(--text-light)' }}>
              Umlaufverfahren für Präsidien gemäß § 21 Abs. 6 der DRK-Satzung.
              Per E-Mail-Einladung, kein Passwort nötig.
            </p>
          </div>
          <div
            className="flex items-center justify-end mt-4 text-sm font-medium"
            style={{ color: 'var(--drk)' }}
          >
            Öffnen
            <span className="ml-1.5">
              <ArrowRightIcon />
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
