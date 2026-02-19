"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function DankeContent() {
  const searchParams = useSearchParams();
  const votes = searchParams.get("votes") || "\u2013";
  const participants = searchParams.get("participants") || "\u2013";
  const total = searchParams.get("total") || "\u2013";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA", color: "#1A1A1A" }}>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden text-center text-white"
        style={{
          background: "linear-gradient(135deg, #E30613 0%, #B8050F 100%)",
          padding: "60px 24px 80px",
        }}
      >
        {/* Radial overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 max-w-[640px] mx-auto">
          {/* Checkmark icon */}
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[32px] mx-auto mb-6"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              animation: "pulse-in 0.6s ease-out",
            }}
          >
            &#10003;
          </div>
          <h1
            className="text-[2rem] font-semibold mb-3"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              letterSpacing: "-0.01em",
              animation: "fade-up 0.5s ease-out 0.1s both",
            }}
          >
            Vielen Dank f&uuml;r Ihre Teilnahme!
          </h1>
          <p
            className="text-[1.1rem] font-light max-w-[480px] mx-auto"
            style={{ opacity: 0.9, animation: "fade-up 0.5s ease-out 0.2s both" }}
          >
            Die Versammlung wurde erfolgreich abgeschlossen. Alle Abstimmungsergebnisse wurden
            protokolliert.
          </p>

          {/* Stats */}
          <div
            className="flex justify-center gap-10 mt-8"
            style={{ animation: "fade-up 0.5s ease-out 0.3s both" }}
          >
            <div className="text-center">
              <span
                className="block text-[1.8rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                {votes}
              </span>
              <span
                className="text-[0.85rem] font-light uppercase"
                style={{ opacity: 0.75, letterSpacing: "0.05em" }}
              >
                Abstimmungen
              </span>
            </div>
            <div className="text-center">
              <span
                className="block text-[1.8rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                {participants}
              </span>
              <span
                className="text-[0.85rem] font-light uppercase"
                style={{ opacity: 0.75, letterSpacing: "0.05em" }}
              >
                Teilnehmer
              </span>
            </div>
            <div className="text-center">
              <span
                className="block text-[1.8rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                {total}
              </span>
              <span
                className="text-[0.85rem] font-light uppercase"
                style={{ opacity: 0.75, letterSpacing: "0.05em" }}
              >
                Stimmen gesamt
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[680px] mx-auto px-6 flex-1">
        {/* Donation Card */}
        <div
          className="relative z-[2] rounded-[20px] p-10"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
            marginTop: "-40px",
            animation: "fade-up 0.5s ease-out 0.4s both",
          }}
        >
          <h2
            className="text-[1.4rem] font-semibold mb-2"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#1A1A1A" }}
          >
            Weiterentwicklung unterst&uuml;tzen
          </h2>
          <p className="text-[0.95rem] mb-7 leading-relaxed" style={{ color: "#666666" }}>
            Diese Anwendung ist Open Source und kostenfrei f&uuml;r alle DRK-Gliederungen. Wenn
            Ihnen das Tool geholfen hat und Sie die Weiterentwicklung unterst&uuml;tzen
            m&ouml;chten, freuen wir uns &uuml;ber einen kleinen Beitrag.
          </p>

          <div className="flex gap-3 mb-5">
            <a
              href="https://www.paypal.com/donate/?business=paypal.kv@drk.ac&amount=15&currency_code=EUR&item_name=DRK+Vereinsabstimmung"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 block text-center no-underline rounded-[12px] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                padding: "16px 12px",
                border: "2px solid #E8E8E8",
                background: "#FFFFFF",
              }}
            >
              <span
                className="block text-[1.5rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#1A1A1A" }}
              >
                15&nbsp;&euro;
              </span>
              <span className="block text-[0.8rem] mt-1" style={{ color: "#999999" }}>
                Danke!
              </span>
            </a>
            <a
              href="https://www.paypal.com/donate/?business=paypal.kv@drk.ac&amount=25&currency_code=EUR&item_name=DRK+Vereinsabstimmung"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 block text-center no-underline rounded-[12px] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                padding: "16px 12px",
                border: "2px solid #E8E8E8",
                background: "#FFFFFF",
              }}
            >
              <span
                className="block text-[1.5rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#1A1A1A" }}
              >
                25&nbsp;&euro;
              </span>
              <span className="block text-[0.8rem] mt-1" style={{ color: "#999999" }}>
                Klasse!
              </span>
            </a>
            <a
              href="https://www.paypal.com/donate/?business=paypal.kv@drk.ac&amount=50&currency_code=EUR&item_name=DRK+Vereinsabstimmung"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 block text-center no-underline rounded-[12px] transition-all duration-200 hover:-translate-y-0.5"
              style={{
                padding: "16px 12px",
                border: "2px solid #E8E8E8",
                background: "#FFFFFF",
              }}
            >
              <span
                className="block text-[1.5rem] font-semibold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#1A1A1A" }}
              >
                50&nbsp;&euro;
              </span>
              <span className="block text-[0.8rem] mt-1" style={{ color: "#999999" }}>
                Gro&szlig;artig!
              </span>
            </a>
          </div>

          <p
            className="text-center text-[0.82rem] mt-4 leading-normal"
            style={{ color: "#999999" }}
          >
            Spenden flie&szlig;en in Hosting, Weiterentwicklung und Barrierefreiheit.
            <br />
            <a
              href="https://github.com/DRKAachen/VereinsabstimmungDRK"
              className="underline"
              style={{ color: "#666666", textUnderlineOffset: "2px" }}
            >
              Quellcode auf GitHub ansehen
            </a>
          </p>

          <Link
            href="/"
            className="block text-center mt-6 text-[0.9rem] font-medium no-underline hover:underline transition-colors duration-200"
            style={{ color: "#E30613", textUnderlineOffset: "3px" }}
          >
            Neue Versammlung starten &rarr;
          </Link>
        </div>

        {/* Divider */}
        <div className="my-12" style={{ height: "1px", background: "#E8E8E8" }} />

        {/* What else section */}
        <section
          className="pb-16"
          style={{ animation: "fade-up 0.5s ease-out 0.5s both" }}
        >
          <h2
            className="text-[1.3rem] font-semibold mb-1.5"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "#1A1A1A" }}
          >
            Was wir sonst noch entwickeln
          </h2>
          <p className="text-[0.95rem] mb-7" style={{ color: "#666666" }}>
            Datensparsame, Open-Source-Werkzeuge f&uuml;r die Vereins- und Verbandsarbeit.
          </p>

          <div className="flex flex-col gap-4">
            {/* HenryGPT */}
            <a
              href="#"
              className="flex items-start gap-4 p-5 rounded-[12px] no-underline transition-all duration-200 hover:translate-x-1"
              style={{
                border: "1px solid #E8E8E8",
                background: "#FFFFFF",
                color: "inherit",
              }}
            >
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
                style={{ background: "#E8F0FE" }}
              >
                &#129302;
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold mb-1" style={{ color: "#1A1A1A" }}>
                  HenryGPT{" "}
                  <span
                    className="inline-block text-[0.7rem] font-semibold uppercase ml-2 px-2 py-0.5 rounded relative"
                    style={{
                      background: "#FFF3E0",
                      color: "#E65100",
                      letterSpacing: "0.05em",
                      top: "-1px",
                    }}
                  >
                    In Entwicklung
                  </span>
                </h3>
                <p className="text-[0.85rem] leading-normal" style={{ color: "#666666" }}>
                  Intelligenter KI-Assistent speziell f&uuml;r das DRK &ndash; DSGVO-konform in
                  eigener Umgebung. Nutzt RAG und Multi-Agenten-Architektur &uuml;ber Claude- und
                  OpenAI-APIs, ohne eigene Modellentwicklung. F&uuml;r HR, Dokumentenmanagement und
                  Fachberatung.
                </p>
              </div>
            </a>

            {/* Digitale Gremienarbeit */}
            <a
              href="#"
              className="flex items-start gap-4 p-5 rounded-[12px] no-underline transition-all duration-200 hover:translate-x-1"
              style={{
                border: "1px solid #E8E8E8",
                background: "#FFFFFF",
                color: "inherit",
              }}
            >
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
                style={{ background: "#FDE8E8" }}
              >
                &#128203;
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold mb-1" style={{ color: "#1A1A1A" }}>
                  Digitale Gremienarbeit{" "}
                  <span
                    className="inline-block text-[0.7rem] font-semibold uppercase ml-2 px-2 py-0.5 rounded relative"
                    style={{
                      background: "#FFF3E0",
                      color: "#E65100",
                      letterSpacing: "0.05em",
                      top: "-1px",
                    }}
                  >
                    In Entwicklung
                  </span>
                </h3>
                <p className="text-[0.85rem] leading-normal" style={{ color: "#666666" }}>
                  Sitzungsmanagement, Beschlussdokumentation und Protokollf&uuml;hrung &ndash;
                  serverlos, datenschutzkonform, speziell f&uuml;r DRK-Gliederungen.
                </p>
              </div>
            </a>

            {/* Beratung und Integration */}
            <a
              href="#"
              className="flex items-start gap-4 p-5 rounded-[12px] no-underline transition-all duration-200 hover:translate-x-1"
              style={{
                border: "1px solid #E8E8E8",
                background: "#FFFFFF",
                color: "inherit",
              }}
            >
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[20px] shrink-0"
                style={{ background: "#F0F0F0" }}
              >
                &#128640;
              </div>
              <div>
                <h3 className="text-[0.95rem] font-semibold mb-1" style={{ color: "#1A1A1A" }}>
                  Beratung und Integration
                </h3>
                <p className="text-[0.85rem] leading-normal" style={{ color: "#666666" }}>
                  Unterst&uuml;tzung bei der Einf&uuml;hrung digitaler Werkzeuge in Ihrem Kreis-
                  oder Landesverband. Schulungen, Anpassungen, individuelle L&ouml;sungen.
                </p>
              </div>
            </a>
          </div>
        </section>
      </div>

      {/* Custom Footer (different from layout footer) */}
      <footer
        className="text-center py-8 px-6"
        style={{ borderTop: "1px solid #E8E8E8", background: "#FFFFFF" }}
      >
        <div
          className="text-[0.8rem] font-semibold uppercase mb-1.5"
          style={{ color: "#E30613", letterSpacing: "0.1em" }}
        >
          Deutsches Rotes Kreuz
        </div>
        <p className="text-[0.8rem]" style={{ color: "#999999" }}>
          Kreisverband St&auml;dteRegion Aachen e.V.
          <br />
          <a
            href="mailto:support@drk-aachen.de"
            className="no-underline hover:text-[#E30613]"
            style={{ color: "#666666" }}
          >
            support@drk-aachen.de
          </a>{" "}
          &middot;{" "}
          <a
            href="https://www.drk-aachen.de"
            className="no-underline hover:text-[#E30613]"
            style={{ color: "#666666" }}
          >
            www.drk-aachen.de
          </a>
          <br />
          <Link
            href="/impressum"
            className="no-underline hover:text-[#E30613]"
            style={{ color: "#666666" }}
          >
            Impressum
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/datenschutz"
            className="no-underline hover:text-[#E30613]"
            style={{ color: "#666666" }}
          >
            Datenschutz
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default function DankePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-10 h-10 border-4 rounded-full"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--drk)",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      }
    >
      <DankeContent />
    </Suspense>
  );
}
