"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";
import { createMagicToken } from "@/lib/auth/magic";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendLoginLink, sendRegisterLink } from "@/lib/mail/templates";

const schema = z.object({
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben").transform((v) => v.trim().toLowerCase()),
});

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
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }
  const email = parsed.data.email;

  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const user = existing[0];

  if (user) {
    const { raw } = await createMagicToken({
      email,
      purpose: "login",
      userId: user.id,
    });
    await sendLoginLink({ to: { email, name: user.name ?? undefined }, rawToken: raw });
  } else {
    // Erstkontakt: lege Account an (ohne Memberships) und schicke Bestätigungslink
    const inserted = await db
      .insert(users)
      .values({ email })
      .returning({ id: users.id });
    const { raw } = await createMagicToken({
      email,
      purpose: "register",
      userId: inserted[0].id,
    });
    await sendRegisterLink({ to: { email }, rawToken: raw });
  }

  return {
    ok: true,
    message: "Wir haben dir einen Magic-Link geschickt. Bitte E-Mail-Postfach prüfen.",
    email,
  };
}
