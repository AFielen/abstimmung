export const metadata = { title: "Datenschutz – DRK Rundlaufbeschlüsse" };

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose">
      <h1 className="text-3xl font-bold mb-6">Datenschutz</h1>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Verantwortlich</h2>
        <p>
          Deutsches Rotes Kreuz Kreisverband StädteRegion Aachen e.V.,
          Henry-Dunant-Platz 1, 52146 Würselen.
          E-Mail: <a href="mailto:Info@DRK-Aachen.de" style={{ color: "var(--drk)" }}>Info@DRK-Aachen.de</a>
        </p>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Welche Daten wir verarbeiten</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li><strong>E-Mail-Adresse + Name</strong> (von dir angegeben) zur Authentifizierung und Zuordnung deiner Stimme.</li>
          <li><strong>Mitgliedschaften</strong> im jeweiligen Kreisverband.</li>
          <li><strong>Beschlüsse, Stimmen, Zeitstempel</strong> – als Nachweis gemäß § 21 Abs. 6 der Vereinssatzung.</li>
          <li><strong>Pseudonymisierter IP-/User-Agent-Hash</strong> zum Schutz gegen Missbrauch.</li>
        </ul>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Speicherdauer</h2>
        <p>
          Beschluss-Daten werden 10 Jahre nach Abschluss aufbewahrt (Nachweis-
          und Vereinsdokumentationspflichten). Danach werden personenbezogene
          Snapshots automatisch anonymisiert. Audit-Logs werden ebenfalls nach
          10 Jahren gelöscht.
        </p>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Cookies & Tracking</h2>
        <p>
          Wir setzen ausschließlich ein technisch erforderliches Session-Cookie
          (HttpOnly, SameSite=Lax) zur Anmeldung. Kein Tracking, keine Analytics,
          keine Drittanbieter.
        </p>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Auftragsverarbeiter</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li><strong>Mailjet</strong> (Mailgun/Sinch) zum Versand von Magic-Links und Benachrichtigungen.</li>
        </ul>
      </section>

      <section className="drk-card">
        <h2 className="text-xl font-bold mb-3">Deine Rechte</h2>
        <p>
          Du hast jederzeit Anspruch auf Auskunft, Berichtigung, Löschung,
          Einschränkung und Datenübertragbarkeit. Wende dich an
          <a href="mailto:Info@DRK-Aachen.de" style={{ color: "var(--drk)" }}>
            {" Info@DRK-Aachen.de"}
          </a>.
        </p>
      </section>
    </div>
  );
}
