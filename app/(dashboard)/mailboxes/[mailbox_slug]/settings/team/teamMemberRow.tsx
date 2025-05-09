"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { type UserRole } from "@/lib/data/user";
import { api } from "@/trpc/react";

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  core: "Core",
  nonCore: "Non-core",
  afk: "Away",
};

export interface TeamMember {
  id: string;
  displayName: string;
  email: string | undefined;
  role: UserRole;
  keywords: string[];
}

type TeamMemberRowProps = {
  member: TeamMember;
  mailboxSlug: string;
};

const TeamMemberRow = ({ member, mailboxSlug }: TeamMemberRowProps) => {
  // Local state for this row's keywords and role
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<UserRole>(member.role);
  const [localKeywords, setLocalKeywords] = useState<string[]>(member.keywords);

  // Get the utility functions for cache management
  const utils = api.useUtils();

  // Reset the input when the member data changes
  useEffect(() => {
    setKeywordsInput(member.keywords.join(", "));
    setRole(member.role);
    setLocalKeywords(member.keywords);
  }, [member.keywords, member.role]);

  const { mutate: updateTeamMember } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((m) =>
          m.id === member.id
            ? {
                ...m,
                role: data.role,
                keywords: data.keywords,
              }
            : m,
        );
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update team member",
        description: error.message,
        variant: "destructive",
      });

      setKeywordsInput(member.keywords.join(", "));
      setRole(member.role);
    },
  });

  // Debounced function for keyword updates
  const debouncedUpdateKeywords = useDebouncedCallback((newKeywords: string[]) => {
    updateTeamMember({
      mailboxSlug,
      userId: member.id,
      role,
      keywords: newKeywords,
    });
  }, 800);

  // Handle role changes
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);

    // Clear keywords if not nonCore
    const newKeywords = newRole !== "nonCore" ? [] : localKeywords;

    if (newRole !== "nonCore") {
      setKeywordsInput("");
      setLocalKeywords([]);
    }

    // Update immediately for role changes (no debounce)
    updateTeamMember({
      mailboxSlug,
      userId: member.id,
      role: newRole,
      keywords: newKeywords,
    });
  };

  // Handle keyword changes
  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const newKeywords = value
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    setLocalKeywords(newKeywords);
    debouncedUpdateKeywords(newKeywords);
  };

  return (
    <TableRow>
      <TableCell>{member.displayName || ""}</TableCell>
      <TableCell>{member.email || ""}</TableCell>
      <TableCell>
        <Select value={role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="core">{ROLE_DISPLAY_NAMES.core}</SelectItem>
            <SelectItem value="nonCore">{ROLE_DISPLAY_NAMES.nonCore}</SelectItem>
            <SelectItem value="afk">{ROLE_DISPLAY_NAMES.afk}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={keywordsInput}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          placeholder="Enter keywords separated by commas"
          className={role === "nonCore" ? "" : "invisible"}
        />
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
