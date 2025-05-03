"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Clerk doesn't currently have a way to switch organization on the server
export const SetActiveOrganization = ({ id }: { id: string }) => {
  const { setActive, isLoaded } = useOrganizationList();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      void setActive({ organization: id }).then(() => {
        router.push("/mailboxes");
      });
    }
  }, [isLoaded, setActive, id, router]);

  return null;
};
