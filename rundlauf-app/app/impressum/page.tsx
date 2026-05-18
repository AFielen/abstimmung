export const metadata = { title: "Impressum – DRK Rundlaufbeschlüsse" };

export default function ImpressumPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Impressum</h1>
      <section className="drk-card">
        <h2 className="text-lg font-bold mb-3">Angaben gemäß § 5 TMG</h2>
        <address className="not-italic">
          <strong>Deutsches Rotes Kreuz</strong><br />
          Kreisverband StädteRegion Aachen e.V.<br />
          Henry-Dunant-Platz 1<br />
          52146 Würselen<br />
          Deutschland
        </address>
        <p className="mt-4">
          Telefon: +49 (0) 2405 / 6038-0<br />
          E-Mail: <a href="mailto:Info@DRK-Aachen.de" style={{ color: "var(--drk)" }}>Info@DRK-Aachen.de</a><br />
          Web: <a href="https://www.drk-aachen.de" style={{ color: "var(--drk)" }}>www.drk-aachen.de</a>
        </p>
        <p className="mt-4 text-sm" style={{ color: "var(--text-light)" }}>
          Vertretungsberechtigter Vorstand, Vereinsregister-Nr. und USt-IdNr.
          siehe Hauptseite drk-aachen.de.
        </p>
      </section>
    </div>
  );
}
