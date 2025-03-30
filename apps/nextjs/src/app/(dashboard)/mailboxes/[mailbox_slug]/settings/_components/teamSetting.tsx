"use client";

import { useState, useEffect, useRef } from "react";
import { PlusCircleIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";
import LoadingSpinner from "@/components/loadingSpinner";
import SectionWrapper from "./sectionWrapper";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  status: "Core" | "Non-core" | "AFK";
  keywords: string[];
}

type TeamSettingProps = {
  mailboxSlug: string;
};

const TeamSetting = ({ mailboxSlug }: TeamSettingProps) => {
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<"name" | "email" | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep track of keywords being edited to avoid unnecessary updates
  const [keywordsBeingEdited, setKeywordsBeingEdited] = useState<Record<string, string>>({});

  // Debounced API call for updating keywords - 800ms is a good balance
  const debouncedUpdateKeywords = useDebouncedCallback((memberId: string, keywords: string[], role: string) => {
    updateTeamMemberRole({
      mailboxSlug,
      userId: memberId,
      role: role as "Core" | "Non-core" | "AFK",
      keywords: keywords,
    });
  }, 800);

  const { data: organizationMembers = [], isLoading: isLoadingMembers } = api.organization.getMembers.useQuery();
  
  // Fetch mailbox team members from the backend
  const { data: mailboxMembers = [], isLoading: isLoadingMailboxMembers } = api.mailbox.getMembers.useQuery(
    { mailboxSlug },
    { enabled: !!mailboxSlug }
  );
  
  // Convert mailbox members to TeamMember format
  const convertedMembers: TeamMember[] = mailboxMembers.map(member => ({
    id: member.id,
    name: member.displayName || member.name || "Unnamed User",
    email: member.email || "",
    status: member.status || "AFK",
    keywords: member.keywords || [],
  }));
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Update team members when data is loaded from backend
  useEffect(() => {
    if (mailboxMembers.length > 0) {
      setTeamMembers(convertedMembers);
    }
  }, [mailboxMembers]);

  const filteredMembers = organizationMembers.filter(member => {
    if (member.email && teamMembers.some(tm => tm.email.toLowerCase() === member.email?.toLowerCase())) {
      return false;
    }

    const nameMatches = nameInput.trim() === "" || 
      member.displayName?.toLowerCase().includes(nameInput.toLowerCase());
    const emailMatches = emailInput.trim() === "" || 
      member.email?.toLowerCase().includes(emailInput.toLowerCase());
    return nameMatches && emailMatches;
  });

  const { mutate: addTeamMember, isLoading: isAddingTeamMember } = api.mailbox.addTeamMember.useMutation({
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "The team member was successfully added to the mailbox",
        variant: "success",
      });
      setNameInput("");
      setEmailInput("");
      setIsDropdownOpen(false);
      setActiveInput(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to add team member",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const inviteMember = () => {
    setIsInviting(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: `invited-${Date.now()}`,
        name: nameInput,
        email: emailInput,
        status: "AFK",
        keywords: [],
      };
      setTeamMembers([...teamMembers, newMember]);
      setNameInput("");
      setEmailInput("");
      setIsDropdownOpen(false);
      setActiveInput(null);
      setIsInviting(false);
      toast({
        title: "Invitation sent",
        description: `${emailInput} was invited and added as an AFK team member`,
        variant: "success",
      });
    }, 1000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setActiveInput(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddTeamMember = async (member: typeof organizationMembers[0]) => {
    if (teamMembers.some(tm => tm.id === member.id)) {
      toast({
        title: "Team member already exists",
        variant: "destructive",
      });
      return;
    }
    try {
      await addTeamMember({
        mailboxSlug,
        userId: member.id
      });
    } catch (error) {
      toast({
        title: "Failed to add team member",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return;
    }
    const newMember: TeamMember = {
      id: member.id,
      name: member.displayName || "Unnamed User",
      email: member.email || "",
      status: "AFK",
      keywords: [],
    };
    setTeamMembers([...teamMembers, newMember]);
    setNameInput("");
    setEmailInput("");
    setIsDropdownOpen(false);
    setActiveInput(null);
  };

  const updateTeamMemberStatus = (memberId: string, status: "Core" | "Non-core" | "AFK") => {
    setTeamMembers(teamMembers.map((member) => (member.id === memberId ? { ...member, status } : member)));
  };

  const updateTeamMemberKeywords = (memberId: string, newKeywords: string) => {
    const keywords = newKeywords.split(",").map((k) => k.trim());

    setTeamMembers(teamMembers.map((member) => (member.id === memberId ? { ...member, keywords } : member)));

    // Find the current member status to include in the update
    const member = teamMembers.find((m) => m.id === memberId);
    if (member) {
      debouncedUpdateKeywords(memberId, keywords, member.status);
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);
  const isValidName = nameInput.trim().length > 0;
  const noMatchingMembers = !filteredMembers.some(member => 
    member.email?.toLowerCase() === emailInput.toLowerCase()
  );
  const canAddMember = isValidEmail && isValidName && noMatchingMembers && !isInviting && !isAddingTeamMember;

  const handleInputFocus = (input: "name" | "email") => {
    setActiveInput(input);
    setIsDropdownOpen(true);
  };

  const showDropdown = isDropdownOpen && 
    (filteredMembers.length > 0 || (isValidEmail && isValidName && noMatchingMembers));

  return (
    <>
      <SectionWrapper
        title="Manage Team Members"
        description="Add, update, and organize team members for efficient ticket assignment"
      >
        <></>
      </SectionWrapper>

      <div className="w-full space-y-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name-input">Name</Label>
            <div className="relative">
              <Input
                id="name-input"
                placeholder="Enter name..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onFocus={() => handleInputFocus("name")}
                disabled={isInviting}
              />
              {nameInput && (
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setNameInput("")}
                  disabled={isInviting}
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-input">Email</Label>
            <div className="relative">
              <Input
                id="email-input"
                placeholder="Enter email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onFocus={() => handleInputFocus("email")}
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
            <Button 
              onClick={inviteMember}
              disabled={!canAddMember}
              className="w-full"
            >
              {isInviting ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                  Adding...
                </span>
              ) : (
                <>
                  <PlusCircleIcon className="mr-2 h-4 w-4" />
                  Add Member
                </>
              )}
            </Button>
          </div>
          
          {showDropdown && (
            <div className="relative md:col-span-2">
              <div 
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {isLoadingMembers ? (
                  <div className="px-4 py-2 text-sm text-center">
                    <LoadingSpinner />
                  </div>
                ) : filteredMembers.length > 0 ? (
                  <div>
                    <div className="px-3 py-2 text-xs text-muted-foreground font-semibold bg-muted border-b">
                      Matching Users
                    </div>
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => handleAddTeamMember(member)}
                      >
                        <div>
                          <div className="font-medium">{member.displayName}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                        <Button size="sm" variant="ghost">
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : canAddMember && (
                  <div className="px-4 py-2 text-sm text-center">
                    No matching users found. Click "Add Member" to invite.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Support role</TableHead>
                <TableHead>Auto-assign keywords</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMailboxMembers ? (
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
                    No team members added yet. Use the form above to add members.
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => (
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
                        {member.status === "Non-core" && (
                          <Input
                            value={member.keywords.join(", ")}
                            onChange={(e) => updateTeamMemberKeywords(member.id, e.target.value)}
                            placeholder="Enter keywords separated by commas"
                          />
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
