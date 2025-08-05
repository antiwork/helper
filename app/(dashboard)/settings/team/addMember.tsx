"use client";

import { PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/trpc/react";

type TeamInviteProps = {
  teamMembers: { id: string; email?: string }[];
};

export function AddMember({ teamMembers }: TeamInviteProps) {
  const [emailInput, setEmailInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [permissions, setPermissions] = useState<"member" | "admin" | undefined>(undefined);
  const [emailTouched, setEmailTouched] = useState(false);

  const utils = api.useUtils();

  const { mutate: addMemberMutation, isPending: isAdding } = api.organization.addMember.useMutation({
    onSuccess: () => {
      toast.success("Team member added", { description: `${emailInput} can now log in` });

      setEmailInput("");
      setDisplayNameInput("");
      setPermissions(undefined);

      utils.mailbox.members.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to send invitation", { description: error.message });
    },
  });

  const inviteMember = () => {
    if (!canAddMember || isAdding) {
      return;
    }

    const existingMember = teamMembers.find((member) => member.email?.toLowerCase() === emailInput.toLowerCase());

    if (existingMember) {
      toast.error("Member already exists", { description: "This user is already in your organization" });
    } else {
      addMemberMutation({
        email: emailInput,
        displayName: displayNameInput,
        permissions,
      });
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);
  const canAddMember = isValidEmail && displayNameInput.trim().length > 0 && !isAdding && permissions;

  return (
    <form
      className="flex gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        inviteMember();
      }}
    >
      <div className="relative flex-1">
        <Label className="sr-only" htmlFor="email-input">
          Email Address
        </Label>
        <Input
          id="email-input"
          placeholder="Email address"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          disabled={isAdding}
        />
        {emailInput && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setEmailInput("")}
            disabled={isAdding}
          >
            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        )}
        {emailInput && emailTouched && !isValidEmail && (
          <div className="text-xs text-red-500 mt-1">Please enter a valid email address</div>
        )}
      </div>
      <div className="relative flex-1">
        <Label className="sr-only" htmlFor="display-name-input">
          Display Name
        </Label>
        <Input
          id="display-name-input"
          placeholder="Name"
          value={displayNameInput}
          onChange={(e) => setDisplayNameInput(e.target.value)}
          disabled={isAdding}
        />
        {displayNameInput && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setDisplayNameInput("")}
            disabled={isAdding}
          >
            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="relative flex-1">
        <Label className="sr-only" htmlFor="permissions-input">
          Permissions
        </Label>
        <Select value={permissions} onValueChange={(value: string) => setPermissions(value as "member" | "admin")}>
          <SelectTrigger>
            <SelectValue placeholder="Permissions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={!canAddMember}>
        {isAdding ? (
          <>Adding...</>
        ) : (
          <>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </>
        )}
      </Button>
    </form>
  );
}
