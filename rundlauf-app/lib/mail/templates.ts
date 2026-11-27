import { escapeHtml as esc } from "@/lib/html-escape";
import { sendMail } from "./mailjet";

function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL muss gesetzt sein");
  return url.replace(/\/$/, "");
}

const HTML_WRAPPER = (heading: string, body: string) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #212529; font-size: 16px; line-height: 1.5;">
  <div style="background: #e30613; color: #fff; padding: 16px 24px; border-radius: 12px 12px 0 0;">
    <strong style="font-size: 1.1rem;">DRK Rundlaufbeschlüsse</strong>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin-top: 0;">${heading}</h2>
    ${body}
    <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
      Diese E-Mail wurde automatisch von DRK Rundlaufbeschlüsse versendet. Bei Fragen antworte einfach auf diese Nachricht oder wende dich an die Verwaltung deines Verbands.
    </p>
  </div>
</body></html>`;

// Wiederkehrende HTML-Bausteine — reine Substring-Extraktionen, der erzeugte
// Mail-Inhalt bleibt byte-identisch.
const ctaButton = (href: string, label: string) =>
  `<p style="margin: 24px 0;"><a href="${href}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">${label}</a></p>`;

const linkFallback = (link: string, withHint = false) =>
  `<p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">${withHint ? "Oder kopiere diesen Link in deinen Browser:<br>" : ""}${link}</p>`;

const greetingHtml = (name?: string) => (name ? `Hallo <strong>${esc(name)}</strong>,` : "Hallo,");

const formatFrist = (d: Date) =>
  d.toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short" });

export async function sendLoginLink(opts: {
  to: { email: string; name?: string };
  rawToken: string;
  /** Relativer Pfad, auf den nach der Anmeldung weitergeleitet wird. */
  next?: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}${
    opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""
  }`;
  const text = `Hallo${opts.to.name ? " " + opts.to.name : ""},\n\nklicke auf den folgenden Link, um dich anzumelden:\n${link}\n\nDer Link ist 60 Minuten gültig.`;
  const html = HTML_WRAPPER(
    "Dein Anmelde-Link",
    `<p>Klicke auf den Button, um dich anzumelden. Der Link ist <strong>60 Minuten</strong> gültig.</p>
     ${ctaButton(link, "Jetzt anmelden")}
     ${linkFallback(link)}`,
  );
  await sendMail({ to: opts.to, subject: "Anmelden bei DRK Rundlaufbeschlüsse", text, html });
}

export async function sendRegisterLink(opts: {
  to: { email: string };
  rawToken: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}`;
  const text = `Willkommen,\n\nBitte bestätige deine E-Mail-Adresse durch Klick auf folgenden Link:\n${link}\n\nDer Link ist 60 Minuten gültig.`;
  const html = HTML_WRAPPER(
    "Willkommen bei DRK Rundlaufbeschlüsse",
    `<p>Bitte bestätige deine E-Mail-Adresse, um die Registrierung abzuschließen. Der Link ist <strong>60 Minuten</strong> gültig.</p>
     ${ctaButton(link, "E-Mail bestätigen")}
     ${linkFallback(link)}`,
  );
  await sendMail({ to: opts.to, subject: "Bestätige deine Registrierung", text, html });
}

