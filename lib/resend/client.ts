import { randomUUID } from "crypto";
import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (
  payload: Parameters<typeof resend.emails.send>[0],
  options?: Parameters<typeof resend.emails.send>[1],
) => {
  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`'sendEmail' only runs in production: ${JSON.stringify(payload)}`);
    return;
  }
  return await resend.emails.send(
    {
      ...payload,
      headers: {
        ...payload.headers,
        // Prevents Gmail from threading emails
        // https://github.com/resend/resend-examples/tree/main/with-prevent-thread-on-gmail
        "X-Entity-Ref-ID": randomUUID(),
      },
    },
    options,
  );
};
