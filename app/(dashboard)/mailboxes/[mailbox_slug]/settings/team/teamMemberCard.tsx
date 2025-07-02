"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { type UserRole } from "@/lib/data/user";
import { api } from "@/trpc/react";
import { ROLE_DISPLAY_NAMES, type TeamMember } from "./teamMemberRow";
import { getAvatarFallback } from "./util";

type TeamMemberCardProps = {
  member: TeamMember;
  mailboxSlug: string;
};

const TeamMemberCard = ({ member, mailboxSlug }: TeamMemberCardProps) => {
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<UserRole>(member.role);
  const [localKeywords, setLocalKeywords] = useState<string[]>(member.keywords);
  const [displayNameInput, setDisplayNameInput] = useState(member.displayName || "");

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

  const { mutate: updateDisplayName } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
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

  return (
    <div className="border rounded-lg p-5 space-y-5 bg-card shadow-sm">
      {/* Header with avatar and email */}
      <div className="flex items-center gap-4">
        <Avatar fallback={getAvatarFallback(member)} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{member.email || "No email"}</p>
          <div className="flex items-center gap-2 mt-2">
            <SavingIndicator state={displayNameSaving.state} />
            <SavingIndicator state={roleSaving.state} />
            {role === "nonCore" && <SavingIndicator state={keywordsSaving.state} />}
          </div>
        </div>
      </div>

      {/* Name input */}
      <div className="space-y-3">
        <Label htmlFor={`name-${member.id}`} className="text-sm font-medium">
          Display Name
        </Label>
        <Input
          id={`name-${member.id}`}
          value={displayNameInput}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="Enter display name"
          className="w-full h-11 touch-manipulation"
        />
      </div>

      {/* Role selection */}
      <div className="space-y-3">
        <Label htmlFor={`role-${member.id}`} className="text-sm font-medium">
          Support Role
        </Label>
        <Select value={role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
          <SelectTrigger className="w-full h-11 touch-manipulation">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="core">{ROLE_DISPLAY_NAMES.core}</SelectItem>
            <SelectItem value="nonCore">{ROLE_DISPLAY_NAMES.nonCore}</SelectItem>
            <SelectItem value="afk">{ROLE_DISPLAY_NAMES.afk}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Keywords input - only visible for Non-core members */}
      {role === "nonCore" && (
        <div className="space-y-3">
          <Label htmlFor={`keywords-${member.id}`} className="text-sm font-medium">
            Auto-assign Keywords
          </Label>
          <Input
            id={`keywords-${member.id}`}
            value={keywordsInput}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="Enter keywords separated by commas"
            className="w-full h-11 touch-manipulation"
          />
        </div>
      )}
    </div>
  );
};

export default TeamMemberCard;
