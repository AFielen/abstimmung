type MailjetRecipient = { Email: string; Name?: string };

type MailjetMessage = {
  From: { Email: string; Name?: string };
  To: MailjetRecipient[];
  Subject: string;
  TextPart: string;
  HTMLPart?: string;
};

type MailjetResponse = {
  Messages?: Array<{
    Status: string;
    Errors?: Array<{ ErrorMessage: string; ErrorCode: string }>;
  }>;
};

const MAILJET_URL = "https://api.mailjet.com/v3.1/send";

function getAuthHeader(): string {
  const key = process.env.MAILJET_API_KEY;
  const secret = process.env.MAILJET_API_SECRET;
  if (!key || !secret) {
    throw new Error("MAILJET_API_KEY und MAILJET_API_SECRET müssen gesetzt sein");
  }
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

function getDefaultSender() {
  const email = process.env.MAIL_FROM_EMAIL;
  const name = process.env.MAIL_FROM_NAME;
  if (!email) throw new Error("MAIL_FROM_EMAIL muss gesetzt sein");
  return { Email: email, Name: name ?? "DRK" };
}

export async function sendMail(opts: {
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const message: MailjetMessage = {
    From: getDefaultSender(),
    To: [{ Email: opts.to.email, Name: opts.to.name }],
    Subject: opts.subject,
    TextPart: opts.text,
    HTMLPart: opts.html,
  };

  const res = await fetch(MAILJET_URL, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: [message] }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailjet HTTP ${res.status}: ${body}`);
  }

  const data: MailjetResponse = await res.json();
  const status = data.Messages?.[0]?.Status;
  if (status && status.toLowerCase() !== "success") {
    const errs = data.Messages?.[0]?.Errors?.map((e) => e.ErrorMessage).join(", ");
    throw new Error(`Mailjet Versand fehlgeschlagen: ${status} (${errs})`);
  }
}
