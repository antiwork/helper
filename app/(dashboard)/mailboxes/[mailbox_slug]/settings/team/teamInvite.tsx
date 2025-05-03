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
  teamMembers: { id: string; email?: string }[];
};

export function TeamInvite({ mailboxSlug, teamMembers }: TeamInviteProps) {
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

      utils.mailbox.members.list.invalidate({ mailboxSlug });
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

    const existingMember = teamMembers.find((member) => member.email?.toLowerCase() === emailInput.toLowerCase());

    if (existingMember) {
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
    <div className="flex gap-4">
      <div className="relative flex-1">
        <Label className="sr-only" htmlFor="email-input">
          Invite New Member
        </Label>
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
      <Button onClick={inviteMember} disabled={!canAddMember}>
        {isInviting ? (
          <>Inviting...</>
        ) : (
          <>
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Invite New Member
          </>
        )}
      </Button>
    </div>
  );
}
