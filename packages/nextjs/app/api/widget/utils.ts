import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
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

export function corsResponse(data: unknown, init?: ResponseInit, method: "POST" | "PATCH" = "POST") {
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
  let session;
  try {
    session = verifyWidgetSession(token);
  } catch (error) {
    return { success: false, error: "Invalid session token" };
  }

  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, session.mailboxSlug),
  });

  if (!mailbox) {
    return { success: false, error: "Mailbox not found" };
  }

  return { success: true, session, mailbox };
}
