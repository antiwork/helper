import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createReply } from "@/lib/data/conversationMessage";
import { addNote } from "@/lib/data/note";
import { env } from "@/lib/env";

const verifyGitHubWebhook = (payload: string, signature: string | null) => {
  if (!signature || !env.GITHUB_CLIENT_SECRET) return false;

  const hmac = crypto.createHmac("sha256", env.GITHUB_CLIENT_SECRET);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyGitHubWebhook(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const data = JSON.parse(payload);
    const event = request.headers.get("x-github-event");

    if (event === "issues" && (data.action === "closed" || data.action === "reopened")) {
      const issueNumber = data.issue.number;
      const repoFullName = data.repository.full_name;
      const [repoOwner, repoName] = repoFullName.split("/");

      const linkedConversations = await db.query.conversations.findMany({
        where: and(
          eq(conversations.githubIssueNumber, issueNumber),
          eq(conversations.githubRepoOwner, repoOwner),
          eq(conversations.githubRepoName, repoName),
        ),
      });

      for (const conversation of linkedConversations) {
        if (data.action === "closed") {
          await db.update(conversations).set({ status: "closed" }).where(eq(conversations.id, conversation.id));

          await createReply({
            conversationId: conversation.id,
            message:
              "Hi, our team has resolved the issue so this should work now. Please let us know if you continue having problems.",
            user: null,
            role: "staff",
            close: true,
          });

          await addNote({
            conversationId: conversation.id,
            message: `GitHub issue [#${issueNumber}](${data.issue.html_url}) has been closed.`,
            user: null,
          });
        } else if (data.action === "reopened") {
          await addNote({
            conversationId: conversation.id,
            message: `GitHub issue [#${issueNumber}](${data.issue.html_url}) has been reopened.`,
            user: null,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
