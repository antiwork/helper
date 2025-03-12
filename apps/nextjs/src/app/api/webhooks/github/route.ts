import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { env } from "@/env";
import { createReply } from "@/lib/data/conversationMessage";
import { addNote } from "@/lib/data/note";

const verifyGitHubWebhook = (payload: string, signature: string | null) => {
  if (!signature) return false;

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

    if (event === "issues" && (data.action === "closed" || data.action === "reopened" || data.action === "opened")) {
      const issueNumber = data.issue.number;
      const repoFullName = data.repository.full_name;
      const [repoOwner, repoName] = repoFullName.split("/");

      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.githubIssueNumber, issueNumber),
          eq(conversations.githubRepoOwner, repoOwner),
          eq(conversations.githubRepoName, repoName),
        ),
      });

      if (conversation) {
        if (data.action === "closed") {
          await db.update(conversations).set({ status: "closed" }).where(eq(conversations.id, conversation.id));

          await createReply({
            conversationId: conversation.id,
            message:
              "Hi, our team has resolved the issue so this should work now. Please let us know if you continue having problems.",
            user: null,
            role: "workflow",
            close: true,
          });

          const issueUrl = data.issue.html_url;
          await addNote({
            conversationId: conversation.id,
            message: `GitHub issue [#${issueNumber}](${issueUrl}) has been closed.`,
            user: null,
          });

          await db.insert(conversationMessages).values({
            conversationId: conversation.id,
            body: `GitHub issue #${issueNumber} has been closed.`,
            role: "workflow",
            isPerfect: true,
            isFlaggedAsBad: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else if (data.action === "reopened" || data.action === "opened") {
          await db.update(conversations).set({ status: "open" }).where(eq(conversations.id, conversation.id));

          const actionText = data.action === "reopened" ? "reopened" : "opened";
          await db.insert(conversationMessages).values({
            conversationId: conversation.id,
            body: `GitHub issue #${issueNumber} has been ${actionText}.`,
            role: "workflow",
            isPerfect: true,
            isFlaggedAsBad: false,
            createdAt: new Date(),
            updatedAt: new Date(),
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
