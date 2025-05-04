import { auth } from "@clerk/nextjs/server";
import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getAuthorizedMailbox } from "@/trpc";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session.userId || !session.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mailboxSlug = searchParams.get("mailboxSlug");

  if (!mailboxSlug) {
    return NextResponse.json({ error: "Missing mailboxSlug parameter" }, { status: 400 });
  }

  const mailbox = await getAuthorizedMailbox(session.orgId, mailboxSlug);
  if (!mailbox) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The Ably API key capabilities string is `[*]*`, meaning that it can grant access
  // to anything. When generating tokens, they must be scoped to the authorized mailbox.
  // https://ably.com/docs/auth/capabilities#wildcards
  const client = new Ably.Rest(env.ABLY_API_KEY);
  const data = await client.auth.createTokenRequest({
    clientId: session.userId,
    capability: {
      [`${mailbox.slug}:*`]: ["subscribe", "presence"],
    },
  });
  return NextResponse.json(data);
}
