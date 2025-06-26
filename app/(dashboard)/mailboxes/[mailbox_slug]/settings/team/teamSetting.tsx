"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import LoadingSpinner from "@/components/loadingSpinner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import { AddMember } from "./addMember";
import TeamMemberRow, { ROLE_DISPLAY_NAMES } from "./teamMemberRow";

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const { data: teamMembers = [], isLoading } = api.mailbox.members.list.useQuery({ mailboxSlug });
  const [searchTerm, setSearchTerm] = useState("");
  const utils = api.useUtils();

  const filteredTeamMembers = teamMembers.filter((member) => {
    const searchString = searchTerm.toLowerCase();
    return (
      member.email?.toLowerCase().includes(searchString) ||
      member.displayName?.toLowerCase().includes(searchString) ||
      member.keywords.some((keyword) => keyword.toLowerCase().includes(searchString))
    );
  });

  const { data, isFetching: isFetchingConversations } = api.mailbox.conversations.list.useQuery({
    mailboxSlug,
  });

  const { mutateAsync: updateConversation, isPending: isUpdating } = api.mailbox.conversations.update.useMutation({
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating conversation",
        description: error.message,
      });
    }
  });

    const { mutate: removeTeamMember, isPending: isRemoving } = api.mailbox.members.delete.useMutation({
      onSuccess: () => {
        toast({
          title: "Team member removed",
          variant: "success",
        });
        utils.mailbox.members.list.invalidate({ mailboxSlug });
      },
      onError: (error) => {
        toast({
          title: "Failed to remove member",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const handleAssignTicket = async (
    assignedTo: { id: string; displayName: string } | { ai: true } | null,
    conversationSlug: string,
  ) => {
    if (assignedTo && "ai" in assignedTo) {
      await updateConversation({ mailboxSlug, conversationSlug, assignedToAI: true });
    } else {
      await updateConversation({
        mailboxSlug,
        conversationSlug,
        assignedToAI: false,
        assignedToId: assignedTo?.id ?? null,
      });
    }
  };

  const handleFinalReassignAndDelete = async (id: string) => {
    try {
      await utils.mailbox.members.list.invalidate({ mailboxSlug });
      removeTeamMember({ id, mailboxSlug });
      toast({ title: "Member removed", variant: "success" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to reassign conversations" });
    }
  };

  return (
    <SectionWrapper
      title="Manage Team Members"
      description="Add and organize team members for efficient ticket assignment"
      fullWidth
    >
      <div className="w-full space-y-6">
        <AddMember mailboxSlug={mailboxSlug} teamMembers={teamMembers} />

        {teamMembers.length > 0 && (
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            iconsPrefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[180px]">Support role</TableHead>
                <TableHead className="min-w-[200px]">Auto-assign keywords</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
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
              ) : filteredTeamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {searchTerm
                      ? `No team members found matching "${searchTerm}"`
                      : "No team members in your organization yet. Use the form above to invite new members."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeamMembers.map((member) => {
                  const memberConversations = (data?.conversations ?? []).filter(
                    (conversation) => conversation.assignedToId === member.id,
                  );

                  return (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      mailboxSlug={mailboxSlug}
                      conversations={memberConversations}
                      updateConversation={handleAssignTicket}
                      onFinalReassignAndDelete={handleFinalReassignAndDelete}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>Note:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{ROLE_DISPLAY_NAMES.core} members are assigned tickets in a round-robin style.</li>
            <li>{ROLE_DISPLAY_NAMES.nonCore} members are only assigned if the ticket tags match their keywords.</li>
            <li>{ROLE_DISPLAY_NAMES.afk} members do not receive any ticket assignments.</li>
            <li>Only {ROLE_DISPLAY_NAMES.core} support team members will be mentioned explicitly in weekly reports.</li>
          </ul>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default TeamSetting;
