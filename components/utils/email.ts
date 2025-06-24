import { z } from "zod";

export const parseEmailList = (emailsString: string) => {
  const splitEmails = emailsString
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const emailSchema = z.array(z.string().email());

  const result = emailSchema.safeParse(splitEmails, {
    errorMap: (issue, ctx) => {
      if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === "email") {
        // we return the individual wrong email addresses in the error message,
        // so that caller may display the full list.
        return {
          message: `"${ctx.data}"`,
        };
      }
      return { message: ctx.defaultError };
    },
  });

  return result;
};
