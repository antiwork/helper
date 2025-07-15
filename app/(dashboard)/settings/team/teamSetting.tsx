"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/useSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { AddMember } from "./addMember";
import TeamMemberRow from "./teamMemberRow";
import { TeamSettingLoadingSkeleton } from "./teamSettingLoadingSkeleton";

const TeamSetting = () => {
  const { data, isLoading } = api.mailbox.members.list.useQuery();
  const teamMembers = data?.members ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useSession();

  const filteredTeamMembers = teamMembers.filter((member) => {
    const searchString = searchTerm.toLowerCase();
    return (
      member.email?.toLowerCase().includes(searchString) ||
      member.displayName?.toLowerCase().includes(searchString) ||
      member.keywords.some((keyword) => keyword.toLowerCase().includes(searchString))
    );
  });

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Add and organize team members for efficient ticket assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {user?.permissions === "admin" && <AddMember teamMembers={teamMembers} />}
          <div className="space-y-4">
            {teamMembers.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="w-[120px]">Permissions</TableHead>
                    <TableHead className="w-[120px]">Support role</TableHead>
                    <TableHead className="min-w-[200px]">Auto-assign keywords</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TeamSettingLoadingSkeleton />
                  ) : filteredTeamMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <p className="text-sm text-muted-foreground">
                            {searchTerm
                              ? `No team members found matching "${searchTerm}"`
                              : "No team members in your organization yet"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamMembers.map((member) => (
                      <TeamMemberRow key={member.id} member={member} isAdmin={user?.permissions === "admin"} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
      <CardHeader>
        <CardTitle>Support Team Assignment Rules</CardTitle>
        <CardDescription>Understanding how tickets are assigned to team members</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">Core Members:</span>
            Assigned tickets in a round-robin style
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">Non-core Members:</span>
            Only assigned tickets when tags match their keywords
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">Away Members:</span>
            Do not receive any ticket assignments
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">Weekly Reports:</span>
            Only Core support team members are mentioned explicitly
          </li>
        </ul>
      </CardContent>
    </Card>
    </div>
  );
};

export default TeamSetting;
