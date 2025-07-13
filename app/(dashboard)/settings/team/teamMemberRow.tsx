"use client";

import { Loader, Save, SquarePen, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
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
  const [isEditing, setIsEditing] = useState(false);

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

  const { mutate: updateMemberAllFields, isPending: isSaving } = api.mailbox.members.update.useMutation({
    onSuccess: (data) => {
      utils.mailbox.members.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return updateMember(oldData, member, {
          displayName: data.user.displayName,
          role: data.user.role,
          permissions: data.user.permissions,
          keywords: data.user.keywords,
        });
      });
      toast.success("Member updated");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update member", { description: error.message });
    },
  });

  const handleSave = () => {
    updateMemberAllFields({
      userId: member.id,
      displayName: displayNameInput,
      role,
      permissions,
      keywords: localKeywords,
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setDisplayNameInput(member.displayName || "");
      setRole(member.role);
      setPermissions(member.permissions);
      setKeywordsInput(member.keywords.join(", "));
      setLocalKeywords(member.keywords);
    }
    setIsEditing(!isEditing);
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
        <div className="w-full min-w-[120px]">
          {(isAdmin || member.id === currentUser?.id) && isEditing ? (
            <Input
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Enter display name"
              className="w-full max-w-sm"
            />
          ) : (
            <span>{member.displayName || "No display name"}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-[120px]">
          {isAdmin && isEditing ? (
            <Select value={permissions} onValueChange={(value) => setPermissions(value)}>
              <SelectTrigger className="w-full">
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
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-[120px]">
          {isAdmin && isEditing ? (
            <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
              <SelectTrigger className="w-full">
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
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-[120px]">
          {isAdmin && isEditing ? (
            <Input
              value={keywordsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                setKeywordsInput(value);
                const newKeywords = value
                  .split(",")
                  .map((k: string) => k.trim())
                  .filter(Boolean);
                setLocalKeywords(newKeywords);
              }}
              placeholder="Enter keywords separated by commas"
              className={role === "nonCore" ? "" : "invisible"}
            />
          ) : (
            <span className={`text-muted-foreground ${role === "nonCore" ? "" : "invisible"}`}>
              {member.keywords.length > 0 ? member.keywords.join(", ") : ""}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {(isAdmin || member.id === currentUser?.id) && (<Button variant="ghost" size="sm" iconOnly onClick={isEditing ? handleSave : handleEditToggle}>
            {isEditing ? (
              isSaving ? (
                <>
                  <span className="sr-only">Saving...</span>
                  <Loader className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  <span className="sr-only">Save</span>
                  <Save className="h-4 w-4" />
                </>
              )
            ) : (
              <>
                <span className="sr-only">Edit</span>
                <SquarePen className="h-4 w-4" />
              </>
            )}
            </Button>
          )}
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
        </div>
      </TableCell>
    </TableRow>
  );
};

export default TeamMemberRow;
