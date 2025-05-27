"use client";

import { useRouter } from "next/navigation";
import { getBaseUrl } from "@/components/constants";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/components/useSession";
import { getFullName } from "@/lib/auth/authUtils";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function AccountDropdown() {
  const { user } = useSession() ?? {};
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="sidebar"
                size="sm"
                iconOnly
                className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-sidebar-accent/80"
                aria-label="Account menu"
              >
                <Avatar fallback={getFullName(user)} size="sm" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {getFullName(user)}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="end" className="w-(--radix-popper-anchor-width)">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              window.open(`${getBaseUrl()}/docs`, "_blank", "noopener,noreferrer");
            }}
          >
            <span>Documentation</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
