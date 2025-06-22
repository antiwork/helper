import { parseEmailAddress } from "@/lib/emails";

export const parseEmailList = (
  emailsString: string,
  onEncounterInvalidAction?: (invalidEmail: string) => void,
): string[] | null => {
  const emailInputs = emailsString
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const validEmails: string[] = [];

  for (const email of emailInputs) {
    const parsedEmail = parseEmailAddress(email);
    if (!parsedEmail) {
      onEncounterInvalidAction?.(email);
      return null;
    }
    validEmails.push(parsedEmail.address);
  }
  return validEmails;
};
