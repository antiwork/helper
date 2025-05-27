"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { getBaseUrl } from "@/components/constants";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/components/useSession";
import { getFullName } from "@/lib/auth/authUtils";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function AccountDropdown({ trigger }: { trigger: (children: ReactNode) => ReactNode }) {
  const { user } = useSession() ?? {};
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger(<Avatar fallback={getFullName(user)} size="sm" />)}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" className="w-(--radix-popper-anchor-width)">
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
  );
}
