import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticateWidget, corsResponse } from "@/app/api/widget/utils";
import type { Mailbox } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import type { WidgetSession } from "@/lib/widgetSession";

interface AuthenticatedRequestContext {
  request: NextRequest;
  params?: Record<string, string>;
  mailbox: Mailbox;
  session: WidgetSession;
}

interface ApiHandlerOptions<TBodySchema extends z.ZodSchema = z.ZodSchema> {
  requiresAuth?: boolean;
  requestSchema?: TBodySchema;
}

export function createApiHandler<TBodySchema extends z.ZodSchema = z.ZodSchema>(
  handler: (
    req: NextRequest,
    context: { params?: Record<string, string> } | AuthenticatedRequestContext,
    validatedBody: z.infer<TBodySchema>,
  ) => Promise<NextResponse | Response>,
  options?: ApiHandlerOptions<TBodySchema>,
): (req: NextRequest, context: { params?: Record<string, string> }) => Promise<NextResponse | Response> {
  return async (req: NextRequest, context: { params?: Record<string, string> }) => {
    try {
      let validatedBody: z.infer<TBodySchema> | undefined;
      if (options?.requestSchema) {
        const body = await req.json();
        const result = options.requestSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: "Invalid request parameters", details: result.error.errors },
            { status: 400 },
          );
        }
        validatedBody = result.data;
      }

      let authContext: AuthenticatedRequestContext | undefined;
      if (options?.requiresAuth) {
        const authResult = await authenticateWidget(req);
        if (!authResult.success) {
          return corsResponse({ error: authResult.error }, { status: 401 });
        }
        authContext = { ...context, request: req, mailbox: authResult.mailbox, session: authResult.session };
      }

      const finalContext = options?.requiresAuth ? authContext! : { request: req, ...context };
      return await handler(req, finalContext as any, validatedBody as any);
    } catch (error) {
      captureExceptionAndLog(error);

      if (req.url.includes("/api/widget/")) {
        return corsResponse({ error: "An unexpected error occurred" }, { status: 500 });
      }
      return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
  };
}
