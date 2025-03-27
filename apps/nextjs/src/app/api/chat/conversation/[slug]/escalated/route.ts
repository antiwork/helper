import { NextRequest, NextResponse } from "next/server";
import { getConversationBySlug, isConversationEscalated } from "@/lib/data/conversation";
import { authenticateWidget } from "@/lib/widget/auth";

export async function GET(
  request: NextRequest,
  { params: { slug } }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") ?? null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await authenticateWidget(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
