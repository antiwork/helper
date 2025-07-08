import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { userFactory } from "@tests/support/factories/users";
import MailComposer from "nodemailer/lib/mail-composer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "@/lib/data/files";
import { convertConversationMessageToRaw } from "@/lib/gmail/lib";

beforeEach(() => {
  vi.useRealTimers();
});

vi.mock("@/lib/data/files", () => ({
  downloadFile: vi.fn(),
}));

const testComposerExtraOptions: ConstructorParameters<typeof MailComposer>[0] = {
  messageId: "test-message-id",
  // @ts-expect-error The types are missing this option (maybe because this doesn't need to be explicitly set generally)
  baseBoundary: "test-boundary",
};

describe("convertEmailToRaw", () => {
  it("properly converts a simple email", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);

    await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create({
      conversationProvider: "gmail",
      subject: "Conversation subject",
    });
    const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "Content",
    });

    const result = await convertConversationMessageToRaw(
      {
        ...message,
        conversation: {
          ...conversation,
          emailFrom: "to@example.com",
        },
        files: [],
      },
      "from@example.com",
      testComposerExtraOptions,
    );
    expect(result).toEqual(
      "RnJvbTogZnJvbUBleGFtcGxlLmNvbQ0KVG86IHRvQGV4YW1wbGUuY29tDQpTdWJqZWN0OiBDb252ZXJzYXRpb24gc3ViamVjdA0KTWVzc2FnZS1JRDogPHRlc3QtbWVzc2FnZS1pZD4NCkRhdGU6IFN1biwgMDEgSmFuIDIwMjMgMDA6MDA6MDAgKzAwMDANCk1JTUUtVmVyc2lvbjogMS4wDQpDb250ZW50LVR5cGU6IG11bHRpcGFydC9hbHRlcm5hdGl2ZTsgYm91bmRhcnk9Ii0tX05tUC10ZXN0LWJvdW5kYXJ5LVBhcnRfMSINCg0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzENCkNvbnRlbnQtVHlwZTogdGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOA0KQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogN2JpdA0KDQpDb250ZW50DQotLS0tX05tUC10ZXN0LWJvdW5kYXJ5LVBhcnRfMQ0KQ29udGVudC1UeXBlOiB0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IDdiaXQNCg0KQ29udGVudA0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzEtLQ0K",
    );

    const decodedResult = Buffer.from(result, "base64").toString("utf-8");
    expect(decodedResult).toContain("From: from@example.com");
    expect(decodedResult).toContain("To: to@example.com");
    expect(decodedResult).toContain("Subject: Conversation subject");
    expect(decodedResult).toContain("Date: Sun, 01 Jan 2023 00:00:00 +0000");
    expect(decodedResult).toContain("MIME-Version: 1.0");
    expect(decodedResult).toContain('Content-Type: multipart/alternative; boundary="--_NmP-test-boundary-Part_1"');
  });

  it("properly converts an email with cc/bcc info, a null subject, and an HTML body", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);
    const { conversation } = await conversationFactory.create({
      conversationProvider: "gmail",
      subject: null,
    });
    const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "<p>Content 1</p><p>Content 2</p>",
      emailCc: ["cc1@example.com", "cc2@example.com"],
      emailBcc: ["bcc@example.com"],
    });

    const result = await convertConversationMessageToRaw(
      {
        ...message,
        conversation: {
          ...conversation,
          emailFrom: "to@example.com",
        },
        files: [],
      },
      "from@example.com",
      testComposerExtraOptions,
    );
    expect(result).toEqual(
      "RnJvbTogZnJvbUBleGFtcGxlLmNvbQ0KVG86IHRvQGV4YW1wbGUuY29tDQpDYzogY2MxQGV4YW1wbGUuY29tLCBjYzJAZXhhbXBsZS5jb20NCk1lc3NhZ2UtSUQ6IDx0ZXN0LW1lc3NhZ2UtaWQ-DQpEYXRlOiBTdW4sIDAxIEphbiAyMDIzIDAwOjAwOjAwICswMDAwDQpNSU1FLVZlcnNpb246IDEuMA0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSItLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzEiDQoNCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8xDQpDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLTgNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IDdiaXQNCg0KQ29udGVudCAxCgpDb250ZW50IDINCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8xDQpDb250ZW50LVR5cGU6IHRleHQvaHRtbDsgY2hhcnNldD11dGYtOA0KQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogN2JpdA0KDQo8cD5Db250ZW50IDE8L3A-PHA-Q29udGVudCAyPC9wPg0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzEtLQ0K",
    );

    const decodedResult = Buffer.from(result, "base64").toString("utf-8");
    expect(decodedResult).toContain("Cc: cc1@example.com, cc2@example.com");
    expect(decodedResult).not.toContain("Bcc: bcc@example.com");
    expect(decodedResult).toContain("<p>Content 1</p><p>Content 2</p>");
  });

  it("properly converts a follow-up email on a conversation", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);

    const { conversation } = await conversationFactory.create({
      conversationProvider: "gmail",
      subject: null,
    });

    await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "<p>Content 1</p><p>Content 2</p>",
      emailCc: ["cc1@example.com", "cc2@example.com"],
      emailBcc: ["bcc@example.com"],
      messageId: "<message-id>",
      references: "<references>",
      status: "sent",
    });

    const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "Content",
    });

    const result = await convertConversationMessageToRaw(
      {
        ...message,
        conversation: {
          ...conversation,
          emailFrom: "to@example.com",
        },
        files: [],
      },
      "from@example.com",
      testComposerExtraOptions,
    );
    expect(result).toEqual(
      "RnJvbTogZnJvbUBleGFtcGxlLmNvbQ0KVG86IHRvQGV4YW1wbGUuY29tDQpJbi1SZXBseS1UbzogPG1lc3NhZ2UtaWQ-DQpSZWZlcmVuY2VzOiA8cmVmZXJlbmNlcz4NCk1lc3NhZ2UtSUQ6IDx0ZXN0LW1lc3NhZ2UtaWQ-DQpEYXRlOiBTdW4sIDAxIEphbiAyMDIzIDAwOjAwOjAwICswMDAwDQpNSU1FLVZlcnNpb246IDEuMA0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSItLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzEiDQoNCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8xDQpDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLTgNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IDdiaXQNCg0KQ29udGVudA0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzENCkNvbnRlbnQtVHlwZTogdGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04DQpDb250ZW50LVRyYW5zZmVyLUVuY29kaW5nOiA3Yml0DQoNCkNvbnRlbnQNCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8xLS0NCg",
    );

    const decodedResult = Buffer.from(result, "base64").toString("utf-8");
    expect(decodedResult).toContain("Message-ID: <test-message-id>");
    expect(decodedResult).toContain("In-Reply-To: <message-id>");
    expect(decodedResult).toContain("References: <references>");
  });

  it("properly converts an email with attachments", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);
    const mockFileContent = Buffer.from("mock file content", "utf-8");
    vi.mocked(downloadFile).mockResolvedValue(
      new Uint8Array(mockFileContent.buffer, mockFileContent.byteOffset, mockFileContent.byteLength),
    );
    const { conversation } = await conversationFactory.create({
      conversationProvider: "gmail",
      subject: "With attachments",
    });

    const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "Content",
    });

    const { file: file1 } = await fileFactory.create(null, {
      isInline: true,
      name: "file1.pdf",
      key: "attachments/file1.pdf",
      mimetype: "text/plain",
    });
    const { file: file2 } = await fileFactory.create(null, {
      isInline: false,
      name: "file2.jpg",
      key: "attachments/file2.jpg",
      mimetype: "image/jpeg",
    });

    const result = await convertConversationMessageToRaw(
      {
        ...message,
        conversation: {
          ...conversation,
          emailFrom: "to@example.com",
        },
        files: [file1, file2],
      },
      "from@example.com",
      testComposerExtraOptions,
    );

    expect(Buffer.from(result, "base64").toString("utf-8")).toEqual(
      `From: from@example.com
To: to@example.com
Subject: With attachments
Message-ID: <test-message-id>
Date: Sun, 01 Jan 2023 00:00:00 +0000
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="--_NmP-test-boundary-Part_1"

----_NmP-test-boundary-Part_1
Content-Type: multipart/alternative; boundary="--_NmP-test-boundary-Part_2"

----_NmP-test-boundary-Part_2
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Content
----_NmP-test-boundary-Part_2
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit

Content
----_NmP-test-boundary-Part_2--

----_NmP-test-boundary-Part_1
Content-Type: image/jpeg; name=file2.jpg
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename=file2.jpg

bW9jayBmaWxlIGNvbnRlbnQ=
----_NmP-test-boundary-Part_1--
`.replaceAll("\n", "\r\n"),
    );

    expect(downloadFile).toHaveBeenCalledWith(expect.objectContaining({ key: "attachments/file2.jpg" }));
    expect(downloadFile).toHaveBeenCalledTimes(1);
  });
});
