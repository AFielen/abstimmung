/**
 * Pure, seiteneffektfreie Logik für die Halbzeit-Erinnerung. Bewusst ohne
 * DB-/Mail-Abhängigkeiten, damit unabhängig testbar (lib/reminders.test.ts).
 */

/** True, sobald `now` den Halbzeit-Zeitpunkt (Mitte zwischen Start und Frist)
 *  erreicht oder überschritten hat. False, wenn kein Start oder entartete Frist. */
export function isPastHalftime(
  startedAt: Date | null,
  fristEnde: Date,
  now: Date,
): boolean {
  if (!startedAt) return false;
  const start = startedAt.getTime();
  const end = fristEnde.getTime();
  if (!(end > start)) return false;
  const halftime = start + (end - start) / 2;
  return now.getTime() >= halftime;
}

export type ReminderKind = "skip" | "vote_reminder" | "invite_reminder";

/** Stuft einen Stimmberechtigten zur Halbzeit ein. */
export function classifyVoter(input: {
  membershipStatus: "active" | "invited" | "removed" | null;
  voteCount: number;
  topCount: number;
  inviteEmailSentAt: Date | null;
  halftime: Date;
}): ReminderKind {
  const { membershipStatus, voteCount, topCount, inviteEmailSentAt, halftime } = input;

  if (membershipStatus !== "active" && membershipStatus !== "invited") return "skip";
  if (topCount <= 0) return "skip";
  if (voteCount >= topCount) return "skip"; // vollständig abgestimmt

  if (membershipStatus === "invited") return "invite_reminder";

  // membershipStatus === "active": Guard gegen späten Beitritt.
  // Wer erst nach der Halbzeit benachrichtigt wurde (gerade beigetreten),
  // wird übersprungen. NULL (Versand beim Beitritt fehlgeschlagen) bleibt
  // erinnerbar als Sicherheitsnetz.
  if (inviteEmailSentAt && inviteEmailSentAt.getTime() >= halftime.getTime()) {
    return "skip";
  }
  return "vote_reminder";
}
