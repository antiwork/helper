import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { addNote } from "@/lib/data/note";
import { createGitHubIssue, getGitHubIssue, listRepositoryIssues } from "@/lib/github/client";
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
          body: `${input.body}\n\n*Created from [${ctx.conversation.subject}](${getBaseUrl()}/conversations?id=${ctx.conversation.slug})*`,
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

        await addNote({
          conversationId: ctx.conversation.id,
          message: `Created GitHub issue [#${issueNumber}](${issueUrl})`,
          user: ctx.user,
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

        await addNote({
          conversationId: ctx.conversation.id,
          message: `Linked to GitHub issue [#${issue.number}](${issue.url})`,
          user: ctx.user,
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
