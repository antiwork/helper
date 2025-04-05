"use client";

import LoadingSpinner from "@/components/loadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import SectionWrapper from "./sectionWrapper";
import { TeamInvite } from "./teamInvite";
import TeamMemberRow, { type TeamMember } from "./teamMemberRow";

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const { data: teamMembers = [], isLoading } = api.mailbox.members.list.useQuery({ mailboxSlug });

  return (
    <>
      <SectionWrapper
        title="Manage Team Members"
        description="Add and organize team members for efficient ticket assignment"
      >
        <></>
      </SectionWrapper>

      <div className="w-full space-y-6 mt-8">
        <TeamInvite mailboxSlug={mailboxSlug} teamMembers={teamMembers} />
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
