import { sendMail } from "./mailjet";

function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL muss gesetzt sein");
  return url.replace(/\/$/, "");
}

const HTML_WRAPPER = (heading: string, body: string) => `<!doctype html>
<html lang="de"><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #212529;">
  <div style="background: #e30613; color: #fff; padding: 16px 24px; border-radius: 12px 12px 0 0;">
    <strong style="font-size: 1.1rem;">DRK Rundlaufbeschlüsse</strong>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin-top: 0;">${heading}</h2>
    ${body}
    <p style="margin-top: 24px; font-size: 0.8rem; color: #6b7280;">
      DRK Kreisverband StädteRegion Aachen e.V. · diese E-Mail wurde automatisch versendet
    </p>
  </div>
</body></html>`;

export async function sendLoginLink(opts: {
  to: { email: string; name?: string };
  rawToken: string;
}) {
  const link = `${appUrl()}/auth/magic/${opts.rawToken}`;
  const text = `Hallo${opts.to.name ? " " + opts.to.name : ""},\n\nklicke auf den folgenden Link, um dich anzumelden:\n${link}\n\nDer Link ist 60 Minuten gültig.`;
  const html = HTML_WRAPPER(
    "Dein Anmelde-Link",
    `<p>Klicke auf den Button, um dich anzumelden. Der Link ist <strong>60 Minuten</strong> gültig.</p>
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Jetzt anmelden</a></p>
     <p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">${link}</p>`,
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
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">E-Mail bestätigen</a></p>
     <p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">${link}</p>`,
  );
  await sendMail({ to: opts.to, subject: "Bestätige deine Registrierung", text, html });
}

export async function sendInviteLink(opts: {
  to: { email: string; name?: string };
  inviterName: string;
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

  const greetingHtml = opts.to.name
    ? `Hallo <strong>${opts.to.name}</strong>,`
    : "Hallo,";

  const html = HTML_WRAPPER(
    `Einladung in ${opts.tenantName}`,
    `<p>${greetingHtml}</p>
     <p><strong>${opts.inviterName}</strong> hat dich eingeladen, im Kreisverband <strong>${opts.tenantName}</strong> an digitalen Umlaufbeschlüssen mitzuwirken.</p>
     <p>DRK Rundlaufbeschlüsse ist das Online-Tool, mit dem die Gremien des Deutschen Roten Kreuzes rechtssicher und transparent zwischen Sitzungen über Beschlussvorlagen abstimmen.</p>
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Einladung annehmen</a></p>
     <p style="font-size: 0.85rem; color: #6b7280; word-break: break-all;">Oder kopiere diesen Link in deinen Browser:<br>${link}</p>
     <p style="font-size: 0.85rem; color: #6b7280;">Nach dem Klick bist du direkt angemeldet – ein Passwort wird nicht benötigt. Der Link ist <strong>7 Tage</strong> gültig.</p>
     <p style="font-size: 0.85rem; color: #6b7280;">Falls du diese Einladung nicht erwartest, kannst du diese E-Mail einfach ignorieren – ohne Klick passiert nichts.</p>`,
  );
  await sendMail({ to: opts.to, subject: `Einladung zu ${opts.tenantName}`, text, html });
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
       <li><strong>Name:</strong> ${opts.tenantName}</li>
       <li><strong>Slug:</strong> ${opts.tenantSlug}</li>
       <li><strong>Angelegt von:</strong> ${opts.createdByEmail}</li>
     </ul>
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Moderations-Queue öffnen</a></p>`,
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
    `KV ${opts.tenantName} freigeschaltet`,
    `<p>Dein Kreisverband <strong>${opts.tenantName}</strong> wurde freigeschaltet. Du kannst jetzt Mitglieder einladen und Beschlüsse anlegen.</p>
     <p style="margin: 24px 0;"><a href="${link}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Zur Übersicht</a></p>`,
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
    `<p>Dein Antrag für den Kreisverband <strong>${opts.tenantName}</strong> wurde abgelehnt.</p>
     <p><strong>Begründung:</strong> ${opts.reason}</p>`,
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
}) {
  const fristStr = opts.fristEnde.toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const topInfo =
    typeof opts.topCount === "number"
      ? `${opts.topCount} Beschlussvorlage${opts.topCount === 1 ? "" : "n"} · `
      : "";
  const text = `Hallo,\n\nim Kreisverband "${opts.tenantName}" wurde ein neues Umlaufverfahren eröffnet:\n\n"${opts.resolutionTitle}"\n\n${topInfo}Frist: ${fristStr}\n\nZum Abstimmen:\n${opts.resolutionLink}`;
  const html = HTML_WRAPPER(
    `Neues Umlaufverfahren: ${opts.resolutionTitle}`,
    `<p>Im Kreisverband <strong>${opts.tenantName}</strong> wurde ein neues Umlaufverfahren eröffnet:</p>
     <p style="background: #fef2f2; padding: 12px 16px; border-left: 4px solid #e30613; border-radius: 4px;">
       <strong>${opts.resolutionTitle}</strong><br/>
       ${topInfo}Frist: ${fristStr}
     </p>
     <p style="margin: 24px 0;"><a href="${opts.resolutionLink}" style="background: #e30613; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Jetzt abstimmen</a></p>`,
  );
  await sendMail({
    to: opts.to,
    subject: `Umlaufverfahren: ${opts.resolutionTitle}`,
    text,
    html,
  });
}
