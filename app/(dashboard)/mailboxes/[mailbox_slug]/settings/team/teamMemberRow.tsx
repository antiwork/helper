"use client";

import { useEffect } from "react";
import { useManualSave } from "@/components/hooks/useManualSave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
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
  const utils = api.useUtils();
  const { mutate: updateTeamMember } = api.mailbox.members.update.useMutation();

  const { currentData, isDirty, isLoading, updateData, handleSave, handleCancel, handleReset } = useManualSave(
    {
      keywordsInput: member.keywords.join(", "),
      role: member.role,
      localKeywords: member.keywords,
      displayNameInput: member.displayName || "",
    },
    {
      onSave: async (data) => {
        await new Promise<void>((resolve, reject) => {
          updateTeamMember(
            {
              mailboxSlug,
              userId: member.id,
              role: data.role,
              keywords: data.localKeywords,
              displayName: data.displayNameInput,
            },
            {
              onSuccess: (updatedData) => {
                utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
                  if (!oldData) return oldData;
                  return oldData.map((m) =>
                    m.id === member.id
                      ? {
                          ...m,
                          role: updatedData.role,
                          keywords: updatedData.keywords,
                          displayName: updatedData.displayName,
                        }
                      : m,
                  );
                });
                resolve();
              },
              onError: reject,
            },
          );
        });
      },
      successMessage: "Team member updated successfully",
      errorMessage: "Failed to update team member",
    },
  );

  useEffect(() => {
    handleReset({
      keywordsInput: member.keywords.join(", "),
      role: member.role,
      localKeywords: member.keywords,
      displayNameInput: member.displayName || "",
    });
  }, [member.keywords, member.role, member.displayName, handleReset]);

  const handleRoleChange = (newRole: UserRole) => {
    const newKeywords = newRole !== "nonCore" ? [] : currentData.localKeywords;

    updateData({
      role: newRole,
      keywordsInput: newRole !== "nonCore" ? "" : currentData.keywordsInput,
      localKeywords: newKeywords,
    });
  };

  const handleKeywordsChange = (value: string) => {
    const newKeywords = value
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    updateData({
      keywordsInput: value,
      localKeywords: newKeywords,
    });
  };

  const handleDisplayNameChange = (value: string) => {
    updateData({ displayNameInput: value });
  };

  return (
    <TableRow className={isDirty ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
      <TableCell>{member.email || ""}</TableCell>
      <TableCell>
        <Input
          value={currentData.displayNameInput}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="Enter display name"
          className="w-full max-w-sm"
        />
      </TableCell>
      <TableCell>
        <Select value={currentData.role} onValueChange={(value: UserRole) => handleRoleChange(value)}>
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
          value={currentData.keywordsInput}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          placeholder="Enter keywords separated by commas"
          className={currentData.role === "nonCore" ? "" : "invisible"}
        />
      </TableCell>
      <TableCell>
        {isDirty && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
