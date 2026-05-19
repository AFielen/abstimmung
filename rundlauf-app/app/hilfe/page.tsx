export const metadata = { title: "Hilfe – DRK Rundlaufbeschlüsse" };

export default function HilfePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Hilfe & FAQ</h1>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Was ist ein Rundlaufbeschluss?</h2>
        <p>
          Das Umlaufverfahren erlaubt es dem Präsidium, Beschlüsse ohne
          Präsenz-Sitzung zu fassen. Geregelt in <strong>§ 21 Abs. 6 i.V.m.
          § 22 Abs. 5</strong> der Satzung des DRK Kreisverband StädteRegion
          Aachen e.V.
        </p>
        <ul className="list-disc ml-5 mt-3 space-y-1 text-sm">
          <li>Frist mindestens 14 Tage</li>
          <li>Quorum: mindestens 75 % der Stimmberechtigten müssen abstimmen</li>
          <li>Stimmen werden in Textform abgegeben (nicht anonym)</li>
        </ul>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Anmeldung</h2>
        <p>
          Wir verwenden Magic-Links statt Passwörter. Du gibst deine
          E-Mail-Adresse ein, bekommst einen Link per Mail und bist nach Klick
          angemeldet. Der Link ist 60 Minuten gültig.
        </p>
      </section>

      <section className="drk-card mb-6">
        <h2 className="text-xl font-bold mb-3">Stimm-Modus &bdquo;fest&ldquo; vs. &bdquo;&auml;nderbar&ldquo;</h2>
        <p>
          Beim Anlegen eines Beschlusses entscheidet die anlegende Person, ob
          Stimmen während der Frist noch geändert werden dürfen:
        </p>
        <ul className="list-disc ml-5 mt-3 space-y-1 text-sm">
          <li><strong>Änderbar:</strong> bis zum Fristende kann die Stimme korrigiert werden. Es gilt jeweils die letzte abgegebene Stimme.</li>
          <li><strong>Fest:</strong> die Stimme ist nach einmaliger Abgabe unwiderruflich.</li>
        </ul>
      </section>

      <section className="drk-card">
        <h2 className="text-xl font-bold mb-3">Kontakt</h2>
        <p>
          DRK Kreisverband StädteRegion Aachen e.V.<br />
          Henry-Dunant-Platz 1, 52146 Würselen<br />
          <a href="mailto:Info@DRK-Aachen.de" style={{ color: "var(--drk)" }}>
            Info@DRK-Aachen.de
          </a>
        </p>
      </section>
    </div>
  );
}
