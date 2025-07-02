import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { verifyWidgetSession, type WidgetSessionPayload } from "@/lib/widgetSession";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsOptions(method: "POST" | "PATCH" = "POST") {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Methods": `${method}, OPTIONS`,
    },
  });
}

export function corsResponse(
  data: unknown,
  init?: Omit<ResponseInit, "headers"> & { headers?: Record<string, string> },
  method: "POST" | "PATCH" = "POST",
) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
      "Access-Control-Allow-Methods": `${method}, OPTIONS`,
    },
  });
}

type AuthenticateWidgetResult =
  | { success: true; session: WidgetSessionPayload; mailbox: typeof mailboxes.$inferSelect }
  | { success: false; error: string };

export async function authenticateWidget(request: Request): Promise<AuthenticateWidgetResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { success: false, error: "Missing authorization header" };
  }

  const token = authHeader.slice(7);
  const decoded = jwt.decode(token) as WidgetSessionPayload;

  if (!decoded?.mailboxSlug) {
    return { success: false, error: "Invalid session token" };
  }

  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, decoded.mailboxSlug),
  });

  if (!mailbox) {
    return { success: false, error: "Mailbox not found" };
  }

  let session;
  try {
    session = verifyWidgetSession(token, mailbox);
  } catch (error) {
    return { success: false, error: "Invalid session token" };
  }

  return { success: true, session, mailbox };
}

type AuthenticatedHandler = (
  inner: { request: NextRequest; context: { params: Promise<{ id: string; slug: string }> } },
  auth: { session: WidgetSessionPayload; mailbox: Mailbox },
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request, context: { params: Promise<{ id: string; slug: string }> }) => {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const authResult = await authenticateWidget(request);

    if (!authResult.success) {
      return new NextResponse(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    return handler({ request, context }, { session: authResult.session, mailbox: authResult.mailbox });
  };
}
