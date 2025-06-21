"use client";

import LoadingSpinner from "@/components/loadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";
import { AddMember } from "./addMember";
import TeamMemberRow, { ROLE_DISPLAY_NAMES } from "./teamMemberRow";

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const { data: teamMembers = [], isLoading } = api.mailbox.members.list.useQuery();

  return (
    <SectionWrapper
      title="Manage Team Members"
      description="Add and organize team members for efficient ticket assignment"
      fullWidth
    >
      <div className="w-full space-y-6">
        <AddMember mailboxSlug={mailboxSlug} teamMembers={teamMembers} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[180px]">Support role</TableHead>
                <TableHead className="min-w-[200px]">Auto-assign keywords</TableHead>
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
