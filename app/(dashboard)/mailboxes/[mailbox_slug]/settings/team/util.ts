import { type TeamMember } from "./teamMemberRow";

export const getAvatarFallback = (member: TeamMember): string => {
  if (member.displayName?.trim()) {
    return member.displayName;
  }

  if (member.email) {
    const emailUsername = member.email.split("@")[0];
    return emailUsername || member.email;
  }

  return "?";
};
