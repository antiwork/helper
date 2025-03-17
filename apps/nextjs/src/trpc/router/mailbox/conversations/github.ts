import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { createGitHubIssue, getGitHubIssue, listRepositoryIssues, updateGitHubIssueState } from "@/lib/github/client";
import { conversationProcedure } from "./procedure";

export const githubRouter = {
  createGitHubIssue: conversationProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.mailbox.githubInstallationId || !ctx.mailbox.githubRepoOwner || !ctx.mailbox.githubRepoName) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GitHub is not configured for this mailbox",
        });
      }

      try {
        const { issueNumber, issueUrl, issueId } = await createGitHubIssue({
          installationId: ctx.mailbox.githubInstallationId,
          owner: ctx.mailbox.githubRepoOwner,
          repo: ctx.mailbox.githubRepoName,
          title: input.title,
          body: input.body,
        });

        await db
          .update(conversations)
          .set({
            githubIssueNumber: issueNumber,
            githubIssueUrl: issueUrl,
            githubRepoOwner: ctx.mailbox.githubRepoOwner,
            githubRepoName: ctx.mailbox.githubRepoName,
          })
          .where(eq(conversations.id, ctx.conversation.id));

        await db.insert(conversationMessages).values({
          conversationId: ctx.conversation.id,
          body: `Created GitHub issue #${issueNumber}: ${input.title}\n\n${issueUrl}`,
          role: "workflow" as const,
          isPerfect: true,
          isFlaggedAsBad: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          issueNumber,
          issueUrl,
          issueId,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create GitHub issue",
        });
      }
    }),

  updateGitHubIssueState: conversationProcedure
    .input(
      z.object({
        state: z.enum(["open", "closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        !ctx.conversation.githubIssueNumber ||
        !ctx.conversation.githubRepoOwner ||
        !ctx.conversation.githubRepoName
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No GitHub issue is linked to this conversation",
        });
      }

      if (!ctx.mailbox.githubInstallationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GitHub is not configured for this mailbox",
        });
      }

      try {
        const result = await updateGitHubIssueState({
          installationId: ctx.mailbox.githubInstallationId,
          owner: ctx.conversation.githubRepoOwner,
          repo: ctx.conversation.githubRepoName,
          issueNumber: ctx.conversation.githubIssueNumber,
          state: input.state,
        });

        const actionText = input.state === "open" ? "reopened" : "closed";
        await db.insert(conversationMessages).values({
          conversationId: ctx.conversation.id,
          body: `GitHub issue #${ctx.conversation.githubIssueNumber} has been ${actionText}.`,
          role: "workflow" as const,
          isPerfect: true,
          isFlaggedAsBad: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db
          .update(conversations)
          .set({
            status: input.state === "open" ? "open" : "closed",
          })
          .where(eq(conversations.id, ctx.conversation.id));

        return {
          state: result.state,
          issueUrl: result.issueUrl,
          issueNumber: ctx.conversation.githubIssueNumber,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update GitHub issue state",
        });
      }
    }),

  linkExistingGitHubIssue: conversationProcedure
    .input(
      z.object({
        issueNumber: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.mailbox.githubInstallationId || !ctx.mailbox.githubRepoOwner || !ctx.mailbox.githubRepoName) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GitHub is not configured for this mailbox",
        });
      }

      try {
        const issue = await getGitHubIssue({
          installationId: ctx.mailbox.githubInstallationId,
          owner: ctx.mailbox.githubRepoOwner,
          repo: ctx.mailbox.githubRepoName,
          issueNumber: input.issueNumber,
        });

        await db
          .update(conversations)
          .set({
            githubIssueNumber: issue.number,
            githubIssueUrl: issue.url,
            githubRepoOwner: ctx.mailbox.githubRepoOwner,
            githubRepoName: ctx.mailbox.githubRepoName,
          })
          .where(eq(conversations.id, ctx.conversation.id));

        await db.insert(conversationMessages).values({
          conversationId: ctx.conversation.id,
          body: `Linked to GitHub issue #${issue.number}: ${issue.title}\n\n${issue.url}`,
          role: "workflow" as const,
          isPerfect: true,
          isFlaggedAsBad: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          issueNumber: issue.number,
          issueUrl: issue.url,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to link GitHub issue",
        });
      }
    }),

  listRepositoryIssues: conversationProcedure
    .input(
      z.object({
        state: z.enum(["open", "closed", "all"]).default("open"),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.mailbox.githubInstallationId || !ctx.mailbox.githubRepoOwner || !ctx.mailbox.githubRepoName) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GitHub is not configured for this mailbox",
        });
      }

      try {
        return await listRepositoryIssues({
          installationId: ctx.mailbox.githubInstallationId,
          owner: ctx.mailbox.githubRepoOwner,
          repo: ctx.mailbox.githubRepoName,
          state: input.state,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to list repository issues",
        });
      }
    }),
};
