"use client";

import { Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useSession } from "@/components/useSession";
import { type UserRole } from "@/lib/data/user";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import DeleteMemberDialog from "./deleteMemberDialog";

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
  isAdmin: boolean;
};

const updateMember = (
  data: RouterOutputs["mailbox"]["members"]["list"],
  member: TeamMember,
  updates: Partial<TeamMember>,
) => ({
  ...data,
  members: data.members.map((m) => (m.id === member.id ? { ...m, ...updates } : m)),
});

const TeamMemberRow = ({ member, isAdmin }: TeamMemberRowProps) => {
  const [keywordsInput, setKeywordsInput] = useState(member.keywords.join(", "));
  const [role, setRole] = useState<UserRole>(member.role);
  const [permissions, setPermissions] = useState<string>(member.permissions);
  const [localKeywords, setLocalKeywords] = useState<string[]>(member.keywords);
  const [displayNameInput, setDisplayNameInput] = useState(member.displayName || "");
  const { user: currentUser } = useSession() ?? {};

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

  const { data: count } = api.mailbox.conversations.count.useQuery({
    assignee: [member.id],
  });

  // Separate mutations for each operation type
  const { mutate: updateDisplayName } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Only update displayName field to avoid race conditions
      utils.mailbox.members.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { displayName: data.user?.displayName ?? "" });
      });
      displayNameSaving.setState("saved");
    },
    onError: (error) => {
      displayNameSaving.setState("error");
      toast.error("Failed to update display name", { description: error.message });
      setDisplayNameInput(member.displayName || "");
    },
  });

  const { mutate: updateRole } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Update both role and keywords since role changes can affect keywords
      utils.mailbox.members.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { role: data.user?.role, keywords: data.user?.keywords });
      });
      roleSaving.setState("saved");
    },
    onError: (error) => {
      roleSaving.setState("error");
      toast.error("Failed to update role", { description: error.message });
      setRole(member.role);
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  const { mutate: updateKeywords } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      // Only update keywords field to avoid race conditions
      utils.mailbox.members.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { keywords: data.user?.keywords });
      });
      keywordsSaving.setState("saved");
    },
    onError: (error) => {
      keywordsSaving.setState("error");
      toast.error("Failed to update keywords", { description: error.message });
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    },
  });

  const { mutate: updatePermissions } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      utils.mailbox.members.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, { permissions: data.user.permissions });
      });
      permissionsSaving.setState("saved");
    },
    onError: (error) => {
      permissionsSaving.setState("error");
      toast.error("Failed to update permissions", { description: error.message });
      setPermissions(member.permissions);
    },
  });

  // Debounced function for keyword updates
  const debouncedUpdateKeywords = useDebouncedCallback((newKeywords: string[]) => {
    keywordsSaving.setState("saving");
    updateKeywords({
      userId: member.id,
      keywords: newKeywords,
    });
  }, 500);

  const debouncedUpdateDisplayName = useDebouncedCallback((newDisplayName: string) => {
    displayNameSaving.setState("saving");
    updateDisplayName({
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
        {isAdmin || member.id === currentUser?.id ? (
          <Input
            value={displayNameInput}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            placeholder="Enter display name"
            className="w-full max-w-lg"
          />
        ) : (
          <span>{member.displayName || "No display name"}</span>
        )}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <Select value={permissions} onValueChange={handlePermissionsChange}>
            <SelectTrigger className="w-[100px]">
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
        {isAdmin ? (
          <Select value={role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="core">{ROLE_DISPLAY_NAMES.core}</SelectItem>
              <SelectItem value="nonCore">{ROLE_DISPLAY_NAMES.nonCore}</SelectItem>
              <SelectItem value="afk">{ROLE_DISPLAY_NAMES.afk}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span>{ROLE_DISPLAY_NAMES[member.role]}</span>
        )}
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <div className="w-[180px]">
            <Input
              value={keywordsInput}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="Enter keywords separated by commas"
              className={role === "nonCore" ? "" : "invisible"}
            />
          </div>
        ) : (
          <span className={`text-muted-foreground ${role === "nonCore" ? "" : "invisible"}`}>
            {member.keywords.length > 0 ? member.keywords.join(", ") : ""}
          </span>
        )}
      </TableCell>
      <TableCell>
        {currentUser?.id !== member.id && isAdmin && (
          <DeleteMemberDialog
            member={{ id: member.id, displayName: member.displayName }}
            description={
              count?.total && count?.total > 0
                ? `You are about to remove ${member.displayName || member.email}. This member currently has ${count?.total} conversations assigned to them. Please reassign the tickets before deleting the member.`
                : `Are you sure you want to remove ${member.displayName || member.email}?`
            }
            assignedConversationCount={count?.total || 0}
          >
            <Button variant="ghost" size="sm" iconOnly>
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </DeleteMemberDialog>
        )}
      </TableCell>
      <TableCell className="min-w-[120px]">
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
