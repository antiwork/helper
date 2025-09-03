import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { StoredToolParameter, storedTools } from "@/db/schema";
import { tools } from "@/db/schema/tools";
import { callServerSideTool } from "@/lib/ai/tools";
import { fetchStoredTools } from "@/lib/data/storedTool";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { callToolApi, ToolApiError } from "@/lib/tools/apiTool";
import { conversationProcedure } from "./procedure";

export const toolsRouter = {
  list: conversationProcedure.query(async ({ ctx }) => {
    const { conversation } = ctx;

    const mailboxTools = await db.query.tools.findMany({
      where: eq(tools.enabled, true),
    });

    const suggested = (conversation.suggestedActions ?? []).map((action) => {
      switch (action.type) {
        case "close":
          return { type: "close" as const };
        case "spam":
          return { type: "spam" as const };
        case "assign":
          return { type: "assign" as const, userId: action.userId };
        case "tool":
          const { slug, parameters } = action;
          const tool = mailboxTools.find((t) => t.slug === slug);
          if (!tool) {
            throw new Error(`Tool not found: ${slug}`);
          }
          return {
            type: "tool" as const,
            tool: {
              name: tool.name,
              slug: tool.slug,
              description: tool.description,
              parameters,
            },
          };
      }
    });

    const clientTools = await fetchStoredTools(conversation.emailFrom);

    return {
      suggested,
      all: [
        ...mailboxTools.map((tool) => ({
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          parameterTypes: tool.parameters ?? [],
          customerEmailParameter: tool.customerEmailParameter,
        })),
        ...clientTools.map((tool) => ({
          name: tool.name,
          slug: tool.name,
          description: tool.description,
          parameterTypes: tool.parameters?.map((param) => ({ ...param, required: !param.optional })) ?? [],
          customerEmailParameter: null,
        })),
      ],
    };
  }),

  run: conversationProcedure
    .input(
      z.object({
        tool: z.string(),
        params: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tool: toolSlug, params } = input;
      const conversation = ctx.conversation;

      const tool = await db.query.tools.findFirst({
        where: and(eq(tools.slug, toolSlug), eq(tools.enabled, true)),
      });

      const whereCustomerEmail = conversation.emailFrom
        ? eq(storedTools.customerEmail, conversation.emailFrom)
        : undefined;

      const whereClause = whereCustomerEmail
        ? or(whereCustomerEmail, isNull(storedTools.customerEmail))
        : isNull(storedTools.customerEmail);

      const cachedTool = await db.query.storedTools.findFirst({
        where: and(eq(storedTools.name, toolSlug), whereClause),
      });

      try {
        if (tool) {
          return await callToolApi(conversation, tool, params);
        } else if (cachedTool) {
          return await callServerSideTool({
            tool: {
              ...cachedTool,
              parameters: cachedTool.parameters.reduce<Record<string, StoredToolParameter>>(
                (acc, param) => ({ ...acc, [param.name]: param }),
                {},
              ),
            },
            toolName: toolSlug,
            conversationId: conversation.id,
            email: conversation.emailFrom,
            params,
            mailbox: ctx.mailbox,
          });
        }
        throw new TRPCError({ code: "NOT_FOUND" });
      } catch (error) {
        if (error instanceof ToolApiError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        captureExceptionAndLog(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error executing tool",
        });
      }
    }),
};
