import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { toolsFactory } from "@tests/support/factories/tools";
import { userFactory } from "@tests/support/factories/users";
import { getTableName, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { gmailSupportEmails, tools } from "@/db/schema";

describe("encryptedField", () => {
  it("properly encrypts and decrypts the specified columns", async () => {
    const testAccessToken = "testAccessToken";
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
      email: "test@example.com",
      accessToken: testAccessToken,
    });

    expect(
      await db.query.gmailSupportEmails.findFirst({
        where: (gmailSupportEmails, { eq }) => eq(gmailSupportEmails.id, gmailSupportEmail.id),
      }),
    ).toMatchObject({
      email: "test@example.com",
      accessToken: testAccessToken,
    });

    const rawDbValues = await db.execute(
      sql`SELECT ${gmailSupportEmails.email}, ${gmailSupportEmails.accessToken} FROM ${sql.identifier(getTableName(gmailSupportEmails))} WHERE id = ${gmailSupportEmail.id}`,
    );

    expect(rawDbValues.rows[0]?.email).toBe("test@example.com");
    expect(rawDbValues.rows[0]?.accessToken).not.toBe(testAccessToken);

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const messageBody =
      "Of course! I'm here to help. Could you please provide more details about the issue or question you have? The more information you can provide, the better I'll be able to assist you.";
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: messageBody,
    });

    expect(message.body).toEqual(messageBody);
  });
});

describe("nativeEncryptedField", () => {
  it("properly encrypts and decrypts", async () => {
    const testAuthToken = "testAuthToken123";
    const { mailbox } = await userFactory.createRootUser();
    const { tool } = await toolsFactory.create({
      name: "Test Tool",
      authenticationToken: testAuthToken,
      mailboxId: mailbox.id,
    });

    const fetchedTool = await db.query.tools.findFirst({
      where: (tools, { eq }) => eq(tools.id, tool.id),
    });

    expect(fetchedTool).toMatchObject({
      name: "Test Tool",
      authenticationToken: testAuthToken,
    });

    const rawDbValues = await db.execute(
      sql`SELECT ${tools.name}, ${tools.authenticationToken} FROM ${sql.identifier(getTableName(tools))} WHERE id = ${tool.id}`,
    );

    expect(rawDbValues.rows[0]?.name).toBe("Test Tool");
    expect(rawDbValues.rows[0]?.authenticationToken).not.toBe(testAuthToken);

    const decryptedTool = await db.query.tools.findFirst({
      where: (tools, { eq }) => eq(tools.id, tool.id),
      columns: {
        authenticationToken: true,
      },
    });

    expect(decryptedTool?.authenticationToken).toBe(testAuthToken);
  });
});
