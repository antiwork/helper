import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { authenticateWidget } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationEvents, conversations } from "@/db/schema";

export async function GET(
  request: NextRequest,
  { params: { slug } }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const authResult = await authenticateWidget(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.slug, slug),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const requestHumanSupportEvent = await db.query.conversationEvents.findFirst({
      where: and(
        eq(conversationEvents.conversationId, conversation.id),
        eq(conversationEvents.type, "request_human_support"),
      ),
    });

    const isEscalated = !!requestHumanSupportEvent;

    return NextResponse.json({ isEscalated });
  } catch (error) {
    console.error("Error checking escalation status:", error);
    return NextResponse.json({ error: "Failed to check escalation status" }, { status: 500 });
  }
}
