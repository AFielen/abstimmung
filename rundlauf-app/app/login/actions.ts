"use server";

import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createMagicToken } from "@/lib/auth/magic";
import { db } from "@/lib/db";
import { magicTokens, users } from "@/lib/db/schema";
import { sendLoginLink, sendRegisterLink } from "@/lib/mail/templates";
import { invalidInput } from "@/lib/action-helpers";

const schema = z.object({
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben").transform((v) => v.trim().toLowerCase()),
});

// Pro Adresse höchstens 3 Links in 15 Minuten. Caddy limitiert pro IP; dies
// begrenzt das Mailvolumen pro Empfänger unabhängig von der Quell-IP.
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_MAX_PER_WINDOW = 3;

export type LoginActionState = {
  ok: boolean;
  message?: string;
  email?: string;
};

export async function requestMagicLink(
  _prev: LoginActionState | null,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return invalidInput(parsed.error);
  const email = parsed.data.email;
  // Rücksprungziel (z. B. Beschluss-Link aus einer Mail): nur relative Pfade.
  const rawNext = formData.get("next");
  const next =
    typeof rawNext === "string" && /^\/(?!\/)/.test(rawNext) && rawNext.length <= 300
      ? rawNext
      : undefined;

  const windowStart = new Date(Date.now() - MAGIC_LINK_WINDOW_MS);
  const recent = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(magicTokens)
    .where(
      and(
        eq(magicTokens.email, email),
        inArray(magicTokens.purpose, ["login", "register"]),
        gt(magicTokens.createdAt, windowStart),
      ),
    );
  if ((recent[0]?.c ?? 0) >= MAGIC_LINK_MAX_PER_WINDOW) {
    // Gleiche Antwort für bekannte und unbekannte Adressen – kein Enumerieren.
    return {
      ok: false,
      message:
        "Zu viele Anmelde-Links angefordert. Bitte prüfe dein Postfach (auch Spam) oder versuche es in 15 Minuten erneut.",
    };
  }

  // Ein neuer Link macht ältere, noch nicht genutzte Anmelde-Links dieser
  // Adresse unwirksam (so auch auf der Hilfe-Seite zugesagt).
  await db
    .update(magicTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(magicTokens.email, email),
        inArray(magicTokens.purpose, ["login", "register"]),
        isNull(magicTokens.consumedAt),
      ),
    );

  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const user = existing[0];

  try {
    if (user) {
      const { raw } = await createMagicToken({
        email,
        purpose: "login",
        userId: user.id,
      });
      await sendLoginLink({ to: { email, name: user.name ?? undefined }, rawToken: raw, next });
    } else {
      // Erstkontakt: noch kein users-Eintrag – der entsteht erst beim Einlösen
      // des Bestätigungslinks (app/auth/magic/[token]/route.ts). Unbestätigte
      // Anfragen für fremde Adressen hinterlassen so keine Datensätze.
      const { raw } = await createMagicToken({ email, purpose: "register" });
      await sendRegisterLink({ to: { email }, rawToken: raw });
    }
  } catch (err) {
    console.error("[login] mail send failed", err);
    return {
      ok: false,
      message:
        "Die E-Mail konnte gerade nicht versendet werden. Bitte versuche es in ein paar Minuten noch einmal.",
    };
  }

  return {
    ok: true,
    message: "Wir haben dir einen Anmelde-Link geschickt. Bitte prüfe dein E-Mail-Postfach (auch den Spam-Ordner).",
    email,
  };
}
