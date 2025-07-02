"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Avatar } from "@/components/ui/avatar";
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

interface TeamMember {
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
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<UserRole>(member.role);
  const [localKeywords, setLocalKeywords] = useState<string[]>(member.keywords);
  const [displayNameInput, setDisplayNameInput] = useState(member.displayName || "");

  // Separate saving indicators for each operation type
  const displayNameSaving = useSavingIndicator();
  const roleSaving = useSavingIndicator();
  const keywordsSaving = useSavingIndicator();

  const utils = api.useUtils();

  useEffect(() => {
    setKeywordsInput(member.keywords.join(", "));
    setRole(member.role);
    setLocalKeywords(member.keywords);
    setDisplayNameInput(member.displayName || "");
  }, [member.keywords, member.role, member.displayName]);

  // Separate mutations for each operation type
  const { mutate: updateDisplayName } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Only update displayName field to avoid race conditions
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((m) =>
          m.id === member.id
            ? {
                ...m,
                displayName: data.displayName,
              }
            : m,
        );
      });
      displayNameSaving.setState("saved");
    },
    onError: (error) => {
      displayNameSaving.setState("error");
      toast({
        title: "Failed to update display name",
        description: error.message,
        variant: "destructive",
      });
      setDisplayNameInput(member.displayName || "");
    },
  });

  const { mutate: updateRole } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Update both role and keywords since role changes can affect keywords
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
      roleSaving.setState("saved");
    },
    onError: (error) => {
      roleSaving.setState("error");
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
      setRole(member.role);
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  const { mutate: updateKeywords } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Only update keywords field to avoid race conditions
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((m) =>
          m.id === member.id
            ? {
                ...m,
                keywords: data.keywords,
              }
            : m,
        );
      });
      keywordsSaving.setState("saved");
    },
    onError: (error) => {
      keywordsSaving.setState("error");
      toast({
        title: "Failed to update keywords",
        description: error.message,
        variant: "destructive",
      });
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  // Debounced function for keyword updates
  const debouncedUpdateKeywords = useDebouncedCallback((newKeywords: string[]) => {
    keywordsSaving.setState("saving");
    updateKeywords({
      mailboxSlug,
      userId: member.id,
      keywords: newKeywords,
    });
  }, 500);

  const debouncedUpdateDisplayName = useDebouncedCallback((newDisplayName: string) => {
    displayNameSaving.setState("saving");
    updateDisplayName({
      mailboxSlug,
      userId: member.id,
      displayName: newDisplayName,
    });
  }, 500);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);

    // Clear keywords when changing FROM nonCore to another role
    // Keep keywords when changing TO nonCore
    const newKeywords = newRole === "nonCore" ? localKeywords : [];

    if (newRole !== "nonCore") {
      setKeywordsInput("");
      setLocalKeywords([]);
    }

    roleSaving.setState("saving");
    updateRole({
      mailboxSlug,
      userId: member.id,
      role: newRole,
      keywords: newKeywords,
    });
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const newKeywords = value
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    setLocalKeywords(newKeywords);
    debouncedUpdateKeywords(newKeywords);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayNameInput(value);
    debouncedUpdateDisplayName(value);
  };

  const getAvatarFallback = (member: TeamMember): string => {
    if (member.displayName?.trim()) {
      return member.displayName;
    }

    if (member.email) {
      const emailUsername = member.email.split("@")[0];
      return emailUsername || member.email;
    }

    return "?";
  };

  return (
    <TableRow>
      <TableCell className="min-w-[200px] sm:w-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar fallback={getAvatarFallback(member)} size="sm" />
          <span className="truncate text-sm sm:text-base">{member.email || "No email"}</span>
        </div>
      </TableCell>
      <TableCell className="min-w-[150px] sm:min-w-[200px]">
        <div className="relative grow">
          <Input
            value={displayNameInput}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Enter display name"
            className="w-full text-sm sm:text-base"
          />
        </div>
      </TableCell>
      <TableCell className="w-[140px] sm:w-[180px]">
        <Select value={role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
          <SelectTrigger className="w-full text-sm sm:text-base">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="core">{ROLE_DISPLAY_NAMES.core}</SelectItem>
            <SelectItem value="nonCore">{ROLE_DISPLAY_NAMES.nonCore}</SelectItem>
            <SelectItem value="afk">{ROLE_DISPLAY_NAMES.afk}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[180px] sm:min-w-[200px]">
        <div className="w-full">
          <div className="relative grow">
            <Input
              value={keywordsInput}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="Enter keywords separated by commas"
              className={role === "nonCore" ? "w-full text-sm sm:text-base" : "invisible w-full text-sm sm:text-base"}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[100px] sm:w-[120px]">
        <div className="flex items-center gap-1 sm:gap-2">
          <SavingIndicator state={displayNameSaving.state} />
          <SavingIndicator state={roleSaving.state} />
          {role === "nonCore" && <SavingIndicator state={keywordsSaving.state} />}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
