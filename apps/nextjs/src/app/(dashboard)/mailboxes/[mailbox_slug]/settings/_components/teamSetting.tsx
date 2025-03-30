"use client";

import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/trpc/react";
import SectionWrapper from "./sectionWrapper";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  status: "Core" | "Non-core" | "AFK";
  keywords: string[];
}

const initialTeamMembers: TeamMember[] = [
  { id: "1", name: "Naz Avo", email: "naz@example.com", status: "Non-core", keywords: ["avos", "technical"] },
  { id: "2", name: "Raphael Costa", email: "raphael@example.com", status: "Core", keywords: ["technical", "bug"] },
  { id: "3", name: "Sahil Lavingia", email: "sahil@example.com", status: "AFK", keywords: [] },
  { id: "4", name: "Jono M", email: "Jono@example.com", status: "Non-core", keywords: ["sales", "marketing"] },
  { id: "5", name: "Security Team", email: "security@example.com", status: "Core", keywords: ["security", "breach"] },
];

type TeamAutoAssignSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamAutoAssignSettingProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const addTeamMember = () => {
    if (newMemberName && newMemberEmail) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: newMemberName,
        email: newMemberEmail,
        status: "Non-core",
        keywords: [],
      };
      setTeamMembers([...teamMembers, newMember]);
      setNewMemberName("");
      setNewMemberEmail("");

      toast({
        title: "Team member added",
        variant: "success",
      });
    }
  };

  const updateTeamMemberStatus = (memberId: string, status: "Core" | "Non-core" | "AFK") => {
    setTeamMembers(teamMembers.map((member) => (member.id === memberId ? { ...member, status } : member)));
  };

  const updateTeamMemberKeywords = (memberId: string, newKeywords: string) => {
    setTeamMembers(
      teamMembers.map((member) =>
        member.id === memberId ? { ...member, keywords: newKeywords.split(",").map((k) => k.trim()) } : member,
      ),
    );
  };

  return (
    <>
      <SectionWrapper
        title="Manage Team Members"
        description="Add, update, and organize team members for efficient ticket assignment"
      >
        <></>
      </SectionWrapper>
      <div className="w-full space-y-4 mt-8">
        <div className="flex items-center space-x-2">
          <Input placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
          <Input placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
          <Button onClick={addTeamMember} variant="subtle">
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Support role</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.status}
                      onValueChange={(value: "Core" | "Non-core" | "AFK") => updateTeamMemberStatus(member.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="Non-core">Non-core</SelectItem>
                        <SelectItem value="AFK">AFK</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {member.status === "Non-core" ? (
                      <Input
                        value={member.keywords.join(", ")}
                        onChange={(e) => updateTeamMemberKeywords(member.id, e.target.value)}
                        placeholder="Enter keywords separated by commas"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {member.status === "Core" ? "Not applicable for Core role" : "Not applicable for AFK role"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove this team member?")) {
                          setTeamMembers(teamMembers.filter((tm) => tm.id !== member.id));
                          toast({
                            title: "Team member removed",
                            variant: "success",
                          });
                        }
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
