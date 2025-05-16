import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";
import { getMailboxBySlug } from "@/lib/data/mailbox";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mailboxSlug = searchParams.get("mailboxSlug");

  if (!mailboxSlug) {
    return NextResponse.json({ error: "Missing mailboxSlug parameter" }, { status: 400 });
  }

  const mailbox = await getMailboxBySlug(mailboxSlug);
  if (!mailbox) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The Ably API key capabilities string is `[*]*`, meaning that it can grant access
  // to anything. When generating tokens, they must be scoped to the authorized mailbox.
  // https://ably.com/docs/auth/capabilities#wildcards
  const client = new Ably.Rest(env.ABLY_API_KEY);
  const data = await client.auth.createTokenRequest({
    clientId: user.id,
    capability: {
      [`${mailbox.slug}:*`]: ["subscribe", "presence"],
    },
  });
  return NextResponse.json(data);
}
