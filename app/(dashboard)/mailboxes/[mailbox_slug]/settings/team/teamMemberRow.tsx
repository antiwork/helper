"use client";

import { useEffect, useState } from "react";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { type UserRole } from "@/lib/data/user";
import { showErrorToast } from "@/lib/utils/toast";
import { api } from "@/trpc/react";

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  core: "Core",
  nonCore: "Non-core",
  afk: "Away",
};

export const PERMISSIONS_DISPLAY_NAMES: Record<string, string> = {
  member: "Member",
  admin: "Admin",
};

interface TeamMember {
  id: string;
  displayName: string;
  email: string | undefined;
  role: UserRole;
  keywords: string[];
  permissions: string;
}

type TeamMemberRowProps = {
  member: TeamMember;
  mailboxSlug: string;
  canChangePermissions: boolean;
};

const updateMember = (
  data: RouterOutputs["mailbox"]["members"]["list"],
  member: TeamMember,
  updates: Partial<TeamMember>,
) => ({
  ...data,
  members: data.members.map((m) => (m.id === member.id ? { ...m, ...updates } : m)),
});

const TeamMemberRow = ({ member, mailboxSlug, canChangePermissions }: TeamMemberRowProps) => {
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<UserRole>(member.role);
  const [permissions, setPermissions] = useState<string>(member.permissions);
  const [localKeywords, setLocalKeywords] = useState<string[]>(member.keywords);
  const [displayNameInput, setDisplayNameInput] = useState(member.displayName || "");

  // Separate saving indicators for each operation type
  const displayNameSaving = useSavingIndicator();
  const roleSaving = useSavingIndicator();
  const permissionsSaving = useSavingIndicator();
  const keywordsSaving = useSavingIndicator();

  const utils = api.useUtils();

  useEffect(() => {
    setKeywordsInput(member.keywords.join(", "));
    setRole(member.role);
    setPermissions(member.permissions);
    setLocalKeywords(member.keywords);
    setDisplayNameInput(member.displayName || "");
  }, [member.keywords, member.role, member.permissions, member.displayName]);

  // Separate mutations for each operation type
  const { mutate: updateDisplayName } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Only update displayName field to avoid race conditions
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { displayName: data.user?.displayName ?? "" });
      });
      displayNameSaving.setState("saved");
    },
    onError: (error) => {
      displayNameSaving.setState("error");
      showErrorToast("Failed to update display name", error);
      setDisplayNameInput(member.displayName || "");
    },
  });

  const { mutate: updateRole } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Update both role and keywords since role changes can affect keywords
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { role: data.user?.role, keywords: data.user?.keywords });
      });
      roleSaving.setState("saved");
    },
    onError: (error) => {
      roleSaving.setState("error");
      showErrorToast("Failed to update role", error);
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
        return updateMember(oldData, member, { keywords: data.user?.keywords });
      });
      keywordsSaving.setState("saved");
    },
    onError: (error) => {
      keywordsSaving.setState("error");
      showErrorToast("Failed to update keywords", error);
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  const { mutate: updatePermissions } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { permissions: data.permissions });
      });
      permissionsSaving.setState("saved");
    },
    onError: (error) => {
      permissionsSaving.setState("error");
      toast({
        title: "Failed to update permissions",
        description: error.message,
        variant: "destructive",
      });
      setPermissions(member.permissions);
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

  const handlePermissionsChange = (newPermissions: string) => {
    setPermissions(newPermissions);
    permissionsSaving.setState("saving");
    updatePermissions({
      mailboxSlug,
      userId: member.id,
      permissions: newPermissions,
    });
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
        <Input
          value={displayNameInput}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="Enter display name"
          className="w-full max-w-sm"
        />
      </TableCell>
      <TableCell>
        {canChangePermissions ? (
          <Select value={permissions} onValueChange={handlePermissionsChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Permissions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">{PERMISSIONS_DISPLAY_NAMES.member}</SelectItem>
              <SelectItem value="admin">{PERMISSIONS_DISPLAY_NAMES.admin}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span>{PERMISSIONS_DISPLAY_NAMES[member.permissions]}</span>
        )}
      </TableCell>
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
        <div className="w-[200px]">
          <Input
            value={keywordsInput}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="Enter keywords separated by commas"
            className={role === "nonCore" ? "" : "invisible"}
          />
        </div>
      </TableCell>
      <TableCell className="w-[120px]">
        <div className="flex items-center gap-2">
          <SavingIndicator state={displayNameSaving.state} />
          <SavingIndicator state={permissionsSaving.state} />
          <SavingIndicator state={roleSaving.state} />
          {role === "nonCore" && <SavingIndicator state={keywordsSaving.state} />}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
