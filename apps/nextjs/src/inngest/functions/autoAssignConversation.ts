import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { inngest } from "@/inngest/client";
import { updateConversation } from "@/lib/data/conversation";
import { getMailboxById } from "@/lib/data/mailbox";
import { getUsersWithMailboxAccess, UserRoles, type UserWithMailboxAccessData } from "@/lib/data/user";
import { redis } from "@/lib/redis/client";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const REDIS_ROUND_ROBIN_KEY_PREFIX = "auto-assign-message-queue";

const getCoreTeamMembers = (teamMembers: UserWithMailboxAccessData[]): UserWithMailboxAccessData[] => {
  return teamMembers.filter((member) => member.role === UserRoles.CORE);
};

const getNonCoreTeamMembersWithMatchingKeywords = (
  teamMembers: UserWithMailboxAccessData[],
  conversationContent: string,
): UserWithMailboxAccessData[] => {
  if (!conversationContent) return [];

  const contentLowerCase = conversationContent.toLowerCase();

  return teamMembers
    .filter((member) => member.role === UserRoles.NON_CORE && member.keywords.length > 0)
    .filter((member) => {
      return member.keywords.some((keyword) => contentLowerCase.includes(keyword.toLowerCase()));
    });
};

const getNextCoreTeamMemberInRotation = async (
  coreTeamMembers: UserWithMailboxAccessData[],
  mailboxId: number,
): Promise<UserWithMailboxAccessData | null> => {
  if (coreTeamMembers.length === 0) return null;

  const redisKey = `${REDIS_ROUND_ROBIN_KEY_PREFIX}:${mailboxId}`;

  let lastAssignedIndex = 0;
  try {
    const lastAssignedIndexStr = await redis.get(redisKey);

    if (lastAssignedIndexStr !== null) {
      const parsedIndex = parseInt(lastAssignedIndexStr as string, 10);

      if (!isNaN(parsedIndex) && parsedIndex >= 0) {
        lastAssignedIndex = parsedIndex;
      }
    }
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
  }

  const nextIndex = (lastAssignedIndex + 1) % coreTeamMembers.length;

  try {
    await redis.set(redisKey, nextIndex.toString());
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
  }

  const nextMember = coreTeamMembers[nextIndex] || null;

  return nextMember;
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
  conversation: any,
  mailboxId: number,
): Promise<UserWithMailboxAccessData | null> => {
  const conversationContent = getConversationContent(conversation);
  const matchingNonCoreMembers = getNonCoreTeamMembersWithMatchingKeywords(teamMembers, conversationContent);

  if (matchingNonCoreMembers.length > 0) {
    const randomIndex = Math.floor(Math.random() * matchingNonCoreMembers.length);
    const selectedMember = matchingNonCoreMembers[randomIndex];
    return selectedMember || null;
  }

  const coreMembers = getCoreTeamMembers(teamMembers);
  return await getNextCoreTeamMemberInRotation(coreMembers, mailboxId);
};

export default inngest.createFunction(
  { id: "auto-assign-conversation" },
  { event: "conversations/human-support-requested" },
  async ({ event }) => {
    const { conversationId } = event.data;

    const conversation = assertDefinedOrRaiseNonRetriableError(
      await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            columns: {
              id: true,
              role: true,
              cleanedUpText: true,
            },
          },
        },
      }),
    );

    if (conversation.assignedToClerkId) return { message: "Skipped: already assigned" };
    if (conversation.mergedIntoId) return { message: "Skipped: conversation is already merged" };

    const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));
    const teamMembers = assertDefinedOrRaiseNonRetriableError(
      await getUsersWithMailboxAccess(mailbox.clerkOrganizationId, mailbox.id),
    );

    const activeTeamMembers = teamMembers.filter(
      (member) => member.role === UserRoles.CORE || member.role === UserRoles.NON_CORE,
    );

    if (activeTeamMembers.length === 0) {
      return { message: "Skipped: no active team members available for assignment" };
    }

    const nextTeamMember = await getNextTeamMember(activeTeamMembers, conversation, mailbox.id);

    if (!nextTeamMember) {
      return {
        message: "Skipped: could not find suitable team member for assignment",
        details: "No core members and no matching keywords for non-core members",
      };
    }

    await updateConversation(conversation.id, { set: { assignedToClerkId: nextTeamMember.id } });

    return {
      message: `Assigned conversation ${conversation.id} to ${nextTeamMember.displayName} (${nextTeamMember.id})`,
      assigneeRole: nextTeamMember.role,
      assigneeId: nextTeamMember.id,
    };
  },
);
