"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SavingIndicator } from "@/components/ui/savingIndicator";
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
      displayNameSaving.setSaved();
    },
    onError: (error) => {
      displayNameSaving.setError();
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
      roleSaving.setSaved();
    },
    onError: (error) => {
      roleSaving.setError();
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
      // Update both role and keywords since this mutation sends both parameters
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
      keywordsSaving.setSaved();
    },
    onError: (error) => {
      keywordsSaving.setError();
      toast({
        title: "Failed to update keywords",
        description: error.message,
        variant: "destructive",
      });
      // Reset both role and keywords since this mutation sends both parameters
      setRole(member.role);
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  // Debounced function for keyword updates
  const debouncedUpdateKeywords = useDebouncedCallback((newKeywords: string[]) => {
    keywordsSaving.setSaving();
    updateKeywords({
      mailboxSlug,
      userId: member.id,
      role,
      keywords: newKeywords,
    });
  }, 500);

  const debouncedUpdateDisplayName = useDebouncedCallback((newDisplayName: string) => {
    displayNameSaving.setSaving();
    updateDisplayName({
      mailboxSlug,
      userId: member.id,
      displayName: newDisplayName,
    });
  }, 500);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);

    const newKeywords = newRole !== "nonCore" ? [] : localKeywords;

    if (newRole !== "nonCore") {
      setKeywordsInput("");
      setLocalKeywords([]);
    }

    roleSaving.setSaving();
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
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar fallback={getAvatarFallback(member)} size="sm" />
          <span className="truncate">{member.email || "No email"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="relative">
          <Input
            value={displayNameInput}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Enter display name"
            className="w-full max-w-sm"
          />
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <SavingIndicator state={displayNameSaving.state} />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="relative">
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
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            <SavingIndicator state={roleSaving.state} />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="relative">
          <Input
            value={keywordsInput}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="Enter keywords separated by commas"
            className={role === "nonCore" ? "" : "invisible"}
          />
          {role === "nonCore" && (
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
              <SavingIndicator state={keywordsSaving.state} />
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
