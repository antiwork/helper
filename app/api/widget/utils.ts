import { NextResponse } from "next/server";
import { mailboxes } from "@/db/schema";
import { getMailbox, Mailbox } from "@/lib/data/mailbox";
import { verifyWidgetSession, type WidgetSessionPayload } from "@/lib/widgetSession";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsOptions(...methods: ("GET" | "POST" | "PATCH")[]) {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Methods": `${methods.join(", ")}, OPTIONS`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function corsResponse<Data = unknown>(
  data: Data,
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
  const mailbox = await getMailbox();

  if (!mailbox) {
    return { success: false, error: "Mailbox not found" };
  }

  let session;
  try {
    session = verifyWidgetSession(token, mailbox);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Invalid session token", error);
    return { success: false, error: "Invalid session token" };
  }

  return { success: true, session, mailbox };
}

type AuthenticatedHandler<Params extends object> = (
  inner: { request: Request; context: { params: Promise<Params> } },
  auth: { session: WidgetSessionPayload; mailbox: Mailbox },
) => Promise<Response>;

export function withWidgetAuth<Params extends object = object>(handler: AuthenticatedHandler<Params>) {
  return async (request: Request, context: { params: Promise<Params> }) => {
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
