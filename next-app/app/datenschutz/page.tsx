import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerkl\u00e4rung - DRK Vereinsabstimmung",
};

export default function DatenschutzPage() {
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
          Datenschutzerkl&auml;rung
        </h2>

        {/* 1. Verantwortlicher */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            1. Verantwortlicher
          </h3>
          <p className="mb-2">DRK-Kreisverband St&auml;dteRegion Aachen e.V.</p>
          <p className="mb-2">Henry-Dunant-Platz 1, 52146 W&uuml;rselen</p>
          <p className="mb-2">
            E-Mail:{" "}
            <a
              href="mailto:Info@DRK-Aachen.de"
              className="no-underline hover:underline"
              style={{ color: "var(--drk)" }}
            >
              Info@DRK-Aachen.de
            </a>
          </p>
          <p className="mb-2">Telefon: 02405 6039-100</p>
        </div>

        {/* 2. Grundsatz */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            2. Grundsatz: Keine Erhebung personenbezogener Daten
          </h3>
          <p className="mb-2">
            Diese Anwendung wurde bewusst so konzipiert, dass{" "}
            <strong>keine personenbezogenen Daten</strong> erhoben, gespeichert oder an Dritte
            &uuml;bermittelt werden. Es gibt:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">Keine Registrierung oder Anmeldung</li>
            <li className="mb-1">Keine Cookies</li>
            <li className="mb-1">
              Keine Analyse- oder Tracking-Dienste (kein Google Analytics, kein Matomo o.&Auml;.)
            </li>
            <li className="mb-1">
              Keine Datenbank &ndash; weder auf dem Server noch in der Cloud
            </li>
          </ul>
        </div>

        {/* 3. Kommunikation */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            3. Kommunikation zwischen den Ger&auml;ten
          </h3>
          <p className="mb-2">
            Die Anwendung bietet zwei Kommunikationsmodi. In beiden F&auml;llen werden{" "}
            <strong>keine Abstimmungsdaten dauerhaft gespeichert</strong>.
          </p>

          <p className="mb-1 mt-3">
            <strong>a) P2P-Modus (Peer-to-Peer via WebRTC / PeerJS)</strong>
          </p>
          <p className="mb-2">
            Im P2P-Modus nutzt die Anwendung <strong>WebRTC</strong> (Web Real-Time Communication)
            &uuml;ber die Bibliothek <strong>PeerJS</strong>. Dabei werden folgende technische
            Verbindungen hergestellt:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              <strong>Eigener Signal-Server</strong>: Dient ausschlie&szlig;lich dem initialen
              Verbindungsaufbau zwischen den Ger&auml;ten. Es werden dabei keine Abstimmungsdaten
              &uuml;bertragen &ndash; lediglich technische Verbindungsinformationen (sog. Signaling).
              Der Signal-Server wird von uns selbst betrieben und befindet sich in Deutschland.
            </li>
            <li className="mb-1">
              <strong>STUN-Server</strong>: Werden ben&ouml;tigt, um die direkte Verbindung zwischen
              Ger&auml;ten herzustellen (NAT-Traversal). Es werden dabei keine inhaltlichen Daten
              &uuml;bertragen &ndash; lediglich die &ouml;ffentliche IP-Adresse des Ger&auml;ts
              ermittelt.
            </li>
          </ul>
          <p className="mb-2">
            Nach dem Verbindungsaufbau flie&szlig;en alle Daten (Abstimmungsoptionen, abgegebene
            Stimmen, Ergebnisse) <strong>direkt zwischen den Ger&auml;ten</strong> &uuml;ber einen
            verschl&uuml;sselten WebRTC-DataChannel &ndash; ohne Umweg &uuml;ber einen Server.
          </p>

          <p className="mb-1 mt-3">
            <strong>b) Server-Modus (WebSocket-Relay)</strong>
          </p>
          <p className="mb-2">
            Wenn direkte P2P-Verbindungen nicht m&ouml;glich sind (z.B. durch Firewalls),
            kann der Server-Modus verwendet werden. In diesem Modus werden alle Nachrichten
            &uuml;ber unseren Signal-Server als Vermittler weitergeleitet:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              Der Server leitet Nachrichten ausschlie&szlig;lich im Arbeitsspeicher weiter &ndash;{" "}
              <strong>ohne Speicherung auf der Festplatte</strong>
            </li>
            <li className="mb-1">
              Es gibt keine Datenbank und keine Logfiles mit Abstimmungsinhalten
            </li>
            <li className="mb-1">
              Nach Beendigung der Versammlung oder Trennung aller Verbindungen werden s&auml;mtliche
              Daten im Arbeitsspeicher gel&ouml;scht
            </li>
            <li className="mb-1">
              Der Signal-Server wird von uns selbst betrieben, befindet sich in Deutschland und
              ist als Open-Source-Software &ouml;ffentlich einsehbar
            </li>
          </ul>
        </div>

        {/* 4. Anonymitat der Abstimmung */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            4. Anonymit&auml;t der Abstimmung
          </h3>
          <p className="mb-2">
            Die Abstimmung ist <strong>vollst&auml;ndig anonym</strong>. Der Versammlungsleiter
            sieht ausschlie&szlig;lich die aggregierten Ergebnisse (z.B. &bdquo;5&times; Ja,
            3&times; Nein&ldquo;). Eine Zuordnung einzelner Stimmen zu Personen oder Ger&auml;ten
            ist <strong>technisch nicht m&ouml;glich</strong>, da:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">Stimmen ohne Absenderkennung &uuml;bermittelt werden</li>
            <li className="mb-1">Keine Protokollierung der Verbindungen stattfindet</li>
            <li className="mb-1">Keine IP-Adressen gespeichert werden</li>
          </ul>
        </div>

        {/* 5. Browser-Fingerprinting */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            5. Doppelabstimmungs-Schutz (Browser-Fingerprinting)
          </h3>
          <p className="mb-2">
            Um Mehrfachabstimmungen zu verhindern, erzeugt die Anwendung einen{" "}
            <strong>anonymen Ger&auml;te-Hash</strong> aus verschiedenen Browser-Signalen (Canvas,
            WebGL, Audio API, Bildschirmaufl&ouml;sung, installierte Schriftarten,
            Hardware-Informationen). Dieser Hash:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              Wird <strong>nur lokal</strong> auf dem Ger&auml;t des Versammlungsleiters gespeichert
            </li>
            <li className="mb-1">
              Dient ausschlie&szlig;lich der Erkennung bereits abgegebener Stimmen innerhalb einer
              laufenden Versammlung
            </li>
            <li className="mb-1">
              L&auml;sst <strong>keinen R&uuml;ckschluss</strong> auf die Person oder das konkrete
              Ger&auml;t zu
            </li>
            <li className="mb-1">
              Wird nach Beendigung der Versammlung oder Schlie&szlig;en des Browsers{" "}
              <strong>unwiderruflich gel&ouml;scht</strong>
            </li>
          </ul>
        </div>

        {/* 6. localStorage */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            6. Lokale Speicherung (localStorage / sessionStorage)
          </h3>
          <p className="mb-2">
            Die Anwendung nutzt den lokalen Speicher des Browsers (localStorage und sessionStorage)
            ausschlie&szlig;lich f&uuml;r:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              Erkennung bereits abgegebener Stimmen (Schutz vor Doppelabstimmung)
            </li>
            <li className="mb-1">
              Tempor&auml;re Sitzungsdaten w&auml;hrend einer laufenden Versammlung
            </li>
          </ul>
          <p className="mb-2">
            Diese Daten verbleiben <strong>ausschlie&szlig;lich auf Ihrem Ger&auml;t</strong> und
            werden nicht an Dritte &uuml;bermittelt. Sie k&ouml;nnen diese Daten jederzeit
            &uuml;ber die Browser-Einstellungen l&ouml;schen.
          </p>
        </div>

        {/* 7. Hosting */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            7. Hosting und Infrastruktur
          </h3>
          <p className="mb-2">
            Die Anwendung und der Signal-Server werden bei{" "}
            <strong>Hostinger</strong> (Hostinger International Ltd.) auf einem{" "}
            <strong>Server in Deutschland</strong> betrieben. Hostinger erhebt dabei ggf.
            technische Zugriffsdaten (IP-Adresse, Zeitstempel, aufgerufene Seite) in
            Server-Logfiles.
          </p>
          <p className="mb-2">
            Zus&auml;tzlich nutzen wir <strong>Cloudflare</strong> (Cloudflare Inc., 101 Townsend
            St, San Francisco, CA 94107, USA) als Content-Delivery-Network (CDN) und
            DDoS-Schutz. Cloudflare verarbeitet dabei technische Verbindungsdaten
            (IP-Adresse, Zeitstempel) zur Auslieferung der Anwendung und zum Schutz vor
            Angriffen. N&auml;heres regelt die{" "}
            <a
              href="https://www.cloudflare.com/de-de/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline hover:underline"
              style={{ color: "var(--drk)" }}
            >
              Datenschutzerkl&auml;rung von Cloudflare
            </a>
            .
          </p>
        </div>

        {/* 8. Keine externen Schriftarten */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            8. Keine externen Schriftarten oder CDNs
          </h3>
          <p className="mb-2">
            Diese Anwendung verwendet ausschlie&szlig;lich{" "}
            <strong>System-Schriftarten</strong>, die bereits auf Ihrem Ger&auml;t
            vorinstalliert sind. Es werden <strong>keine Schriftarten von externen
            Servern</strong> geladen &ndash; weder von Google Fonts noch von anderen
            Diensten. Ebenso werden alle JavaScript-Bibliotheken (einschlie&szlig;lich
            PeerJS) direkt mit der Anwendung ausgeliefert &ndash; es werden{" "}
            <strong>keine externen CDNs</strong> eingebunden.
          </p>
        </div>

        {/* 9. Keine persistente Speicherung */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            9. Keine persistente Datenspeicherung
          </h3>
          <p className="mb-2">
            Nach dem Beenden der Versammlung oder Schlie&szlig;en des Browser-Fensters sind alle
            Daten <strong>unwiderruflich gel&ouml;scht</strong>. Es gibt keine M&ouml;glichkeit,
            vergangene Abstimmungen oder Ergebnisse nachtr&auml;glich einzusehen &ndash; weder durch
            den Versammlungsleiter noch durch Dritte.
          </p>
        </div>

        {/* 10. Ihre Rechte */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            10. Ihre Rechte
          </h3>
          <p className="mb-2">
            Da keine personenbezogenen Daten erhoben oder gespeichert werden, entfallen die
            &uuml;blichen Betroffenenrechte (Auskunft, L&ouml;schung, Berichtigung etc.) im Kontext
            dieser Anwendung. Sollten Sie dennoch Fragen zum Datenschutz haben, k&ouml;nnen Sie sich
            jederzeit an uns wenden:
          </p>
          <p className="mb-2">
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

        {/* 11. Anderungen */}
        <div>
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            11. &Auml;nderungen
          </h3>
          <p className="mb-2">
            Wir behalten uns vor, diese Datenschutzerkl&auml;rung bei Bedarf anzupassen,
            insbesondere bei technischen &Auml;nderungen an der Anwendung. Die jeweils aktuelle
            Fassung ist &uuml;ber den Link in der Anwendung abrufbar.
          </p>
        </div>
      </div>
    </div>
  );
}
