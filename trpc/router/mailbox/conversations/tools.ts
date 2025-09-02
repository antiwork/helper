import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema";
import { tools } from "@/db/schema/tools";
import { fetchClientTools } from "@/lib/data/clientTool";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { callCachedToolApi, callToolApi, ToolApiError } from "@/lib/tools/apiTool";
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

    const clientTools = await fetchClientTools(conversation.emailFrom);

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
          parameterTypes: tool.parameters ?? [],
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
        ? eq(clientTools.customerEmail, conversation.emailFrom)
        : undefined;

      const whereClause = whereCustomerEmail
        ? or(whereCustomerEmail, isNull(clientTools.customerEmail))
        : isNull(clientTools.customerEmail);

      const cachedTool = await db.query.clientTools.findFirst({
        where: and(eq(clientTools.name, toolSlug), whereClause),
      });

      if (!tool && !cachedTool) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      try {
        if (tool) {
          return await callToolApi(conversation, tool, params);
        } else {
          return await callCachedToolApi(conversation, assertDefined(cachedTool), params);
        }
      } catch (error) {
        if (error instanceof ToolApiError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        captureExceptionAndLog(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error executing tool",
        });
      }
    }),
};
