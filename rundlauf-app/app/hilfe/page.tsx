import Link from "next/link";

export const metadata = { title: "Hilfe – DRK Rundlaufbeschlüsse" };

export default function HilfePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="hero">
        <div className="hero-icon">❔</div>
        <h1 className="text-3xl font-bold mb-2">Hilfe &amp; Anleitung</h1>
        <p className="text-white/90">
          Alles, was du zum Anlegen, Durchführen und Auswerten eines
          Rundlaufbeschlusses wissen musst.
        </p>
      </div>

      {/* Inhaltsverzeichnis */}
      <nav className="overlap-card drk-fade-in" aria-label="Inhaltsverzeichnis">
        <h2 className="text-lg font-bold mb-3">Inhalt</h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <li><a href="#was-ist" style={{ color: "var(--drk)" }}>Was ist ein Rundlaufbeschluss?</a></li>
          <li><a href="#rollen" style={{ color: "var(--drk)" }}>Rollen im System</a></li>
          <li><a href="#anmeldung" style={{ color: "var(--drk)" }}>Anmeldung mit Magic-Link</a></li>
          <li><a href="#admin-setup" style={{ color: "var(--drk)" }}>Als Admin: Beschluss einrichten</a></li>
          <li><a href="#stimm-modus" style={{ color: "var(--drk)" }}>Stimm-Modus: änderbar vs. fest</a></li>
          <li><a href="#abstimmen" style={{ color: "var(--drk)" }}>Als Stimmberechtigte:r abstimmen</a></li>
          <li><a href="#lebenszyklus" style={{ color: "var(--drk)" }}>Lebenszyklus eines Beschlusses</a></li>
          <li><a href="#abschluss" style={{ color: "var(--drk)" }}>Abschluss &amp; Ergebnis-Berechnung</a></li>
          <li><a href="#datenschutz" style={{ color: "var(--drk)" }}>Datenschutz &amp; Aufbewahrung</a></li>
          <li><a href="#faq" style={{ color: "var(--drk)" }}>Häufige Fragen (FAQ)</a></li>
          <li><a href="#tipps" style={{ color: "var(--drk)" }}>Tipps für reibungslose Verfahren</a></li>
          <li><a href="#kontakt" style={{ color: "var(--drk)" }}>Kontakt &amp; Unterstützung</a></li>
        </ul>
      </nav>

      {/* 1. Was ist ein Rundlaufbeschluss? */}
      <section id="was-ist" className="drk-card mb-6 fade-up mt-10">
        <h2 className="text-xl font-bold mb-3">Was ist ein Rundlaufbeschluss?</h2>
        <p>
          Ein Rundlaufbeschluss – auch <em>Umlaufverfahren</em> genannt – ist
          eine Möglichkeit, Beschlüsse zu fassen, ohne dass alle Beteiligten
          gleichzeitig an einer Sitzung teilnehmen müssen. Stimmberechtigte
          geben ihre Stimme innerhalb einer festgelegten Frist elektronisch ab.
        </p>
        <p className="mt-3">
          Ob und unter welchen Bedingungen dein Gremium Beschlüsse im
          Umlaufverfahren fassen darf, regelt die <strong>Satzung oder
          Geschäftsordnung deines Vereins</strong>. Typische Vorgaben betreffen
          die Mindestfrist, das Quorum und die Form der Stimmabgabe.
        </p>
        <p className="mt-3 font-semibold">Typische Merkmale:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
          <li>Frist häufig mindestens 14 Tage – frei einstellbar pro Beschluss</li>
          <li>Quorum (Mindest-Beteiligung) häufig 75 % – frei einstellbar pro Tagesordnungspunkt</li>
          <li>Stimmen werden in Textform abgegeben und sind <strong>nicht anonym</strong></li>
          <li>Vollständiges Audit-Trail (Zeitstempel je Stimme, lückenlose Protokollierung)</li>
        </ul>
      </section>

      {/* 2. Rollen im System */}
      <section id="rollen" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Rollen im System</h2>
        <p className="mb-4">
          Das System unterscheidet drei Rollen mit klar abgegrenzten Rechten:
        </p>
        <div className="feature-grid">
          <div className="feature-item">
            <div
              className="feature-icon"
              style={{ background: "var(--drk-bg)", color: "var(--drk)" }}
              aria-hidden
            >
              ★
            </div>
            <div>
              <div className="font-bold">Super-Admin</div>
              <div className="text-sm" style={{ color: "var(--text-light)" }}>
                Plattformweite Rolle. Schaltet neue Verbände frei, hat innerhalb
                eines Verbands aber keine inhaltlichen Rechte.
              </div>
            </div>
          </div>
          <div className="feature-item">
            <div
              className="feature-icon"
              style={{ background: "#fffbeb", color: "#b45309" }}
              aria-hidden
            >
              ⚙
            </div>
            <div>
              <div className="font-bold">Admin / Owner des Verbands</div>
              <div className="text-sm" style={{ color: "var(--text-light)" }}>
                Legt Beschlüsse an, verwaltet Stimmberechtigte, eröffnet und
                schließt Verfahren, exportiert Protokolle.
              </div>
            </div>
          </div>
          <div className="feature-item">
            <div
              className="feature-icon"
              style={{ background: "#eff6ff", color: "var(--info)" }}
              aria-hidden
            >
              ✓
            </div>
            <div>
              <div className="font-bold">Mitglied / Stimmberechtigte:r</div>
              <div className="text-sm" style={{ color: "var(--text-light)" }}>
                Erhält Einladungs-E-Mails, sichtet Tagesordnung &amp; Anlagen,
                gibt Stimme(n) ab.
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--text-light)" }}>
          Hinweis: Die Begriffe „Kreisverband", „Landesverband" und „Mandant"
          meinen technisch dasselbe – einen abgegrenzten Bereich im System für
          deinen Verband.
        </p>
      </section>

      {/* 3. Anmeldung */}
      <section id="anmeldung" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Anmeldung mit Magic-Link</h2>
        <p>
          Statt eines Passworts nutzt das System sogenannte <strong>Magic-Links</strong>.
          Du gibst deine E-Mail-Adresse ein, bekommst einen einmalig nutzbaren
          Link per Mail und bist nach Klick angemeldet.
        </p>
        <ul className="list-disc ml-5 mt-3 space-y-1 text-sm">
          <li>Gültigkeit eines Links: <strong>60 Minuten</strong></li>
          <li>Jeder neue Link macht ältere Links derselben Adresse unwirksam</li>
          <li>Vorteil: kein Passwort-Vergessen, kein Passwort-Reuse-Risiko</li>
          <li>Falls die Mail nicht ankommt: Spam-Ordner prüfen, ggf. neuen Link anfordern</li>
        </ul>
      </section>

      {/* 4. Admin Setup */}
      <section id="admin-setup" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Als Admin: Beschluss einrichten</h2>
        <p className="mb-4">
          Als Admin deines Verbands durchläufst du typischerweise diese
          Schritte, bevor du ein Umlaufverfahren eröffnest:
        </p>
        <ol className="steps-list">
          <li>
            <div>
              <strong>Beschluss anlegen</strong> – Titel, Einleitung, Kontext.
              Der Status startet als <span className="drk-badge-warning">Entwurf</span>.
            </div>
          </li>
          <li>
            <div>
              <strong>Tagesordnungspunkte (TOPs) hinzufügen</strong> – pro TOP:
              Titel, ausführliche Beschreibung und optional Anlagen (z. B. PDFs).
            </div>
          </li>
          <li>
            <div>
              <strong>Antwort-Optionen pro TOP konfigurieren</strong> – Standard
              ist <code>Ja</code> / <code>Nein</code> / <code>Enthaltung</code>.
              Eigene Optionen sind möglich, z. B. für Wahlen.
            </div>
          </li>
          <li>
            <div>
              <strong>Quorum festlegen</strong> – Prozentsatz der
              Stimmberechtigten, die teilnehmen müssen, damit das Verfahren
              gültig ist. Standard: 75 %, pro TOP einstellbar.
            </div>
          </li>
          <li>
            <div>
              <strong>Mehrheitsart wählen</strong> – einfache Mehrheit
              (&gt; 50 %), Zweidrittelmehrheit (≥ 66,67 %) oder
              Dreiviertelmehrheit (≥ 75 %).
            </div>
          </li>
          <li>
            <div>
              <strong>Stimmberechtigte als Snapshot festlegen</strong> – beim
              Eröffnen wird die Liste der Berechtigten „eingefroren". Spätere
              Mitgliedsänderungen wirken nicht rückwirkend auf laufende Verfahren.
            </div>
          </li>
          <li>
            <div>
              <strong>Fristende setzen</strong> – Datum und Uhrzeit, zu dem das
              Verfahren automatisch endet.
            </div>
          </li>
          <li>
            <div>
              <strong>Stimm-Modus wählen</strong> – <em>änderbar</em> oder
              <em> fest</em> (siehe nächster Abschnitt).
            </div>
          </li>
          <li>
            <div>
              <strong>Verfahren eröffnen</strong> – Status wechselt auf
              <span className="drk-badge-success ml-2">Laufend</span>. Die
              Einladungs-E-Mails werden automatisch versandt.
            </div>
          </li>
        </ol>
        <p className="mt-4 text-sm" style={{ color: "var(--text-light)" }}>
          Vor dem Eröffnen kannst du alles noch ändern. <strong>Nach</strong> dem
          Eröffnen sind Inhalt und Stimmberechtigtenliste fixiert.
        </p>
      </section>

      {/* 5. Stimm-Modus */}
      <section id="stimm-modus" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Stimm-Modus: änderbar vs. fest</h2>
        <p className="mb-4">
          Beim Anlegen eines Beschlusses entscheidest du, ob Stimmen während der
          Frist noch geändert werden dürfen:
        </p>
        <div className="feature-grid">
          <div className="feature-item">
            <div
              className="feature-icon"
              style={{ background: "#eff6ff", color: "var(--info)" }}
              aria-hidden
            >
              ↺
            </div>
            <div>
              <div className="font-bold">Änderbar</div>
              <div className="text-sm" style={{ color: "var(--text-light)" }}>
                Stimme kann bis zum Fristende beliebig oft korrigiert werden. Es
                zählt jeweils die <strong>zuletzt</strong> abgegebene Stimme.
                Empfohlen, wenn nach Diskussion noch Bewegung im Meinungsbild
                erwartet wird.
              </div>
            </div>
          </div>
          <div className="feature-item">
            <div
              className="feature-icon"
              style={{ background: "#f0fdf4", color: "var(--success)" }}
              aria-hidden
            >
              ✓
            </div>
            <div>
              <div className="font-bold">Fest</div>
              <div className="text-sm" style={{ color: "var(--text-light)" }}>
                Die Stimme ist nach einmaliger Abgabe <strong>unwiderruflich</strong>.
                Vor dem endgültigen Speichern erscheint ein Bestätigungsdialog.
                Empfohlen, wenn maximale Verbindlichkeit gewünscht ist.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Als Stimmberechtigte:r */}
      <section id="abstimmen" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Als Stimmberechtigte:r abstimmen</h2>
        <p className="mb-4">
          So gibst du deine Stimme zu einem laufenden Beschluss ab:
        </p>
        <ol className="steps-list">
          <li><div><strong>Einladungs-Mail öffnen</strong> und auf den Magic-Link klicken.</div></li>
          <li><div><strong>Beschluss-Übersicht ansehen:</strong> Titel, Beschreibung, Fristende und die Liste aller Tagesordnungspunkte.</div></li>
          <li><div><strong>Anlagen sichten</strong>, falls vorhanden (z. B. PDFs prüfen).</div></li>
          <li><div><strong>Pro Tagesordnungspunkt eine Option wählen.</strong></div></li>
          <li><div><strong>Stimme abgeben.</strong> Im Modus „fest" erscheint vorher ein Bestätigungsdialog.</div></li>
          <li>
            <div>
              <strong>Im Modus „änderbar":</strong> Du kannst bis zum Fristende
              zurückkehren und deine Auswahl anpassen – nutze dafür einen
              neuen Magic-Link oder bleibe eingeloggt.
            </div>
          </li>
        </ol>
        <p className="mt-4 text-sm" style={{ color: "var(--text-light)" }}>
          Du siehst jederzeit, welche TOPs du schon beantwortet hast und welche
          noch offen sind.
        </p>
      </section>

      {/* 7. Lebenszyklus */}
      <section id="lebenszyklus" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Lebenszyklus eines Beschlusses</h2>
        <p className="mb-4">
          Ein Beschluss durchläuft drei Status:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="drk-badge-warning shrink-0 mt-1">Entwurf</span>
            <span className="text-sm">
              Admin baut das Verfahren auf, ergänzt TOPs und Anlagen. Noch keine
              Stimmen möglich.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="drk-badge-success shrink-0 mt-1">Laufend</span>
            <span className="text-sm">
              Stimmberechtigte können abstimmen. Inhalt und Stimmberechtigtenliste
              sind eingefroren.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="drk-badge-error shrink-0 mt-1">Abgeschlossen</span>
            <span className="text-sm">
              Verfahren beendet – automatisch bei Fristende oder manuell vorzeitig
              durch den Admin. Ergebnis ist fixiert, PDF-Protokoll abrufbar.
            </span>
          </li>
        </ul>
      </section>

      {/* 8. Abschluss & Ergebnis */}
      <section id="abschluss" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Abschluss &amp; Ergebnis-Berechnung</h2>
        <p>
          Ein Verfahren endet entweder automatisch beim Erreichen des Fristendes
          oder vorzeitig manuell durch den Admin (z. B. wenn alle Stimmen bereits
          eingegangen sind).
        </p>
        <p className="mt-3 font-semibold">So wird das Ergebnis berechnet:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
          <li>
            <strong>Beteiligungsquote</strong> = abgegebene Stimmen ÷
            Stimmberechtigte (laut Snapshot)
          </li>
          <li>
            <strong>Quorum erreicht</strong>, wenn Beteiligungsquote ≥
            konfigurierter Quorum-Prozentsatz
          </li>
          <li>
            <strong>Mehrheit</strong> – abhängig von der gewählten Mehrheitsart
            (einfach &gt; 50 %, zwei Drittel ≥ 66,67 %, drei Viertel ≥ 75 %)
          </li>
          <li>
            <strong>Enthaltungen</strong> zählen für das <em>Quorum</em>,
            aber <strong>nicht</strong> für die Mehrheit – sie senken also die
            Hürde nicht
          </li>
          <li>
            Ein Beschluss gilt als <strong>angenommen</strong>, wenn Quorum
            <em> und</em> Mehrheit erreicht sind
          </li>
        </ul>
        <p className="mt-3">
          Nach Abschluss steht ein <strong>PDF-Protokoll</strong> zum Download
          bereit. Es enthält Titel, TOPs, Optionen, alle Einzelstimmen mit
          Zeitstempel sowie die Berechnung und das Endergebnis – versionssicher
          für die Vereinsablage.
        </p>
      </section>

      {/* 9. Datenschutz */}
      <section id="datenschutz" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Datenschutz &amp; Aufbewahrung</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li>Magic-Tokens werden 30 Tage nach Ausstellung automatisch gelöscht.</li>
          <li>
            Personenbezogene Stimm-Snapshots werden 10 Jahre nach Abschluss
            eines Beschlusses anonymisiert (Vereins-Dokumentationspflicht).
          </li>
          <li>Audit-Logs werden nach 10 Jahren ebenfalls gelöscht.</li>
        </ul>
        <p className="mt-3 text-sm">
          Details findest du in der{" "}
          <Link href="/datenschutz" style={{ color: "var(--drk)" }}>
            Datenschutzerklärung
          </Link>.
        </p>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Häufige Fragen (FAQ)</h2>
        <div className="space-y-2">
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Was passiert, wenn ich vergesse abzustimmen?</summary>
            <p className="mt-2 text-sm">
              Deine fehlende Stimme zählt <em>nicht</em> als Enthaltung – sie
              wird gar nicht gezählt. Sie senkt damit aber die Beteiligungsquote
              und kann verhindern, dass das Quorum erreicht wird.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Kann ich meine Stimme zurückziehen oder ändern?</summary>
            <p className="mt-2 text-sm">
              Nur im Modus „änderbar" und nur bis zum Fristende. Im Modus „fest"
              ist die Stimme nach Abgabe unwiderruflich.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Was passiert, wenn das Quorum nicht erreicht wird?</summary>
            <p className="mt-2 text-sm">
              Der Beschluss gilt als <strong>nicht angenommen</strong>, unabhängig
              davon, wie die abgegebenen Stimmen lauten.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Sind meine Stimmen anonym?</summary>
            <p className="mt-2 text-sm">
              Nein. Stimmen sind namentlich zugeordnet – das ist im Umlaufverfahren
              regelmäßig vorgeschrieben und für ein revisionssicheres Protokoll nötig.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Kann ein Beschluss nachträglich geändert werden?</summary>
            <p className="mt-2 text-sm">
              Inhalt und Ergebnis eines abgeschlossenen Beschlusses sind fixiert.
              Bei Bedarf kann ein neuer Beschluss aufgesetzt werden.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Wer sieht meine Stimme?</summary>
            <p className="mt-2 text-sm">
              Admins deines Verbands sowie alle im PDF-Protokoll dokumentierten
              Empfänger:innen.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Was, wenn die Einladungs-Mail nicht ankommt?</summary>
            <p className="mt-2 text-sm">
              Spam-Ordner prüfen. Du kannst dich jederzeit auch über die normale
              Login-Seite mit derselben E-Mail-Adresse einen neuen Magic-Link
              zusenden lassen. Ansonsten bei deinem Admin melden.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Kann ich von mehreren Geräten abstimmen?</summary>
            <p className="mt-2 text-sm">
              Ja, solange du dich mit deiner E-Mail-Adresse einloggst. Es zählt
              immer die zuletzt abgegebene Stimme – im Modus „fest" allerdings
              nur die erste Abgabe.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Was ist der Unterschied zwischen Mandant, Kreisverband und Landesverband?</summary>
            <p className="mt-2 text-sm">
              Technisch dasselbe: ein abgegrenzter Bereich (Mandant) im System
              für deinen Verband. Das System ist mandantenfähig und unterstützt
              beliebig viele Verbände parallel.
            </p>
          </details>
          <details className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="font-semibold cursor-pointer">Welche Browser werden unterstützt?</summary>
            <p className="mt-2 text-sm">
              Alle aktuellen Browser (Chrome, Firefox, Safari, Edge) – auf
              Desktop und Mobilgeräten.
            </p>
          </details>
        </div>
      </section>

      {/* 11. Tipps */}
      <section id="tipps" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Tipps für reibungslose Verfahren</h2>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          <li>Stimmberechtigten-Liste <strong>vor</strong> der Eröffnung gegenchecken.</li>
          <li>Frist nicht zu knapp setzen – die jeweils satzungsgemäße Mindestfrist beachten.</li>
          <li>Anlagen als <strong>PDF</strong> bereitstellen, nicht als Word-Dokument.</li>
          <li>TOPs einzeln und präzise formulieren – eine Frage pro TOP.</li>
          <li>Vor dem Eröffnen einmal komplett durchlesen.</li>
        </ul>
      </section>

      {/* 12. Kontakt */}
      <section id="kontakt" className="drk-card mb-6 fade-up">
        <h2 className="text-xl font-bold mb-3">Kontakt &amp; Unterstützung</h2>
        <p>
          Bei <strong>inhaltlichen Fragen</strong> zu einem konkreten Verfahren
          wende dich bitte an die Geschäftsstelle deines Verbands – in der Regel
          an die Person, die den Beschluss angelegt hat. Diese ist auch im
          Einladungs-E-Mail als Absender hinterlegt.
        </p>
        <p className="mt-3">
          Für <strong>technische Fragen</strong> zum System oder zur Freischaltung
          neuer Verbände wende dich an den Super-Admin oder den Betreiber dieser
          Instanz (siehe Impressum).
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/impressum" className="drk-btn-secondary flex-1 text-center">
            Zum Impressum
          </Link>
          <Link href="/datenschutz" className="drk-btn-secondary flex-1 text-center">
            Zur Datenschutzerklärung
          </Link>
        </div>
      </section>
    </div>
  );
}
