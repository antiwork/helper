import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { refreshConversationDraft } from "@/inngest/functions/refreshConversationDraft";
import { conversationChannelId } from "@/lib/ably/channels";
import { publishToAbly } from "@/lib/ably/client";
import { generateDraftResponse } from "@/lib/ai/generateResponse";
import { serializeResponseAiDraft } from "@/lib/data/conversationMessage";
import * as sentryUtils from "@/lib/shared/sentry";
import { PromptInfo } from "@/types/conversationMessages";

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
    createFunction: vi.fn(),
  },
}));

vi.mock("@/lib/ai/generateResponse");
vi.mock("@/lib/ably/client", () => ({
  publishToAbly: vi.fn(),
}));

vi.mock("@sentry/nextjs");
vi.spyOn(sentryUtils, "captureExceptionAndThrowIfDevelopment");

describe("refreshConversationDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a new draft when no previous draft exists", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const { message: lastUserMessage } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "What's the status of my order?",
    });

    const newDraftContent = "New draft content";
    const promptInfo: PromptInfo = {
      base_prompt: "Some base prompt",
      pinned_replies: "Some pinned replies",
      past_conversations: "Some past conversations",
      metadata: "Some metadata",
    };

    vi.mocked(generateDraftResponse).mockResolvedValue({
      draftResponse: newDraftContent,
      promptInfo,
    });

    await refreshConversationDraft(conversation.slug);

    const newDraft = await db.query.conversationMessages.findFirst({
      where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.status, "draft")),
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    });

    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationChannelId(mailbox.slug, conversation.slug),
      event: "draft.updated",
      data: serializeResponseAiDraft(assertDefined(newDraft), mailbox),
    });

    expect(newDraft).toMatchObject({
      conversationId: conversation.id,
      responseToId: lastUserMessage.id,
      body: newDraftContent,
      role: "ai_assistant",
      status: "draft",
      metadata: null,
    });
  });

  it("refreshes an existing draft successfully", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastAiGeneratedDraft } = await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant",
      status: "draft",
      body: "Old draft content",
    });

    const { message: lastUserMessage } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "What's the status of my order?",
    });

    const newDraftContent = "New draft content";
    const promptInfo: PromptInfo = {
      base_prompt: "Some base prompt",
      pinned_replies: "Some pinned replies",
      past_conversations: "Some past conversations",
      metadata: "Some metadata",
    };

    vi.mocked(generateDraftResponse).mockResolvedValue({
      draftResponse: newDraftContent,
      promptInfo,
    });

    await refreshConversationDraft(conversation.slug);

    const updatedDraft = await db.query.conversationMessages.findFirst({
      where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.status, "draft")),
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    });

    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationChannelId(mailbox.slug, conversation.slug),
      event: "draft.updated",
      data: serializeResponseAiDraft(assertDefined(updatedDraft), mailbox),
    });

    expect(updatedDraft).toMatchObject({
      conversationId: conversation.id,
      responseToId: lastUserMessage.id,
      body: newDraftContent,
      role: "ai_assistant",
      status: "draft",
      metadata: null,
    });

    const updatedLastAiGeneratedDraft = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, lastAiGeneratedDraft.id),
    });
    expect(updatedLastAiGeneratedDraft?.status).toBe("discarded");
  });

  it("throws an error when conversation is not found", async () => {
    await expect(refreshConversationDraft("non-existent-slug")).rejects.toThrow();
  });

  it("throws an error when last user message is not found", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    await expect(refreshConversationDraft(conversation.slug)).rejects.toThrow();
  });

  it("captures exception with Sentry and publishes error message when an error occurs", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant",
      status: "draft",
      body: "Old draft content",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "What's the status of my order?",
    });

    const error = new Error("Test error");
    vi.mocked(generateDraftResponse).mockRejectedValue(error);
    vi.mocked(sentryUtils.captureExceptionAndThrowIfDevelopment).mockImplementation(() => {});

    await refreshConversationDraft(conversation.slug);

    expect(sentryUtils.captureExceptionAndThrowIfDevelopment).toHaveBeenCalledWith(error);
    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationChannelId(mailbox.slug, conversation.slug),
      event: "draft.error",
      data: "refresh ai draft failed",
    });
  });
});
