import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum - DRK Vereinsabstimmung",
};

export default function ImpressumPage() {
  return (
    <div className="max-w-[800px] w-full mx-auto py-6 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 mb-4 font-semibold text-[0.95rem] no-underline hover:underline"
        style={{ color: "var(--drk)" }}
      >
        &larr; Zur&uuml;ck zur Abstimmung
      </Link>

      <div
        className="rounded-[var(--radius)] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        style={{ background: "var(--white)" }}
      >
        <h2
          className="text-[1.3rem] mb-5 pb-2"
          style={{ color: "var(--drk)", borderBottom: "2px solid var(--drk)" }}
        >
          Impressum
        </h2>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Ansprechpartner
          </h3>
          <p>Herr Axel Fielen</p>
          <p>Vorsitzender des Vorstandes</p>
          <p>Tel: 02405 6039100</p>
          <p>Henry-Dunant-Platz 1</p>
          <p>52146 W&uuml;rselen</p>
          <p>
            <a
              href="mailto:Info@DRK-Aachen.de"
              className="no-underline hover:underline"
              style={{ color: "var(--drk)" }}
            >
              E-Mail schreiben
            </a>
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Anbieterkennung nach &sect; 5 TMG
          </h3>
          <p>DRK-Kreisverband St&auml;dteregion Aachen e.V.</p>
          <p>Henry-Dunant-Platz 1</p>
          <p>52146 W&uuml;rselen</p>
          <p>Telefon: 02405 6039-100</p>
          <p>Telefax: 02405 6039-200</p>
          <p>
            E-Mail:{" "}
            <a
              href="mailto:Info@DRK-Aachen.de"
              className="no-underline hover:underline"
              style={{ color: "var(--drk)" }}
            >
              Info@DRK-Aachen.de
            </a>
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Vereinsregister
          </h3>
          <p>Registergericht: Amtsgericht Aachen</p>
          <p>Registernummer: VR 4535</p>
        </div>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Vertretungsberechtigte
          </h3>
          <p>Axel Fielen (Vorsitzender des Vorstandes)</p>
        </div>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Umsatzsteuer-Identifikationsnummer
          </h3>
          <p>gem&auml;&szlig; &sect; 27 a Umsatzsteuergesetz: DE121729631</p>
        </div>

        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Inhaltlich Verantwortlicher
          </h3>
          <p>gem&auml;&szlig; &sect; 55 Abs. 2 RStV:</p>
          <p>Axel Fielen (Anschrift wie oben)</p>
        </div>

        <div>
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            Streitbeilegungsverfahren
          </h3>
          <p>
            Der DRK Kreisverband St&auml;dteregion Aachen e.V. wie auch die Tochter- und
            Enkelgesellschaften nehmen nicht an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teil.
          </p>
        </div>
      </div>
    </div>
  );
}
