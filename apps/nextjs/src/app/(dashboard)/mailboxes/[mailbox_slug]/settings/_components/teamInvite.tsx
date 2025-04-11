"use client";

import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";

type TeamInviteProps = {
  mailboxSlug: string;
  teamMembers: Array<{ id: string; email?: string }>;
  onInviteSuccess?: () => void;
};

export function TeamInvite({ mailboxSlug, teamMembers, onInviteSuccess }: TeamInviteProps) {
  const [emailInput, setEmailInput] = useState("");

  const utils = api.useUtils();

  const { mutate: inviteMemberMutation, isPending: isInviting } = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `${emailInput} was invited to join the organization`,
        variant: "success",
      });

      setEmailInput("");

      // Invalidate the members list query to refresh data after new invite
      utils.mailbox.members.list.invalidate({ mailboxSlug });

      // Notify the parent component
      onInviteSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteMember = () => {
    if (!isValidEmail || isInviting) {
      return;
    }

    // Check if email already exists in the organization
    const existingMember = teamMembers.find((member) => member.email?.toLowerCase() === emailInput.toLowerCase());

    if (existingMember) {
      // User already exists in organization
      toast({
        title: "Member already exists",
        description: "This user is already in your organization",
        variant: "destructive",
      });
    } else {
      inviteMemberMutation({
        email: emailInput,
      });
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);
  const canAddMember = isValidEmail && !isInviting;

  return (
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
  );
}
