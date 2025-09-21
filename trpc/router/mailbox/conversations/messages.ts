import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { createReply, sanitizeBody } from "@/lib/data/conversationMessage";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { conversationProcedure } from "./procedure";

export const messagesRouter = {
  previousReplies: conversationProcedure.query(async ({ ctx }) => {
    let conversation = ctx.conversation;
    if (!conversation.embeddingText) {
      conversation = await createConversationEmbedding(conversation.id);
    }

    const similarConversations = await findSimilarConversations(
      assertDefined(conversation.embedding),
      5,
      conversation.slug,
    );

    if (!similarConversations?.length) return [];

    const replies = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.role, "staff"),
        eq(conversationMessages.status, "sent"),
        isNull(conversationMessages.deletedAt),
        inArray(
          conversationMessages.conversationId,
          similarConversations.map((c) => c.id),
        ),
      ),
      orderBy: [sql`${conversationMessages.createdAt} desc`],
      limit: 10,
      with: {
        conversation: {
          columns: {
            subject: true,
          },
        },
      },
    });

    return Promise.all(
      replies.map(async (reply) => ({
        id: reply.id.toString(),
        content: await sanitizeBody(reply.body ?? ""),
        cleanedUpText: reply.cleanedUpText ?? "",
        timestamp: reply.createdAt.toISOString(),
        conversationSubject: reply.conversation.subject,
        similarity: similarConversations.find((c) => c.id === reply.conversationId)?.similarity ?? 0,
      })),
    );
  }),
  reply: conversationProcedure
    .input(
      z.object({
        message: z.string(),
        fileSlugs: z.array(z.string()),
        cc: z.array(z.string().email()),
        bcc: z.array(z.string().email()),
        shouldAutoAssign: z.boolean().optional().default(true),
        shouldClose: z.boolean().optional().default(true),
        responseToId: z.number().nullable(),
      }),
    )
    .mutation(async ({ input: { message, fileSlugs, cc, bcc, shouldAutoAssign, shouldClose, responseToId }, ctx }) => {
      const id = await createReply({
        conversationId: ctx.conversation.id,
        user: ctx.user,
        message,
        fileSlugs,
        cc,
        bcc,
        shouldAutoAssign,
        close: shouldClose,
        responseToId,
      });
      return { id };
    }),
  flagAsBad: conversationProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, reason } = input;

      const updatedMessage = await db
        .update(conversationMessages)
        .set({
          isFlaggedAsBad: true,
          reason: reason || null,
        })
        .where(
          and(
            eq(conversationMessages.id, id),
            eq(conversationMessages.conversationId, ctx.conversation.id),
            eq(conversationMessages.role, "ai_assistant"),
            isNull(conversationMessages.deletedAt),
          ),
        )
        .returning({ id: conversationMessages.id });

      if (updatedMessage.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found or not part of this conversation",
        });
      }

      await triggerEvent("messages/flagged.bad", {
        messageId: id,
        reason: reason || null,
      });
    }),
} satisfies TRPCRouterRecord;
