import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export const useSaveLatestMailboxSlug = (mailboxSlug: string | undefined) => {
  const { user } = useUser();
  const lastMailboxSlug = useRef<string | null>(null);
  useEffect(() => {
    if (mailboxSlug && lastMailboxSlug.current !== mailboxSlug && user) {
      lastMailboxSlug.current = mailboxSlug;
      user.update({ unsafeMetadata: { ...user.unsafeMetadata, lastMailboxSlug: mailboxSlug } });
    }
  }, [mailboxSlug]);
};
