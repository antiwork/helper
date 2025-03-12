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

  console.log(`GitHub webhook received: ${new Date().toISOString()}`);

  if (!verifyGitHubWebhook(payload, signature)) {
    console.error("Invalid GitHub webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const data = JSON.parse(payload);
    const event = request.headers.get("x-github-event");
    console.log(`GitHub webhook action: ${data.action}, event: ${event}`);

    if (event === "issues" && (data.action === "closed" || data.action === "reopened" || data.action === "opened")) {
      const issueNumber = data.issue.number;
      const repoFullName = data.repository.full_name;
      const [repoOwner, repoName] = repoFullName.split("/");

      console.log(`Processing GitHub issue #${issueNumber} ${data.action} from ${repoFullName}`);

      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.githubIssueNumber, issueNumber),
          eq(conversations.githubRepoOwner, repoOwner),
          eq(conversations.githubRepoName, repoName),
        ),
      });

      if (conversation) {
        console.log(`Found matching conversation ID: ${conversation.id}`);

        if (data.action === "closed") {
          await db.update(conversations).set({ status: "closed" }).where(eq(conversations.id, conversation.id));
          console.log(`Updated conversation ${conversation.id} status to closed`);

          await createReply({
            conversationId: conversation.id,
            message:
              "Hi, our team has resolved the issue so this should work now. Please let us know if you continue having problems.",
            user: null,
            role: "workflow",
            close: true,
          });
          console.log(`Sent closure reply to customer for conversation ${conversation.id}`);

          const issueUrl = data.issue.html_url;
          await addNote({
            conversationId: conversation.id,
            message: `GitHub issue [#${issueNumber}](${issueUrl}) has been closed.`,
            user: null,
          });
          console.log(`Added internal note about issue closure for conversation ${conversation.id}`);

          await db.insert(conversationMessages).values({
            conversationId: conversation.id,
            body: `GitHub issue #${issueNumber} has been closed.`,
            role: "workflow",
            isPerfect: true,
            isFlaggedAsBad: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`Added closed message to conversation ${conversation.id}`);
        } else if (data.action === "reopened" || data.action === "opened") {
          await db.update(conversations).set({ status: "open" }).where(eq(conversations.id, conversation.id));
          console.log(`Updated conversation ${conversation.id} status to open`);

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
          console.log(`Added ${actionText} message to conversation ${conversation.id}`);
        }
      } else {
        console.log(`No matching conversation found for GitHub issue #${issueNumber} in ${repoFullName}`);
      }
    } else {
      console.log(`Ignoring unsupported GitHub webhook: ${data.action}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing GitHub webhook:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
