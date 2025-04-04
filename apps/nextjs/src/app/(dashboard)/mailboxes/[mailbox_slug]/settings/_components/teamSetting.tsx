"use client";

import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";
import SectionWrapper from "./sectionWrapper";

interface TeamMember {
  id: string;
  displayName: string;
  email: string | undefined;
  role: "Core" | "Non-core" | "AFK";
  keywords: string[];
}

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [keywordsBeingEdited, setKeywordsBeingEdited] = useState<Record<string, string>>({});

  const { data: teamMembers = [], isLoading } = api.mailbox.members.list.useQuery({ mailboxSlug });
  const utils = api.useUtils();

  // Debounced API call for updating keywords - 800ms is a good balance
  const debouncedUpdateKeywords = useDebouncedCallback((memberId: string, keywords: string[], role: string) => {
    updateTeamMember({
      mailboxSlug,
      userId: memberId,
      role: role as "Core" | "Non-core" | "AFK",
      keywords,
    });
  }, 800);

  const { mutate: updateTeamMember } = api.mailbox.members.update.useMutation({
    onSuccess: (updatedMember) => {
      // Update the cached data with the server response
      utils.mailbox.members.list.setData({ mailboxSlug }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((member) => (member.id === updatedMember.id ? updatedMember : member));
      });

      // Reset keywords being edited if keywords were updated
      if (updatedMember.role !== "Non-core") {
        setKeywordsBeingEdited((prev) => {
          const updated = { ...prev };
          delete updated[updatedMember.id];
          return updated;
        });
      } else {
        setKeywordsBeingEdited((prev) => ({
          ...prev,
          [updatedMember.id]: updatedMember.keywords.join(", "),
        }));
      }

      toast({
        title: "Team member role updated",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update team member role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: inviteMemberMutation } = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `${emailInput} was invited to join the organization`,
        variant: "success",
      });

      setEmailInput("");
      setIsInviting(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
      setIsInviting(false);
    },
  });

  const inviteMember = () => {
    if (!isValidEmail || isInviting) {
      return;
    }

    setIsInviting(true);

    // Check if email already exists in the organization
    const existingMember = teamMembers.find((member) => member.email?.toLowerCase() === emailInput.toLowerCase());

    if (existingMember) {
      // User already exists in organization
      toast({
        title: "Member already exists",
        description: "This user is already in your organization",
        variant: "destructive",
      });
      setIsInviting(false);
    } else {
      inviteMemberMutation({
        email: emailInput,
      });
    }
  };

  const updateTeamMemberRole = (memberId: TeamMember["id"], role: TeamMember["role"]) => {
    // Find the current member to get existing keywords
    const member = teamMembers.find((m) => m.id === memberId);

    if (!member) return;

    // If not Non-core role, clear keywords
    const keywords = role !== "Non-core" ? [] : member.keywords || [];

    // Update on the server
    updateTeamMember({
      mailboxSlug,
      userId: memberId,
      role,
      keywords,
    });
  };

  const updateTeamMemberKeywords = (memberId: string, newKeywords: string) => {
    const keywords = newKeywords.split(",").map((k) => k.trim());

    // Find the current member role to include in the update
    const member = teamMembers.find((m) => m.id === memberId);
    if (member) {
      debouncedUpdateKeywords(memberId, keywords, member.role);
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);
  const canAddMember = isValidEmail && !isInviting;

  return (
    <>
      <SectionWrapper
        title="Manage Team Members"
        description="Add and organize team members for efficient ticket assignment"
      >
        <></>
      </SectionWrapper>

      <div className="w-full space-y-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email-input">Invite New Member</Label>
            <div className="relative">
              <Input
                id="email-input"
                placeholder="Enter email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                disabled={isInviting}
              />
              {emailInput && (
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setEmailInput("")}
                  disabled={isInviting}
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2 flex items-end">
            <Button onClick={inviteMember} disabled={!canAddMember} className="w-full">
              {isInviting ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                  Inviting...
                </span>
              ) : (
                <>
                  <PlusCircleIcon className="mr-2 h-4 w-4" />
                  Invite New Member
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Support role</TableHead>
                <TableHead>Auto-assign keywords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                      <LoadingSpinner size="md" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No team members in your organization yet. Use the form above to invite new members.
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.displayName || ""}</TableCell>
                    <TableCell>{member.email || ""}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value: "Core" | "Non-core" | "AFK") => updateTeamMemberRole(member.id, value)}
                      >
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
                      {member.role === "Non-core" && (
                        <Input
                          value={keywordsBeingEdited[member.id] || member.keywords.join(", ")}
                          onChange={(e) => {
                            setKeywordsBeingEdited({
                              ...keywordsBeingEdited,
                              [member.id]: e.target.value,
                            });
                            updateTeamMemberKeywords(member.id, e.target.value);
                          }}
                          placeholder="Enter keywords separated by commas"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>Note: Core members are assigned tickets in a round-robin style.</p>
          <p>Non-core members are only assigned if the ticket tags match their keywords.</p>
          <p>AFK members do not receive any ticket assignments.</p>
        </div>
      </div>
    </>
  );
};

export default TeamSetting;
