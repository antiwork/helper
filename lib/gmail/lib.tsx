import { Readable } from "stream";
import { render } from "@react-email/render";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import MailComposer from "nodemailer/lib/mail-composer";
import { db } from "@/db/client";
import { conversationMessages, conversations, files } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import AIReplyEmail from "@/lib/emails/aiReply";
import { getFileStream } from "@/lib/s3/utils";

export const convertConversationMessageToRaw = async (
  email: typeof conversationMessages.$inferSelect & {
    conversation: typeof conversations.$inferSelect & {
      emailFrom: string;
    };
    files: (typeof files.$inferSelect)[];
  },
  emailFrom: string,
  composerOptions?: ConstructorParameters<typeof MailComposer>[0],
) => {
  const attachments = await Promise.all(
    email.files
      .filter((file) => !file.isInline)
      .map(async (file) => {
        return {
          filename: file.name,
          content: Readable.from(await getFileStream(file.url)),
          contentType: file.mimetype,
        };
      }),
  );

  const lastEmailWithMessageId = await db.query.conversationMessages.findFirst({
    where: and(isNull(conversationMessages.deletedAt), isNotNull(conversationMessages.messageId)),
    orderBy: desc(conversationMessages.id),
  });

  let html;
  let text;

  if (email.role === "ai_assistant") {
    const reactEmail = <AIReplyEmail content={email.body ?? ""} />;
    html = await render(reactEmail);
    text = await render(reactEmail, { plainText: true });
  } else {
    html = email.body ?? undefined;
    const user = email.userId
      ? await db.query.authUsers.findFirst({ where: eq(authUsers.id, email.userId) })
      : undefined;
    if (html && user) {
      html += `<p>Best,<br />${user.user_metadata?.name}</p>`;
    }
    text = html ? htmlToText(html) : undefined;
  }

  const message = new MailComposer({
    from: emailFrom,
    to: email.conversation.emailFrom,
    subject: email.conversation.subject ?? undefined,
    cc: email.emailCc ?? [],
    bcc: email.emailBcc ?? [],
    inReplyTo: lastEmailWithMessageId?.messageId ?? undefined,
    references: lastEmailWithMessageId?.references ?? undefined,
    html,
    text,
    attachments,
    textEncoding: "base64",
    ...composerOptions,
  });

  const msg = await new Promise<Buffer>((resolve, reject) => {
    message.compile().build((err, msg) => {
      if (err) reject(err);
      else resolve(msg);
    });
  });

  return Buffer.from(msg).toString("base64url");
};
