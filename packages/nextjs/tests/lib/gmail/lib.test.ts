import { Readable } from "stream";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { userFactory } from "@tests/support/factories/users";
import MailComposer from "nodemailer/lib/mail-composer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertConversationMessageToRaw } from "@/lib/gmail/lib";
import { getFileStream } from "@/lib/s3/utils";

beforeEach(() => {
  vi.useRealTimers();
});

vi.mock("@/lib/s3/utils", () => ({
  getFileStream: vi.fn(),
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

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
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

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
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

    const { mailbox } = await userFactory.createRootUser();

    const { conversation } = await conversationFactory.create(mailbox.id, {
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
    vi.mocked(getFileStream).mockResolvedValue(Readable.from(Buffer.from("mock file content")));

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      conversationProvider: "gmail",
      subject: "With attachments",
    });

    const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
      body: "Content",
    });

    const { file: file1 } = await fileFactory.create(null, {
      isInline: true,
      name: "file1.pdf",
      url: "https://your-bucket-name.s3.amazonaws.com/attachments/file1.pdf",
      mimetype: "text/plain",
    });
    const { file: file2 } = await fileFactory.create(null, {
      isInline: false,
      name: "file2.jpg",
      url: "https://your-bucket-name.s3.amazonaws.com/attachments/file2.jpg",
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

    expect(result).toEqual(
      "RnJvbTogZnJvbUBleGFtcGxlLmNvbQ0KVG86IHRvQGV4YW1wbGUuY29tDQpTdWJqZWN0OiBXaXRoIGF0dGFjaG1lbnRzDQpNZXNzYWdlLUlEOiA8dGVzdC1tZXNzYWdlLWlkPg0KRGF0ZTogU3VuLCAwMSBKYW4gMjAyMyAwMDowMDowMCArMDAwMA0KTUlNRS1WZXJzaW9uOiAxLjANCkNvbnRlbnQtVHlwZTogbXVsdGlwYXJ0L21peGVkOyBib3VuZGFyeT0iLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8xIg0KDQotLS0tX05tUC10ZXN0LWJvdW5kYXJ5LVBhcnRfMQ0KQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7IGJvdW5kYXJ5PSItLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzIiDQoNCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8yDQpDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLTgNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IDdiaXQNCg0KQ29udGVudA0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzINCkNvbnRlbnQtVHlwZTogdGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04DQpDb250ZW50LVRyYW5zZmVyLUVuY29kaW5nOiA3Yml0DQoNCkNvbnRlbnQNCi0tLS1fTm1QLXRlc3QtYm91bmRhcnktUGFydF8yLS0NCg0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzENCkNvbnRlbnQtVHlwZTogaW1hZ2UvanBlZzsgbmFtZT1maWxlMi5qcGcNCkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IGJhc2U2NA0KQ29udGVudC1EaXNwb3NpdGlvbjogYXR0YWNobWVudDsgZmlsZW5hbWU9ZmlsZTIuanBnDQoNCmJXOWpheUJtYVd4bElHTnZiblJsYm5RPQ0KLS0tLV9ObVAtdGVzdC1ib3VuZGFyeS1QYXJ0XzEtLQ0K",
    );

    expect(getFileStream).toHaveBeenCalledWith("https://your-bucket-name.s3.amazonaws.com/attachments/file2.jpg");
    expect(getFileStream).toHaveBeenCalledTimes(1);

    const decodedResult = Buffer.from(result, "base64").toString("utf-8");
    expect(decodedResult).toContain(Buffer.from("mock file content").toString("base64"));
    expect(decodedResult).toContain("Content-Type: multipart/mixed");
    expect(decodedResult).toContain(`Content-Type: ${file2.mimetype}`);
    expect(decodedResult).toContain("Content-Transfer-Encoding: base64");
    expect(decodedResult).toContain("Content-Disposition: attachment");
  });
});
