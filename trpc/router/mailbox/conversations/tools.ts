import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { tools } from "@/db/schema/tools";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { callToolApi, ToolApiError } from "@/lib/tools/apiTool";
import { conversationProcedure } from "./procedure";

export const toolsRouter = {
  list: conversationProcedure.query(async ({ ctx }) => {
    const { conversation, mailbox } = ctx;

    const mailboxTools = await db.query.tools.findMany({
      where: and(eq(tools.enabled, true)),
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

    return {
      suggested,
      all: mailboxTools.map((tool) => ({
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        parameterTypes: tool.parameters ?? [],
        customerEmailParameter: tool.customerEmailParameter,
      })),
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

      if (!tool) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      try {
        return await callToolApi(conversation, tool, params);
      } catch (error) {
        if (error instanceof ToolApiError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        captureExceptionAndLogIfDevelopment(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error executing tool",
        });
      }
    }),
};
