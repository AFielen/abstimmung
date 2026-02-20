"use client";

import { useState } from "react";
import Link from "next/link";

const faqItems = [
  {
    q: "Was passiert bei einem Verbindungsabbruch?",
    a: "Die App versucht automatisch bis zu 5 Mal, die Verbindung wiederherzustellen (mit steigenden Wartezeiten: 0s, 2s, 5s, 10s, 20s). Bereits abgegebene Stimmen gehen nicht verloren. Falls die automatische Wiederverbindung fehlschlaegt, kann der QR-Code erneut gescannt werden.",
  },
  {
    q: "Kann jemand doppelt abstimmen?",
    a: "Das System verwendet ein mehrstufiges Schutzsystem: Browser-Fingerprinting, localStorage-Pruefung und Presenter-seitige Validierung. Ein komplett anderer Browser oder ein anderes Geraet erzeugt einen anderen Fingerprint \u2014 das ist gewollt, da von einer anderen Person ausgegangen wird.",
  },
  {
    q: "Welcher Browser wird empfohlen?",
    a: "Die App ist fuer Google Chrome optimiert (Desktop und Mobil). Safari und Firefox funktionieren ebenfalls. In Microsoft Edge kann die QR-Code-Darstellung eingeschraenkt sein.",
  },
  {
    q: "Brauche ich eine Internetverbindung?",
    a: "Ja, alle Geraete benoetigen eine Internetverbindung fuer den initialen Verbindungsaufbau ueber den PeerJS-Signaling-Server. Die eigentliche Datenuebertragung laeuft danach direkt zwischen den Geraeten (Peer-to-Peer via WebRTC).",
  },
  {
    q: "Werden meine Daten gespeichert?",
    a: "Nein. Die App speichert keinerlei Daten auf einem Server. Alle Informationen existieren nur im Arbeitsspeicher der beteiligten Geraete. Nach dem Schliessen des Browsers oder Beenden der Versammlung sind alle Daten unwiderruflich geloescht. Einzige Ausnahme: Das PDF-Protokoll, das Sie bewusst herunterladen.",
  },
];

const serverFaqItems = [
  {
    q: "Was ist der Server-Modus und wann brauche ich ihn?",
    a: "In vielen Netzwerken (z.B. in Kreisgeschaeftsstellen oder Veranstaltungsorten) blockieren Firewalls direkte Verbindungen zwischen Geraeten. Wenn der P2P-Modus nicht funktioniert, nutzen Sie den Server-Modus. Dabei laeuft die gesamte Kommunikation ueber unseren Signal-Server als Vermittler \u2014 alle Geraete brauchen nur eine ausgehende Verbindung, die fast jede Firewall durchlaesst.",
  },
  {
    q: "Wie funktioniert der Server-Modus technisch?",
    a: "Der Versammlungsleiter und alle Teilnehmer verbinden sich per WebSocket mit dem Signal-Server. Der Server leitet Nachrichten (Abstimmung starten, Stimme abgeben, Ergebnisse) zwischen den Geraeten weiter \u2014 wie ein Postbote, der Briefe zustellt, ohne sie zu lesen.",
  },
  {
    q: "Werden meine Abstimmungsdaten auf dem Server gespeichert?",
    a: "Nein. Der Server speichert keine Daten auf der Festplatte \u2014 weder Abstimmungsergebnisse noch persoenliche Informationen. Im Arbeitsspeicher existieren nur die aktiven Verbindungen und Raum-Zuordnungen. Sobald die Versammlung beendet wird oder alle Verbindungen getrennt werden, ist alles weg. Bei einem Neustart des Servers wird der Arbeitsspeicher komplett zurueckgesetzt.",
  },
  {
    q: "Ist der Server-Modus weniger sicher als P2P?",
    a: "Der Unterschied: Im P2P-Modus fliessen Daten direkt zwischen den Geraeten, im Server-Modus passieren sie den Signal-Server. Der Server sieht die Nachrichten, speichert sie aber nicht und wertet sie nicht aus. Die Abstimmung bleibt anonym \u2014 es werden keine persoenlichen Daten erhoben. Der gesamte Quellcode ist Open Source und kann jederzeit eingesehen werden.",
  },
  {
    q: "Was passiert mit den Daten nach der Versammlung?",
    a: "Nach der Versammlung existieren keinerlei Daten auf dem Server. Es gibt keine Datenbank, keine Logfiles mit Abstimmungsinhalten und keine Moeglichkeit, vergangene Abstimmungen zu rekonstruieren. Die einzige Aufzeichnung ist das PDF-Protokoll, das der Versammlungsleiter lokal auf seinem Geraet exportieren kann.",
  },
];

