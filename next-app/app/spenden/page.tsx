import Link from "next/link";

export default function Spenden() {
  return (
    <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Danke Box ── */}
        <div className="drk-card drk-fade-in text-center">
          <div className="text-5xl mb-4">&#10084;&#65039;</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>
            Vielen Dank f&uuml;r Ihre Nutzung!
          </h2>
          <p style={{ color: "var(--text-light)" }}>
            Diese Anwendung wurde ehrenamtlich entwickelt und wird kostenlos als
            Open-Source-Software zur Verf&uuml;gung gestellt &mdash; f&uuml;r alle DRK-Gliederungen
            und dar&uuml;ber hinaus.
          </p>
        </div>

        {/* ── Über das DRK ── */}
        <div className="drk-card drk-slide-up">
          <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
            Das Deutsche Rote Kreuz
          </h3>
          <p className="mb-4" style={{ color: "var(--text-light)" }}>
            Der DRK Kreisverband St&auml;dteRegion Aachen e.V. engagiert sich in
            zahlreichen Bereichen: Rettungsdienst, Katastrophenschutz,
            Soziale Dienste, Kinder- und Jugendhilfe, Fl&uuml;chtlingshilfe und
            vieles mehr. Hunderte Ehrenamtliche und Hauptamtliche setzen sich
            t&auml;glich f&uuml;r Menschen in Not ein.
          </p>
          <p style={{ color: "var(--text-light)" }}>
            Mit einer Spende unterst&uuml;tzen Sie diese wichtige Arbeit direkt
            vor Ort in der St&auml;dteRegion Aachen.
          </p>
        </div>

        {/* ── Spenden-Optionen ── */}
        <div className="drk-card">
          <h3 className="text-lg font-bold mb-5" style={{ color: "var(--text)" }}>
            Jetzt unterst&uuml;tzen
          </h3>

          <div className="space-y-5">
            {/* Online-Spende */}
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "var(--drk-bg)" }}
              >
                <span className="text-lg">&#127760;</span>
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  Online spenden
                </p>
                <a
                  href="https://www.drk-aachen.de/spenden"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: "var(--drk)" }}
                >
                  www.drk-aachen.de/spenden &rarr;
                </a>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Bankverbindung */}
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "var(--drk-bg)" }}
              >
                <span className="text-lg">&#127974;</span>
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  Per &Uuml;berweisung
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
                  DRK Kreisverband St&auml;dteRegion Aachen e.V.
                </p>
                <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                  Bankverbindung: Siehe www.drk-aachen.de/spenden
                </p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)" }} />

            {/* Mitglied werden */}
            <div className="flex items-start gap-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "var(--drk-bg)" }}
              >
                <span className="text-lg">&#128587;</span>
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  F&ouml;rdermitglied werden
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
                  Mit einer regelm&auml;&szlig;igen F&ouml;rdermitgliedschaft unterst&uuml;tzen Sie
                  das DRK nachhaltig.
                </p>
                <a
                  href="https://www.drk-aachen.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: "var(--drk)" }}
                >
                  Mehr erfahren &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Open Source ── */}
        <div
          className="drk-card"
          style={{ borderLeft: "4px solid var(--info)" }}
        >
          <div className="flex gap-3">
            <span className="text-xl shrink-0">&#128187;</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Open Source
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
                Diese Anwendung ist frei verf&uuml;gbar auf GitHub. Sie k&ouml;nnen den
                Quellcode einsehen, mitentwickeln oder die App f&uuml;r Ihren eigenen
                DRK-Kreisverband nutzen.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pb-4">
          <Link
            href="/"
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--drk)" }}
          >
            &larr; Zur&uuml;ck zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