export async function sendInviteLink(opts: {
  to: { email: string; name?: string };
  inviterName: string;
  inviterEmail?: string;
  tenantName: string;
  rawToken: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}`;
  const greetingName = opts.to.name ? ` ${opts.to.name}` : "";

  const text = [
    `Hallo${greetingName},`,
    "",
    `${opts.inviterName} hat dich eingeladen, im Kreisverband "${opts.tenantName}" an digitalen Umlaufbeschlüssen mitzuwirken.`,
    "",
    "DRK Rundlaufbeschlüsse ist das Online-Tool, mit dem die Gremien des Deutschen Roten Kreuzes rechtssicher und transparent zwischen Sitzungen über Beschlussvorlagen abstimmen.",
    "",
    "So nimmst du die Einladung an:",
    link,
    "",
    "Nach dem Klick bist du direkt angemeldet – ein Passwort wird nicht benötigt. Der Link ist 7 Tage gültig.",
    "",
    "Falls du diese Einladung nicht erwartest, kannst du diese E-Mail einfach ignorieren. Ohne Klick passiert nichts.",
  ].join("\n");


  const html = HTML_WRAPPER(
    `Einladung in ${esc(opts.tenantName)}`,
    `<p>${greetingHtml(opts.to.name)}</p>
     <p><strong>${esc(opts.inviterName)}</strong> hat dich eingeladen, im Kreisverband <strong>${esc(opts.tenantName)}</strong> an digitalen Umlaufbeschlüssen mitzuwirken.</p>
     <p>DRK Rundlaufbeschlüsse ist das Online-Tool, mit dem die Gremien des Deutschen Roten Kreuzes rechtssicher und transparent zwischen Sitzungen über Beschlussvorlagen abstimmen.</p>
     ${ctaButton(link, "Einladung annehmen")}
     ${linkFallback(link, true)}
     <p style="font-size: 0.85rem; color: #6b7280;">Nach dem Klick bist du direkt angemeldet – ein Passwort wird nicht benötigt. Der Link ist <strong>7 Tage</strong> gültig.</p>
     <p style="font-size: 0.85rem; color: #6b7280;">Falls du diese Einladung nicht erwartest, kannst du diese E-Mail einfach ignorieren – ohne Klick passiert nichts.</p>`,
  );
  await sendMail({
    to: opts.to,
    subject: `Einladung zu ${opts.tenantName}`,
    text,
    html,
    replyTo: opts.inviterEmail ? { email: opts.inviterEmail, name: opts.inviterName } : undefined,
  });
}

export async function sendSuperadminNewTenantNotice(opts: {
  to: { email: string };
  tenantName: string;
  tenantSlug: string;
  createdByEmail: string;
}) {
  const link = `${appUrl()}/admin`;
  const text = `Ein neuer KV wartet auf Freischaltung:\n\nName: ${opts.tenantName}\nSlug: ${opts.tenantSlug}\nAngelegt von: ${opts.createdByEmail}\n\nModerations-Queue: ${link}`;
  const html = HTML_WRAPPER(
    "Neuer KV wartet auf Freischaltung",
    `<p>Ein neuer Kreisverband wartet auf Freischaltung:</p>
     <ul>
       <li><strong>Name:</strong> ${esc(opts.tenantName)}</li>
       <li><strong>Slug:</strong> ${esc(opts.tenantSlug)}</li>
       <li><strong>Angelegt von:</strong> ${esc(opts.createdByEmail)}</li>
     </ul>
     ${ctaButton(link, "Moderations-Queue öffnen")}`,
  );
  await sendMail({ to: opts.to, subject: `Neuer KV: ${opts.tenantName}`, text, html });
}

export async function sendTenantApproved(opts: {
  to: { email: string };
  tenantName: string;
  tenantSlug: string;
}) {
  const link = `${appUrl()}/${opts.tenantSlug}`;
  const text = `Dein Kreisverband "${opts.tenantName}" wurde freigeschaltet.\n\nLogin: ${link}`;
  const html = HTML_WRAPPER(
    `KV ${esc(opts.tenantName)} freigeschaltet`,
    `<p>Dein Kreisverband <strong>${esc(opts.tenantName)}</strong> wurde freigeschaltet. Du kannst jetzt Mitglieder einladen und Beschlüsse anlegen.</p>
     ${ctaButton(link, "Zur Übersicht")}`,
  );
  await sendMail({ to: opts.to, subject: `KV ${opts.tenantName} freigeschaltet`, text, html });
}

export async function sendTenantRejected(opts: {
  to: { email: string };
  tenantName: string;
  reason: string;
}) {
  const text = `Dein Antrag für den Kreisverband "${opts.tenantName}" wurde abgelehnt.\n\nBegründung: ${opts.reason}`;
  const html = HTML_WRAPPER(
    `KV-Antrag abgelehnt`,
    `<p>Dein Antrag für den Kreisverband <strong>${esc(opts.tenantName)}</strong> wurde abgelehnt.</p>
     <p><strong>Begründung:</strong> ${esc(opts.reason)}</p>`,
  );
  await sendMail({ to: opts.to, subject: `KV-Antrag abgelehnt`, text, html });
}

export async function sendResolutionInvite(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  resolutionTitle: string;
  resolutionLink: string;
  fristEnde: Date;
  topCount?: number;
  /** Eröffnende Person – Antworten auf die Mail gehen an sie. */
  replyTo?: { email: string; name?: string };
}) {
  const fristStr = formatFrist(opts.fristEnde);
  const topInfo =
    typeof opts.topCount === "number"
      ? `${opts.topCount} Beschlussvorlage${opts.topCount === 1 ? "" : "n"} · `
      : "";
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  // Der Titel heißt bei leerem Betreff bereits "Umlaufverfahren mit …" – nicht doppeln.
  const subject = /^umlaufverfahren/i.test(opts.resolutionTitle)
    ? opts.resolutionTitle
    : `Umlaufverfahren: ${opts.resolutionTitle}`;
  const text = `Hallo${greeting},\n\nim Kreisverband "${opts.tenantName}" wurde ein neues Umlaufverfahren eröffnet, in dem du stimmberechtigt bist:\n\n"${opts.resolutionTitle}"\n\n${topInfo}Frist: ${fristStr}\n\nBitte lies die Beschlussvorlage(n) und gib deine Stimme bis zum Fristende ab. Deine Stimme wird namentlich erfasst.\n\nZum Abstimmen (du wirst ggf. zuerst zur Anmeldung geleitet):\n${opts.resolutionLink}`;
  const html = HTML_WRAPPER(
    `Neues Umlaufverfahren: ${esc(opts.resolutionTitle)}`,
    `<p>${greetingHtml(opts.to.name)}</p>
     <p>im Kreisverband <strong>${esc(opts.tenantName)}</strong> wurde ein neues Umlaufverfahren eröffnet, in dem du stimmberechtigt bist:</p>
     <p style="background: #fef2f2; padding: 12px 16px; border-left: 4px solid #e30613; border-radius: 4px;">
       <strong>${esc(opts.resolutionTitle)}</strong><br/>
       ${topInfo}Frist: ${fristStr}
     </p>
     <p>Bitte lies die Beschlussvorlage(n) und gib deine Stimme bis zum Fristende ab. Deine Stimme wird namentlich erfasst.</p>
     ${ctaButton(opts.resolutionLink, "Jetzt abstimmen")}
     ${linkFallback(opts.resolutionLink, true)}
     <p style="font-size: 14px; color: #6b7280;">Falls du nicht angemeldet bist, führt dich der Link zuerst zur Anmeldung und danach direkt zum Verfahren.</p>`,
  );
  await sendMail({ to: opts.to, subject, text, html, replyTo: opts.replyTo });
}

export async function sendResolutionResult(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  resolutionTitle: string;
  resolutionLink: string;
  status: "abgeschlossen" | "zurueckgezogen";
  /** Eine Zeile je TOP, z. B. "TOP 1 – Haushalt 2027: angenommen (5 Ja, 1 Nein, 0 Enthaltungen)". */
  outcomes: string[];
}) {
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  const withdrawn = opts.status === "zurueckgezogen";
  const headline = withdrawn
    ? `Umlaufverfahren zurückgezogen: ${opts.resolutionTitle}`
    : `Ergebnis: ${opts.resolutionTitle}`;
  const intro = withdrawn
    ? `das Umlaufverfahren "${opts.resolutionTitle}" im Kreisverband "${opts.tenantName}" wurde ohne Auszählung zurückgezogen.`
    : `das Umlaufverfahren "${opts.resolutionTitle}" im Kreisverband "${opts.tenantName}" ist abgeschlossen. Ergebnis:`;
  const text = [`Hallo${greeting},`, "", intro, "", ...(withdrawn ? [] : opts.outcomes.map((o) => `- ${o}`)), "", `Details und Protokoll:`, opts.resolutionLink].join("\n");
  const html = HTML_WRAPPER(
    esc(headline),
    `<p>${greetingHtml(opts.to.name)}</p>
     <p>${esc(intro)}</p>
     ${withdrawn ? "" : `<ul>${opts.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`}
     ${ctaButton(opts.resolutionLink, withdrawn ? "Verfahren ansehen" : "Ergebnis und Protokoll ansehen")}
     ${linkFallback(opts.resolutionLink)}`,
  );
  await sendMail({ to: opts.to, subject: headline, text, html });
}

export async function sendVoteReminder(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  resolutionTitle: string;
  resolutionLink: string;
  fristEnde: Date;
}) {
  const fristStr = formatFrist(opts.fristEnde);
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  const text = `Hallo${greeting},\n\nim Kreisverband "${opts.tenantName}" läuft noch ein Umlaufverfahren, zu dem deine Stimme aussteht:\n\n"${opts.resolutionTitle}"\n\nFrist: ${fristStr}\n\nJetzt abstimmen:\n${opts.resolutionLink}`;
  const html = HTML_WRAPPER(
    "Erinnerung: bitte noch abstimmen",
    `<p>${greetingHtml(opts.to.name)}</p>
     <p>im Kreisverband <strong>${esc(opts.tenantName)}</strong> läuft noch ein Umlaufverfahren, zu dem deine Stimme aussteht:</p>
     <p style="background: #fef2f2; padding: 12px 16px; border-left: 4px solid #e30613; border-radius: 4px;">
       <strong>${esc(opts.resolutionTitle)}</strong><br/>
       Frist: ${fristStr}
     </p>
     ${ctaButton(opts.resolutionLink, "Jetzt abstimmen")}
     ${linkFallback(opts.resolutionLink)}`,
  );
  await sendMail({
    to: opts.to,
    subject: `Erinnerung: ${opts.resolutionTitle}`,
    text,
    html,
  });
}

export async function sendInviteReminder(opts: {
  to: { email: string; name?: string };
  tenantName: string;
  rawToken: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}`;
  const greeting = opts.to.name ? ` ${opts.to.name}` : "";
  const text = [
    `Hallo${greeting},`,
    "",
    `im Kreisverband "${opts.tenantName}" wartet eine Abstimmung auf dich – deine Einladung ist noch offen.`,
    "",
    "Nimm die Einladung an, um teilzunehmen. Nach dem Klick bist du direkt angemeldet – ein Passwort wird nicht benötigt:",
    link,
    "",
    "Der Link ist 7 Tage gültig. Falls du nicht teilnehmen möchtest, kannst du diese E-Mail ignorieren.",
  ].join("\n");
  const html = HTML_WRAPPER(
    `Erinnerung: Einladung zu ${esc(opts.tenantName)} noch offen`,
    `<p>${greetingHtml(opts.to.name)}</p>
     <p>im Kreisverband <strong>${esc(opts.tenantName)}</strong> wartet eine Abstimmung auf dich – deine Einladung ist noch offen.</p>
     ${ctaButton(link, "Einladung annehmen")}
     ${linkFallback(link, true)}
     <p style="font-size: 0.85rem; color: #6b7280;">Der Link ist <strong>7 Tage</strong> gültig. Falls du nicht teilnehmen möchtest, kannst du diese E-Mail ignorieren.</p>`,
  );
  await sendMail({
    to: opts.to,
    subject: `Erinnerung: Einladung zu ${opts.tenantName}`,
    text,
    html,
  });
}