export default function HilfePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openServerFaq, setOpenServerFaq] = useState<number | null>(null);

  return (
    <div className="max-w-[900px] w-full mx-auto px-4 py-6 space-y-4">
      {/* Hero */}
      <div className="hero">
        <div className="relative z-[1] max-w-[640px] mx-auto">
          <div className="hero-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Hilfe &amp; Anleitung</h2>
          <p className="text-sm opacity-90 leading-relaxed max-w-md mx-auto">
            Alles Wichtige zur DRK Vereinsabstimmung &mdash; Funktionsweise, Modi und Tipps.
          </p>
        </div>
      </div>

      {/* So funktioniert die Abstimmung */}
      <div className="overlap-card fade-up fade-up-delay-2">
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--drk)" }}>
          So funktioniert die Abstimmung
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          In vier Schritten zur digitalen Vereinsabstimmung.
        </p>

        <ol className="steps-list">
          <li>
            <div>
              <strong>Versammlung einrichten</strong>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>
                Der Versammlungsleiter oeffnet die App auf dem Laptop/Beamer, gibt den Titel ein
                und waehlt den Abstimmungsmodus.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>QR-Code anzeigen</strong>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>
                Nach dem Start wird ein QR-Code auf der Leinwand angezeigt, den die Teilnehmer
                mit dem Smartphone scannen.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>Abstimmung durchfuehren</strong>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>
                Mitglieder stimmen anonym ueber ihr Smartphone ab. Die Ergebnisse erscheinen
                in Echtzeit auf dem Beamer.
              </p>
            </div>
          </li>
          <li>
            <div>
              <strong>Ergebnisse sichern</strong>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-light)" }}>
                Nach Abschluss koennen alle Ergebnisse als PDF-Protokoll mit DRK-Branding
                exportiert werden.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Abstimmungsmodi */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up fade-up-delay-3"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--drk)" }}>
          Abstimmungsmodi
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          Waehlen Sie den passenden Modus fuer Ihre Versammlung.
        </p>

        <div className="feature-grid">
          <div className="feature-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="feature-icon" style={{ background: "#e8f5e9", color: "var(--success)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Offener Modus</p>
            </div>
            <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>
              Jedes Mitglied scannt den QR-Code mit dem eigenen Smartphone und stimmt direkt ab.
              Ideal fuer groessere Versammlungen.
            </p>
            <ol className="text-xs ml-4 list-decimal" style={{ color: "var(--text-light)" }}>
              <li className="mb-0.5">QR-Code mit Smartphone scannen</li>
              <li className="mb-0.5">Link im Browser oeffnen</li>
              <li className="mb-0.5">Warten bis Abstimmung startet</li>
              <li>Stimme abgeben &mdash; fertig!</li>
            </ol>
          </div>

          <div className="feature-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="feature-icon" style={{ background: "#fce4ec", color: "var(--drk)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Stimmkarten-Modus</p>
            </div>
            <p className="text-xs mb-2" style={{ color: "var(--text-light)" }}>
              Bereitgestellte Geraete werden durchgereicht. Jedes Mitglied authentifiziert sich
              mit einem einmaligen 6-stelligen Code. Hoechste Sicherheit.
            </p>
            <ol className="text-xs ml-4 list-decimal" style={{ color: "var(--text-light)" }}>
              <li className="mb-0.5">Code eingeben (z.B. K4F-9M2)</li>
              <li className="mb-0.5">Stimme abgeben</li>
              <li className="mb-0.5">Bestaetigung abwarten (3 Sek.)</li>
              <li>Geraet weitergeben</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Versammlungsleiter-Anleitung */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up fade-up-delay-4"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--drk)" }}>
          Anleitung fuer Versammlungsleiter
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          Schritt fuer Schritt eine Versammlung durchfuehren.
        </p>

        <div className="space-y-3">
          {[
            { nr: "1", title: "Versammlung einrichten", desc: "Titel eingeben, Anzahl Stimmberechtigte festlegen, Modus waehlen." },
            { nr: "2", title: "Stimmkarten vorbereiten", desc: "Nur im Stimmkarten-Modus: Token-Codes generieren und Karten ausdrucken." },
            { nr: "3", title: "Abstimmung erstellen", desc: "Thema eingeben, Beschreibung ergaenzen, Ja/Nein oder eigene Optionen waehlen." },
            { nr: "4", title: "Zeitlimit setzen", desc: "Optional 1\u201360 Minuten. Die Abstimmung schliesst automatisch bei Ablauf." },
            { nr: "5", title: "Abstimmung schliessen", desc: "Nach Stimmabgabe manuell schliessen. Das Ergebnis wird sofort angezeigt." },
            { nr: "6", title: "PDF-Export", desc: "Jederzeit die Ergebnisse als professionelles Protokoll mit DRK-Branding exportieren." },
            { nr: "7", title: "Versammlung beenden", desc: "Bestaetigungsdialog erinnert an den PDF-Export vor dem Beenden." },
          ].map((step) => (
            <div
              key={step.nr}
              className="flex items-start gap-3 px-3 py-2.5 rounded-[var(--radius)]"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="flex items-center justify-center font-bold text-xs rounded-full shrink-0"
                style={{ width: 28, height: 28, background: "#fce4ec", color: "var(--drk)" }}
              >
                {step.nr}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{step.title}</p>
                <p className="text-xs" style={{ color: "var(--text-light)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Datenschutz & Sicherheit */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up fade-up-delay-5"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--drk)" }}>
          Datenschutz &amp; Sicherheit
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>
          Privacy by Design &mdash; keine Kompromisse.
        </p>

        <div className="space-y-3">
          {[
            { icon: "\uD83D\uDEAB", title: "Kein Server", desc: "Peer-to-Peer via WebRTC \u2014 alle Daten fliessen direkt zwischen den Geraeten" },
            { icon: "\uD83D\uDD12", title: "Vollstaendig anonym", desc: "Keine Zuordnung von Stimmen zu Personen technisch moeglich" },
            { icon: "\uD83D\uDEE1\uFE0F", title: "Doppelabstimmungs-Schutz", desc: "Browser-Fingerprinting, localStorage und Presenter-Pruefung (3 Stufen)" },
            { icon: "\uD83D\uDDD1\uFE0F", title: "Keine Datenspeicherung", desc: "Nach Beenden der Versammlung sind alle Daten unwiderruflich geloescht" },
            { icon: "\uD83D\uDD10", title: "Kryptografisch sichere IDs", desc: "Session-IDs mit crypto.getRandomValues() (2\u2076\u2074 Moeglichkeiten)" },
            { icon: "\u2705", title: "DSGVO-konform", desc: "Keine Cookies, kein Tracking, keine Analytics, lokal gehostete Fonts" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.title}</p>
                <p className="text-xs" style={{ color: "var(--text-light)" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up fade-up-delay-6"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-4" style={{ color: "var(--drk)" }}>
          Haeufige Fragen
        </h3>
        <div>
          {faqItems.map((item, i) => (
            <div key={i} style={{ borderBottom: i < faqItems.length - 1 ? "1px solid var(--border)" : "none" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.q}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-light)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openFaq === i && (
                <p className="text-sm pb-3 -mt-1" style={{ color: "var(--text-light)" }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Server-Modus FAQ */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-4" style={{ color: "var(--drk)" }}>
          Server-Modus
        </h3>
        <div>
          {serverFaqItems.map((item, i) => (
            <div key={i} style={{ borderBottom: i < serverFaqItems.length - 1 ? "1px solid var(--border)" : "none" }}>
              <button
                onClick={() => setOpenServerFaq(openServerFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{item.q}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-light)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ transform: openServerFaq === i ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openServerFaq === i && (
                <p className="text-sm pb-3 -mt-1" style={{ color: "var(--text-light)" }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KI-Agenten */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-start gap-3">
          <div className="feature-icon shrink-0" style={{ background: "#f3e5f5", color: "#7b1fa2" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.27A7 7 0 0 1 14 22h-4a7 7 0 0 1-6.73-3H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
              <circle cx="9.5" cy="15.5" r="1" fill="currentColor" />
              <circle cx="14.5" cy="15.5" r="1" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--drk)" }}>
              KI-Agenten-Schnittstelle
            </h3>
            <p className="text-sm mb-2" style={{ color: "var(--text-light)" }}>
              Die Abstimmungsapp bietet eine WebRTC-basierte Peer-to-Peer-Architektur.
              KI-Agenten koennen ueber die PeerJS-API programmatisch Verbindungen aufbauen,
              Abstimmungen erstellen und Ergebnisse auswerten.
            </p>
            <Link
              href="https://github.com/DRKAachen/VereinsabstimmungDRK/blob/main/API-INTEGRATION.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: "var(--drk)" }}
            >
              API-Dokumentation ansehen
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Weitere Informationen */}
      <div
        className="p-6 rounded-[var(--radius)] fade-up"
        style={{ background: "var(--bg-card)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h3 className="text-base font-bold mb-3" style={{ color: "var(--drk)" }}>
          Weitere Informationen
        </h3>
        <div className="space-y-2">
          {[
            { href: "https://github.com/DRKAachen/VereinsabstimmungDRK", label: "GitHub Repository", desc: "Quellcode, Issues & Mitwirken", external: true },
            { href: "/impressum", label: "Impressum", desc: "Angaben nach \u00a7 5 TMG", external: false },
            { href: "/datenschutz", label: "Datenschutz", desc: "Datenschutzerklaerung", external: false },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-colors"
              style={{ border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{link.label}</p>
                <p className="text-xs" style={{ color: "var(--text-light)" }}>{link.desc}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-light)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
