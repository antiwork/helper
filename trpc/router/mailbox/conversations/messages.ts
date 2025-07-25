import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, exists, gte, inArray, isNotNull, isNull, lte, not, sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, files } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { createReply, sanitizeBody } from "@/lib/data/conversationMessage";
import { formatAttachments } from "@/lib/data/files";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { mailboxProcedure } from "../../mailbox/procedure";
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
      await triggerEvent("conversations/auto-response.create", {
        messageId: id,
      });
      return {
        id,
        attachments: await formatAttachments(await db.query.files.findMany({ where: inArray(files.messageId, [id]) })),
      };
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
  reactionCount: mailboxProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date().optional(),
        period: z.enum(["hourly", "daily", "monthly"]),
      }),
    )
    .query(async ({ input }) => {
      const groupByFormat = (() => {
        switch (input.period) {
          case "hourly":
            return "YYYY-MM-DD HH24:00:00";
          case "daily":
            return "YYYY-MM-DD";
          case "monthly":
            return "YYYY-MM";
        }
      })();

      const dateFilter = input.endDate
        ? and(
            gte(conversationMessages.reactionCreatedAt, input.startDate),
            lte(conversationMessages.reactionCreatedAt, input.endDate),
          )
        : gte(conversationMessages.reactionCreatedAt, input.startDate);

      const data = await db
        .select({
          timePeriod: sql<string>`to_char(${conversationMessages.reactionCreatedAt}, ${groupByFormat}) AS period`,
          reactionType: conversationMessages.reactionType,
          count: sql<number | string>`count(*)`,
        })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
        .where(and(dateFilter, isNotNull(conversationMessages.reactionType), isNull(conversationMessages.deletedAt)))
        .groupBy(sql`period`, conversationMessages.reactionType);

      return data.map(({ count, ...rest }) => ({
        ...rest,
        count: Number(count),
      }));
    }),
  statusByTypeCount: mailboxProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const createdAtFilter = input.endDate
        ? and(gte(conversations.createdAt, input.startDate), lte(conversations.createdAt, input.endDate))
        : gte(conversations.createdAt, input.startDate);

      const results = await Promise.all([
        db
          .$count(conversations, and(eq(conversations.status, "open"), createdAtFilter))
          .then((count) => ({ type: "open", count })),

        db
          .$count(
            conversations,
            and(
              eq(conversations.status, "closed"),
              createdAtFilter,
              exists(
                db
                  .select()
                  .from(conversationMessages)
                  .where(
                    and(
                      eq(conversationMessages.conversationId, conversations.id),
                      eq(conversationMessages.role, "ai_assistant"),
                      eq(conversationMessages.status, "sent"),
                      isNull(conversationMessages.deletedAt),
                    ),
                  ),
              ),
              not(
                exists(
                  db
                    .select()
                    .from(conversationMessages)
                    .where(
                      and(
                        eq(conversationMessages.conversationId, conversations.id),
                        eq(conversationMessages.role, "staff"),
                        isNull(conversationMessages.deletedAt),
                      ),
                    ),
                ),
              ),
            ),
          )
          .then((count) => ({ type: "ai", count })),

        db
          .$count(
            conversations,
            and(
              eq(conversations.status, "closed"),
              createdAtFilter,
              exists(
                db
                  .select()
                  .from(conversationMessages)
                  .where(
                    and(
                      eq(conversationMessages.conversationId, conversations.id),
                      eq(conversationMessages.role, "staff"),
                      isNull(conversationMessages.deletedAt),
                    ),
                  ),
              ),
            ),
          )
          .then((count) => ({ type: "human", count })),
      ]);

      return results;
    }),
} satisfies TRPCRouterRecord;
