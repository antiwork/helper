"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { getBaseUrl } from "@/components/constants";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/components/useSession";
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
      <DropdownMenuTrigger asChild>
        {trigger(
          <>
            <Avatar fallback={user.email ?? ""} size="sm" />
            <span className="grow truncate text-base">{user.user_metadata.name ?? user.email}</span>
            <ChevronUp className="ml-auto" />
          </>,
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" className="w-(--radix-popper-anchor-width)">
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span>Account settings</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="max-w-none w-auto min-w-3xl min-h-2xl p-0 dark:text-background">
            <DialogTitle className="sr-only">Account settings</DialogTitle>
            {/* TODO */}
          </DialogContent>
        </Dialog>
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
