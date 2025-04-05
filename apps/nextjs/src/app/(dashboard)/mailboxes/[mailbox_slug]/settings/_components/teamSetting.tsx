"use client";

import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import SectionWrapper from "./sectionWrapper";
import TeamMemberRow, { type TeamMember } from "./teamMemberRow";

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const { data: teamMembers = [], isLoading } = api.mailbox.members.list.useQuery({ mailboxSlug });
  const utils = api.useUtils();

  const { mutate: inviteMemberMutation } = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `${emailInput} was invited to join the organization`,
        variant: "success",
      });

      setEmailInput("");
      setIsInviting(false);

      // Invalidate the members list query to refresh data after new invite
      utils.mailbox.members.list.invalidate({ mailboxSlug });
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
                teamMembers.map((member) => <TeamMemberRow key={member.id} member={member} mailboxSlug={mailboxSlug} />)
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
