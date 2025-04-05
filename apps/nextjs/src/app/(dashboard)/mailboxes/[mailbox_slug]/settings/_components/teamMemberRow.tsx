"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";

export interface TeamMember {
  id: string;
  displayName: string;
  email: string | undefined;
  role: "Core" | "Non-core" | "AFK";
  keywords: string[];
}

type TeamMemberRowProps = {
  member: TeamMember;
  mailboxSlug: string;
};

const TeamMemberRow = ({ member, mailboxSlug }: TeamMemberRowProps) => {
  // Local state for this row's keywords and role
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<"Core" | "Non-core" | "AFK">(member.role);
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
      toast({
        title: "Team member updated",
        variant: "success",
      });

      // Optimistically update the cache with the new data
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

      // Reset to previous state on error
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
  const handleRoleChange = (newRole: "Core" | "Non-core" | "AFK") => {
    setRole(newRole);

    // Clear keywords if not Non-core
    const newKeywords = newRole !== "Non-core" ? [] : localKeywords;

    if (newRole !== "Non-core") {
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
        <Select value={role} onValueChange={(value: "Core" | "Non-core" | "AFK") => handleRoleChange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Core">Core</SelectItem>
            <SelectItem value="Non-core">Non-core</SelectItem>
            <SelectItem value="AFK">AFK</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {role === "Non-core" && (
          <Input
            value={keywordsInput}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="Enter keywords separated by commas"
          />
        )}
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
