import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { toolApis, tools as toolsTable } from "@/db/schema";
import { fetchOpenApiSpec, importToolsFromSpec } from "@/lib/data/tools";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import type { ToolFormatted } from "@/types/tools";
import { mailboxProcedure } from "./procedure";

export const toolsRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    try {
      const apis = await db.query.toolApis.findMany({
        columns: {
          id: true,
          name: true,
          baseUrl: true,
        },
        with: {
          tools: {
            columns: {
              id: true,
              name: true,
              description: true,
              url: true,
              requestMethod: true,
              enabled: true,
              slug: true,
              availableInChat: true,
              availableInAnonymousChat: true,
              customerEmailParameter: true,
              parameters: true,
              toolApiId: true,
            },
            orderBy: [desc(toolsTable.enabled), asc(toolsTable.id)],
          },
        },
      });

      return apis.map((api) => ({
        id: api.id,
        name: api.name,
        baseUrl: api.baseUrl,
        tools: api.tools.map(
          (tool) =>
            ({
              ...tool,
              path: tool.url
                .split(/\/\/[^/]+/)
                .pop()!
                .replace(/^\/+|\/+$/g, ""),
              toolApiId: api.id,
              unused_mailboxId: ctx.mailbox.id,
            }) satisfies ToolFormatted,
        ),
      }));
    } catch (error) {
      captureExceptionAndLog(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch APIs",
      });
    }
  }),

  import: mailboxProcedure
    .input(
      z.object({
        url: z.string().url().optional(),
        schema: z.string().optional(),
        apiKey: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.url && !input.schema) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either URL or schema must be provided",
        });
      }

      try {
        const openApiSpec = input.url ? await fetchOpenApiSpec(input.url, input.apiKey) : input.schema;

        if (!openApiSpec) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to fetch API spec",
          });
        }

        const toolApi = await db
          .insert(toolApis)
          .values({
            name: input.name,
            baseUrl: input.url,
            schema: input.schema,
            authenticationToken: input.apiKey,
          })
          .returning()
          .then(takeUniqueOrThrow);

        await importToolsFromSpec({
          toolApiId: toolApi.id,
          openApiSpec,
          apiKey: input.apiKey,
        });

        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import API spec",
        });
      }
    }),
  update: mailboxProcedure
    .input(
      z.object({
        toolId: z.number(),
        settings: z.object({
          availableInChat: z.boolean(),
          availableInAnonymousChat: z.boolean(),
          enabled: z.boolean(),
          customerEmailParameter: z.string().nullable(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { toolId, settings } = input;

      const tool = await db.query.tools.findFirst({
        where: eq(toolsTable.id, toolId),
      });

      if (!tool) throw new TRPCError({ code: "NOT_FOUND", message: "Tool not found" });

      await db
        .update(toolsTable)
        .set({
          availableInChat: settings.enabled ? settings.availableInChat : false,
          availableInAnonymousChat: settings.enabled ? settings.availableInAnonymousChat : false,
          enabled: settings.enabled,
          customerEmailParameter:
            tool.parameters?.find((param) => param.name === settings.customerEmailParameter)?.name ?? null,
        })
        .where(and(eq(toolsTable.id, toolId)));

      return { success: true };
    }),

  deleteApi: mailboxProcedure
    .input(
      z.object({
        apiId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const { apiId } = input;

      await db.transaction(async (tx) => {
        await tx.delete(toolsTable).where(eq(toolsTable.toolApiId, apiId));
        await tx.delete(toolApis).where(and(eq(toolApis.id, apiId)));
      });

      return { success: true };
    }),

  refreshApi: mailboxProcedure
    .input(
      z.object({
        apiId: z.number(),
        schema: z.string().optional(),
      }),
    )
    .mutation(async ({ input: { apiId, schema } }) => {
      const api = await db.query.toolApis.findFirst({
        where: eq(toolApis.id, apiId),
      });

      if (!api) throw new TRPCError({ code: "NOT_FOUND", message: "API not found" });
      if (schema && !api.schema) throw new TRPCError({ code: "BAD_REQUEST", message: "API is not schema-based" });

      try {
        const openApiSpec = api.baseUrl ? await fetchOpenApiSpec(api.baseUrl, api.authenticationToken) : schema;

        await importToolsFromSpec({
          toolApiId: api.id,
          openApiSpec: assertDefined(openApiSpec),
          apiKey: api.authenticationToken ?? "",
        });

        if (schema) {
          await db.update(toolApis).set({ schema }).where(eq(toolApis.id, api.id));
        }

        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to refresh API spec",
        });
      }
    }),
};
