"use client";

import {
  ClerkProvider,
  OrganizationList,
  OrganizationProfile,
  useAuth,
  useClerk,
  UserProfile,
  useUser,
} from "@clerk/nextjs";
import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { getBaseUrl } from "@/components/constants";
import { toast } from "@/components/hooks/use-toast";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountDropdown({ trigger }: { trigger: (children: ReactNode) => ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      // TODO (jono): Fix properly so the default implementation from @clerk/nextjs doesn't cause errors
      window.__unstable__onBeforeSetActive = () => {};
      await signOut({ redirectUrl: "/" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to sign out",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger(<Avatar src={user?.imageUrl ?? undefined} fallback={user?.fullName?.[0] ?? "?"} size="sm" />)}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="min-w-[180px] mb-2">
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span>Account settings</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="max-w-none w-auto min-w-3xl min-h-2xl p-0 dark:text-background">
            <DialogTitle className="sr-only">Account settings</DialogTitle>
            <UserProfile routing="virtual" />
            {/* Workaround since Clerk doesn't always redirect correctly when the user deletes their account from the profile modal */}
            <ClerkProvider dynamic>
              <DeleteAccountListener />
            </ClerkProvider>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span>Organization settings</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="max-w-none w-auto min-w-3xl min-h-2xl p-0 dark:text-background">
            <DialogTitle className="sr-only">Organization settings</DialogTitle>
            <OrganizationProfile routing="virtual" />
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <span>Switch organization</span>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="max-w-none w-auto min-w-3xl min-h-2xl p-0 dark:text-background">
            <DialogTitle className="sr-only">Switch organization</DialogTitle>
            <OrganizationList hidePersonal hideSlug />
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

const DeleteAccountListener = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }
  }, [isLoaded, isSignedIn]);
  return null;
};
