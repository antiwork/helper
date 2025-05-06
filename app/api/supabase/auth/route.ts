import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedMailbox } from "@/trpc/trpc";

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

  return NextResponse.json({
    userId: session.userId,
    mailboxSlug: mailbox.slug,
    authorized: true,
  });
}
