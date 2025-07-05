import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { runAIObjectQuery } from "@/lib/ai";
import { cacheFor } from "@/lib/cache";
import { Conversation, updateConversation } from "@/lib/data/conversation";
import { getMailbox, Mailbox } from "@/lib/data/mailbox";
import { getUsersWithMailboxAccess, UserRoles, type UserWithMailboxAccessData } from "@/lib/data/user";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

const CACHE_ROUND_ROBIN_KEY_PREFIX = "auto-assign-message-queue";

const getCoreTeamMembers = (teamMembers: UserWithMailboxAccessData[]): UserWithMailboxAccessData[] => {
  return teamMembers.filter((member) => member.role === UserRoles.CORE);
};

const getNonCoreTeamMembersWithMatchingKeywords = async (
  teamMembers: UserWithMailboxAccessData[],
  conversationContent: string,
  mailbox: Mailbox,
) => {
  if (!conversationContent) return { members: [] };

  const membersWithKeywords = teamMembers.filter(
    (member) => member.role === UserRoles.NON_CORE && member.keywords.length > 0,
  );

  if (membersWithKeywords.length === 0) return { members: [] };

  const memberKeywords = membersWithKeywords.reduce<Record<string, string[]>>((acc, member) => {
    acc[member.id] = member.keywords;
    return acc;
  }, {});

  const result = await runAIObjectQuery({
    mailbox,
    queryType: "auto_assign_conversation",
    schema: z.object({
      matches: z.record(z.string(), z.boolean()),
      reasoning: z.string(),
      confidenceScore: z.number().optional(),
    }),
    system: `You are an Intelligent Support Routing System that connects customer inquiries to team members with the most relevant expertise.

Your task is to analyze the semantic meaning of conversations and determine which team members' expertise keywords align with the customer's needs, even when there's no exact keyword match.

For each potential match, consider:
- Direct relevance: Is the keyword directly related to the topic?
- Implied needs: Does the customer's issue typically require this expertise?
- Domain knowledge: Would someone with this keyword expertise be equipped to help?
- Technical depth: Does the conversation's complexity match the expertise level?

When determining matches, provide clear reasoning about why each team member's keywords do or don't align with the conversation. Be especially attentive to technical topics that may use different terminology but relate to the same domain.

A strong match occurs when the team member's expertise would be valuable in addressing the core problem, not just peripheral aspects of the conversation.

Return false for all team members if you cannot find a strong match.`,
    messages: [
      {
        role: "user",
        content: `CUSTOMER CONVERSATION: "${conversationContent}"

TEAM MEMBER EXPERTISE:
${Object.entries(memberKeywords)
  .map(([id, keywords]) => `Team Member ID: ${id}\nExpertise Keywords: ${keywords.join(", ")}`)
  .join("\n")}

TASK:
Analyze the customer conversation and determine which team members have the expertise needed to best address this issue.

For each team member, evaluate if their expertise keywords semantically relate to the conversation's core problem - even if the exact terms don't appear in the text.

Return a JSON object with:
1. "matches": Record mapping team member IDs to boolean values (true if their expertise aligns with the conversation)
2. "reasoning": Brief explanation of your matching decisions
3. "confidenceScore": Number between 0-1 indicating overall confidence in your matching

Focus on understanding the customer's underlying needs rather than just surface-level keyword matching.`,
      },
    ],
    // 0.1 to allow some flexibility in matching, set to 0 to force more exact matches
    temperature: 0.1,
    functionId: "auto-assign-keyword-matching",
  });

  return {
    members: membersWithKeywords.filter((member) => result.matches[member.id]),
    aiResult: result,
  };
};

const getNextCoreTeamMemberInRotation = async (
  coreTeamMembers: UserWithMailboxAccessData[],
): Promise<UserWithMailboxAccessData | null> => {
  if (coreTeamMembers.length === 0) return null;

  const cache = cacheFor<number>(CACHE_ROUND_ROBIN_KEY_PREFIX);

  const lastAssignedIndex = (await cache.get()) ?? 0;
  const nextIndex = (lastAssignedIndex + 1) % coreTeamMembers.length;

  await cache.set(nextIndex);

  return coreTeamMembers[nextIndex] ?? null;
};

const getConversationContent = (conversationData: {
  messages?: {
    role: string;
    cleanedUpText?: string | null;
  }[];
  subject?: string | null;
}): string => {
  if (!conversationData?.messages || conversationData.messages.length === 0) {
    return conversationData.subject || "";
  }

  const userMessages = conversationData.messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.cleanedUpText || "")
    .filter(Boolean);

  const contentParts = [];
  if (conversationData.subject) {
    contentParts.push(conversationData.subject);
  }
  contentParts.push(...userMessages);

  return contentParts.join(" ");
};

const getNextTeamMember = async (
  teamMembers: UserWithMailboxAccessData[],
  conversation: Conversation,
  mailbox: Mailbox,
) => {
  const conversationContent = getConversationContent(conversation);
  const { members: matchingNonCoreMembers, aiResult } = await getNonCoreTeamMembersWithMatchingKeywords(
    teamMembers,
    conversationContent,
    mailbox,
  );

  if (matchingNonCoreMembers.length > 0) {
    const randomIndex = Math.floor(Math.random() * matchingNonCoreMembers.length);
    const selectedMember = matchingNonCoreMembers[randomIndex]!;
    return { member: selectedMember, aiResult };
  }

  const coreMembers = getCoreTeamMembers(teamMembers);
  return {
    member: await getNextCoreTeamMemberInRotation(coreMembers),
  };
};

export const autoAssignConversation = async ({ conversationId }: { conversationId: number }) => {
  const conversation = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        messages: {
          columns: {
            role: true,
            cleanedUpText: true,
          },
        },
      },
    }),
  );

  if (conversation.assignedToId) {
    return { message: "Conversation is already assigned" };
  }

  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());
  const teamMembers = assertDefinedOrRaiseNonRetriableError(await getUsersWithMailboxAccess());

  const activeTeamMembers = teamMembers.filter(
    (member) => member.role === UserRoles.CORE || member.role === UserRoles.NON_CORE,
  );

  if (activeTeamMembers.length === 0) {
    return { message: "Skipped: no active team members available for assignment" };
  }

  const { member: nextTeamMember, aiResult } = await getNextTeamMember(activeTeamMembers, conversation, mailbox);

  if (!nextTeamMember) {
    return {
      message: "Skipped: could not find suitable team member for assignment",
      details: "No core members and no matching keywords for non-core members",
    };
  }

  await updateConversation(conversation.id, {
    set: { assignedToId: nextTeamMember.id },
    message: aiResult ? aiResult.reasoning : "Core member assigned by round robin",
  });

  return {
    message: `Assigned conversation ${conversation.id} to ${nextTeamMember.displayName} (${nextTeamMember.id})`,
    assigneeRole: nextTeamMember.role,
    assigneeId: nextTeamMember.id,
    aiResult,
  };
};
