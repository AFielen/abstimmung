import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung - DRK Rundlaufbeschlüsse",
};

export default function DatenschutzPage() {
  return (
    <div className="max-w-[800px] w-full mx-auto py-6 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 mb-4 font-semibold text-[0.95rem] no-underline hover:underline"
        style={{ color: "var(--drk)" }}
      >
        &larr; Zur&uuml;ck zur Startseite
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

        <p className="mb-5 text-[0.95rem]" style={{ color: "var(--text-light)" }}>
          Diese Datenschutzerkl&auml;rung gilt f&uuml;r beide unter der Domain{" "}
          <strong>drk-abstimmung.de</strong> betriebenen Dienste:
          die <strong>Live-Abstimmung</strong> (drk-abstimmung.de) und den{" "}
          <strong>Rundlaufbeschluss</strong> (rundlauf.drk-abstimmung.de). Die Dienste
          unterscheiden sich technisch erheblich &ndash; bitte beachten Sie die jeweiligen
          Abschnitte.
        </p>

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

        {/* 2. Geltungsbereich und Grundsaetze */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            2. Geltungsbereich und Grunds&auml;tze
          </h3>
          <p className="mb-2">
            Die beiden Dienste verarbeiten unterschiedliche Datenmengen. Es gibt in keinem
            Fall Tracking, Analytics oder Werbe-Cookies. Es werden keine Daten an Dritte
            verkauft oder zu Werbezwecken weitergegeben.
          </p>

          <p className="mb-1 mt-3">
            <strong>a) Live-Abstimmung (drk-abstimmung.de)</strong>
          </p>
          <p className="mb-2">
            Die Live-Abstimmung ist bewusst so konzipiert, dass{" "}
            <strong>keine personenbezogenen Daten</strong> erhoben, gespeichert oder an
            Dritte &uuml;bermittelt werden. Es gibt:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">Keine Registrierung oder Anmeldung</li>
            <li className="mb-1">Keine Cookies</li>
            <li className="mb-1">
              Keine Analyse- oder Tracking-Dienste (kein Google Analytics, kein Matomo
              o.&Auml;.)
            </li>
            <li className="mb-1">
              Keine Datenbank &ndash; weder auf dem Server noch in der Cloud
            </li>
          </ul>

          <p className="mb-1 mt-3">
            <strong>b) Rundlaufbeschluss (rundlauf.drk-abstimmung.de)</strong>
          </p>
          <p className="mb-2">
            Der Rundlaufbeschluss bildet das Umlaufverfahren nach{" "}
            <strong>&sect; 21 Abs. 6 der Vereinssatzung</strong> ab. Hierf&uuml;r ist die
            Erhebung personenbezogener Daten unvermeidbar (Identifikation der
            Stimmberechtigten, Nachweis der abgegebenen Stimme). Die genauen
            Verarbeitungen sind unter Abschnitt 10 dieser Erkl&auml;rung beschrieben.
          </p>
        </div>

        <div
          className="mt-8 mb-4 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            className="text-[0.95rem] font-bold mb-3 mt-3"
            style={{ color: "var(--drk)" }}
          >
            Abschnitte 3&ndash;9: Live-Abstimmung
          </p>
        </div>

        {/* 3. Kommunikation */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            3. Kommunikation zwischen den Ger&auml;ten
          </h3>
          <p className="mb-2">
            Die Live-Abstimmung bietet zwei Kommunikationsmodi. In beiden F&auml;llen
            werden <strong>keine Abstimmungsdaten dauerhaft gespeichert</strong>.
          </p>

          <p className="mb-1 mt-3">
            <strong>a) P2P-Modus (Peer-to-Peer via WebRTC / PeerJS)</strong>
          </p>
          <p className="mb-2">
            Im P2P-Modus nutzt die Anwendung <strong>WebRTC</strong> (Web Real-Time
            Communication) &uuml;ber die Bibliothek <strong>PeerJS</strong>. Dabei werden
            folgende technische Verbindungen hergestellt:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              <strong>Eigener Signal-Server</strong>: Dient ausschlie&szlig;lich dem
              initialen Verbindungsaufbau zwischen den Ger&auml;ten. Es werden dabei keine
              Abstimmungsdaten &uuml;bertragen &ndash; lediglich technische
              Verbindungsinformationen (sog. Signaling). Der Signal-Server wird von uns
              selbst betrieben und befindet sich in Deutschland.
            </li>
            <li className="mb-1">
              <strong>STUN-Server</strong>: Werden ben&ouml;tigt, um die direkte
              Verbindung zwischen Ger&auml;ten herzustellen (NAT-Traversal). Es werden
              dabei keine inhaltlichen Daten &uuml;bertragen &ndash; lediglich die
              &ouml;ffentliche IP-Adresse des Ger&auml;ts ermittelt.
            </li>
          </ul>
          <p className="mb-2">
            Nach dem Verbindungsaufbau flie&szlig;en alle Daten (Abstimmungsoptionen,
            abgegebene Stimmen, Ergebnisse) <strong>direkt zwischen den Ger&auml;ten</strong>{" "}
            &uuml;ber einen verschl&uuml;sselten WebRTC-DataChannel &ndash; ohne Umweg
            &uuml;ber einen Server.
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
              Der Server leitet Nachrichten ausschlie&szlig;lich im Arbeitsspeicher
              weiter &ndash; <strong>ohne Speicherung auf der Festplatte</strong>
            </li>
            <li className="mb-1">
              Es gibt keine Datenbank und keine Logfiles mit Abstimmungsinhalten
            </li>
            <li className="mb-1">
              Nach Beendigung der Versammlung oder Trennung aller Verbindungen werden
              s&auml;mtliche Daten im Arbeitsspeicher gel&ouml;scht
            </li>
            <li className="mb-1">
              Der Signal-Server wird von uns selbst betrieben, befindet sich in
              Deutschland und ist als Open-Source-Software &ouml;ffentlich einsehbar
            </li>
          </ul>
        </div>

        {/* 4. Anonymitat der Abstimmung */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            4. Anonymit&auml;t der Abstimmung
          </h3>
          <p className="mb-2">
            Die Live-Abstimmung ist <strong>vollst&auml;ndig anonym</strong>. Der
            Versammlungsleiter sieht ausschlie&szlig;lich die aggregierten Ergebnisse
            (z.B. &bdquo;5&times; Ja, 3&times; Nein&ldquo;). Eine Zuordnung einzelner
            Stimmen zu Personen oder Ger&auml;ten ist{" "}
            <strong>technisch nicht m&ouml;glich</strong>, da:
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
            Um Mehrfachabstimmungen zu verhindern, erzeugt die Live-Abstimmung einen{" "}
            <strong>anonymen Ger&auml;te-Hash</strong> aus verschiedenen Browser-Signalen
            (Canvas, WebGL, Audio API, Bildschirmaufl&ouml;sung, installierte Schriftarten,
            Hardware-Informationen). Dieser Hash:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              Wird <strong>nur lokal</strong> auf dem Ger&auml;t des Versammlungsleiters
              gespeichert
            </li>
            <li className="mb-1">
              Dient ausschlie&szlig;lich der Erkennung bereits abgegebener Stimmen
              innerhalb einer laufenden Versammlung
            </li>
            <li className="mb-1">
              L&auml;sst <strong>keinen R&uuml;ckschluss</strong> auf die Person oder das
              konkrete Ger&auml;t zu
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
            Die Live-Abstimmung nutzt den lokalen Speicher des Browsers (localStorage und
            sessionStorage) ausschlie&szlig;lich f&uuml;r:
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
            Diese Daten verbleiben <strong>ausschlie&szlig;lich auf Ihrem Ger&auml;t</strong>{" "}
            und werden nicht an Dritte &uuml;bermittelt. Sie k&ouml;nnen diese Daten
            jederzeit &uuml;ber die Browser-Einstellungen l&ouml;schen.
          </p>
        </div>

        {/* 7. Hosting */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            7. Hosting und Infrastruktur
          </h3>
          <p className="mb-2">
            Die Anwendung und der Signal-Server werden bei <strong>Hetzner Online GmbH</strong>{" "}
            auf einem <strong>Server in Deutschland</strong> betrieben. Hetzner erhebt
            dabei ggf. technische Zugriffsdaten (IP-Adresse, Zeitstempel, aufgerufene
            Seite) in Server-Logfiles.
          </p>
          <p className="mb-2">
            Die SSL/TLS-Verschl&uuml;sselung wird durch einen{" "}
            <strong>Caddy Reverse Proxy</strong> auf dem gleichen Server bereitgestellt.
            Es werden keine externen CDN- oder DDoS-Schutzdienste eingesetzt. Alle Daten
            verbleiben auf unserem Server in Deutschland.
          </p>
        </div>

        {/* 8. Keine externen Schriftarten */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            8. Keine externen Schriftarten oder CDNs
          </h3>
          <p className="mb-2">
            Alle verwendeten Schriftarten sind <strong>lokal auf unserem Server</strong>{" "}
            gehostet und werden direkt mit der Anwendung ausgeliefert. Es findet{" "}
            <strong>keine Verbindung zu Google Fonts</strong> oder anderen externen
            Schriftarten-Diensten statt. Ebenso werden alle JavaScript-Bibliotheken
            (einschlie&szlig;lich PeerJS) direkt mit der Anwendung ausgeliefert &ndash; es
            werden <strong>keine externen CDNs</strong> eingebunden.
          </p>
        </div>

        {/* 9. Keine persistente Speicherung */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            9. Keine persistente Datenspeicherung (Live-Abstimmung)
          </h3>
          <p className="mb-2">
            Nach dem Beenden der Versammlung oder Schlie&szlig;en des Browser-Fensters
            sind alle Daten der Live-Abstimmung <strong>unwiderruflich gel&ouml;scht</strong>.
            Es gibt keine M&ouml;glichkeit, vergangene Abstimmungen oder Ergebnisse
            nachtr&auml;glich einzusehen &ndash; weder durch den Versammlungsleiter noch
            durch Dritte.
          </p>
        </div>

        <div
          className="mt-8 mb-4 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            className="text-[0.95rem] font-bold mb-3 mt-3"
            style={{ color: "var(--drk)" }}
          >
            Abschnitt 10: Rundlaufbeschluss
          </p>
        </div>

        {/* 10. Rundlaufbeschluss - Datenverarbeitung */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            10. Rundlaufbeschluss &ndash; Datenverarbeitung im Umlaufverfahren
          </h3>
          <p className="mb-2">
            Der Rundlaufbeschluss-Dienst (rundlauf.drk-abstimmung.de) bildet das
            Umlaufverfahren f&uuml;r Pr&auml;sidien gem&auml;&szlig; &sect; 21 Abs. 6 der
            Vereinssatzung ab. Hierf&uuml;r werden gezielt personenbezogene Daten
            erhoben.
          </p>

          <p className="mb-1 mt-3">
            <strong>a) Welche Daten wir verarbeiten</strong>
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              <strong>E-Mail-Adresse und Name</strong> der Stimmberechtigten (von den
              Nutzenden selbst angegeben) zur Authentifizierung und Zuordnung der
              abgegebenen Stimme.
            </li>
            <li className="mb-1">
              <strong>Mitgliedschaften</strong> im jeweiligen Kreisverband sowie die
              vergebene Rolle (z.B. Pr&auml;sidiumsmitglied, Moderation).
            </li>
            <li className="mb-1">
              <strong>Beschluss-Inhalte, abgegebene Stimmen und Zeitstempel</strong>{" "}
              &ndash; als Nachweis f&uuml;r das Umlaufverfahren gem&auml;&szlig; Satzung.
            </li>
            <li className="mb-1">
              <strong>Pseudonymisierter IP-/User-Agent-Hash</strong> zum Schutz gegen
              Missbrauch (Rate-Limiting, Verhinderung automatisierter Angriffe).
            </li>
          </ul>

          <p className="mb-1 mt-3">
            <strong>b) Rechtsgrundlage</strong>
          </p>
          <p className="mb-2">
            Die Verarbeitung erfolgt zur Erf&uuml;llung satzungsm&auml;&szlig;iger
            Pflichten des Vereins (Art. 6 Abs. 1 lit. c und f DSGVO i.V.m. &sect; 21 Abs. 6
            der DRK-Vereinssatzung).
          </p>

          <p className="mb-1 mt-3">
            <strong>c) Speicherdauer</strong>
          </p>
          <p className="mb-2">
            Beschluss-Daten und die zugeh&ouml;rigen Stimmen werden{" "}
            <strong>10 Jahre nach Abschluss</strong> des jeweiligen Beschlusses
            aufbewahrt (Nachweis- und Vereinsdokumentationspflichten). Nach Ablauf dieser
            Frist werden personenbezogene Snapshots automatisch anonymisiert.
            Audit-Logs werden ebenfalls nach 10 Jahren gel&ouml;scht.
          </p>

          <p className="mb-1 mt-3">
            <strong>d) Cookies</strong>
          </p>
          <p className="mb-2">
            Der Rundlaufbeschluss-Dienst setzt ausschlie&szlig;lich ein{" "}
            <strong>technisch erforderliches Session-Cookie</strong> (HttpOnly,
            SameSite=Lax) zur Anmeldung &uuml;ber Magic-Link. Es werden{" "}
            <strong>keine Tracking-, Analytics- oder Drittanbieter-Cookies</strong>{" "}
            gesetzt.
          </p>

          <p className="mb-1 mt-3">
            <strong>e) Auftragsverarbeiter</strong>
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">
              <strong>Mailjet</strong> (Sinch Email AB) zum Versand von Magic-Link-Mails
              und Benachrichtigungen an Stimmberechtigte. Es besteht ein
              Auftragsverarbeitungsvertrag gem&auml;&szlig; Art. 28 DSGVO. Mailjet
              betreibt Server in der EU.
            </li>
            <li className="mb-1">
              <strong>Hetzner Online GmbH</strong> als Hosting-Provider f&uuml;r den
              Anwendungs-Server und die zugeh&ouml;rige Postgres-Datenbank
              (Standort Deutschland).
            </li>
          </ul>
        </div>

        {/* 11. Ihre Rechte */}
        <div className="mb-6">
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            11. Ihre Rechte
          </h3>
          <p className="mb-2">
            Soweit personenbezogene Daten verarbeitet werden (insbesondere im
            Rundlaufbeschluss-Dienst), haben Sie nach DSGVO Anspruch auf:
          </p>
          <ul className="ml-6 mb-2 list-disc">
            <li className="mb-1">Auskunft &uuml;ber die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)</li>
            <li className="mb-1">Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li className="mb-1">
              L&ouml;schung, soweit gesetzliche Aufbewahrungspflichten nicht entgegenstehen
              (Art. 17 DSGVO)
            </li>
            <li className="mb-1">Einschr&auml;nkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li className="mb-1">Datenportabilit&auml;t (Art. 20 DSGVO)</li>
            <li className="mb-1">
              Widerspruch gegen die Verarbeitung auf Basis berechtigter Interessen
              (Art. 21 DSGVO)
            </li>
            <li className="mb-1">
              Beschwerde bei der zust&auml;ndigen Aufsichtsbeh&ouml;rde
              (Landesbeauftragte f&uuml;r Datenschutz und Informationsfreiheit
              Nordrhein-Westfalen)
            </li>
          </ul>
          <p className="mb-2">
            F&uuml;r die Live-Abstimmung werden &ndash; wie oben unter Abschnitt 2 a) und
            3&ndash;9 beschrieben &ndash; keine personenbezogenen Daten erhoben, daher
            entfallen die &uuml;blichen Betroffenenrechte mangels Verarbeitung.
          </p>
          <p className="mb-2">
            Bei Fragen oder zur Aus&uuml;bung Ihrer Rechte wenden Sie sich bitte an:
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

        {/* 12. Anderungen */}
        <div>
          <h3 className="text-[1.05rem] font-bold mb-1" style={{ color: "var(--text)" }}>
            12. &Auml;nderungen
          </h3>
          <p className="mb-2">
            Wir behalten uns vor, diese Datenschutzerkl&auml;rung bei Bedarf anzupassen,
            insbesondere bei technischen &Auml;nderungen an den Anwendungen. Die jeweils
            aktuelle Fassung ist &uuml;ber den Link in den Anwendungen abrufbar.
          </p>
        </div>
      </div>
    </div>
  );
}
