import { NextRequest, NextResponse } from "next/server";
import { getConversationBySlug, isConversationEscalated } from "@/lib/data/conversation";
import { authenticateWidget } from "@/app/api/widget/utils";

export async function GET(
  request: NextRequest,
  { params: { slug } }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const authResult = await authenticateWidget(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const conversation = await getConversationBySlug(slug);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isEscalated = await isConversationEscalated(conversation.id);

    return NextResponse.json({ isEscalated });
  } catch (error) {
    console.error("Error checking escalation status:", error);
    return NextResponse.json({ error: "Failed to check escalation status" }, { status: 500 });
  }
}
