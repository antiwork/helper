import { useSession } from "@/components/useSession";
import { getFirstName } from "@/lib/auth/authUtils";

export const EmailSignature = () => {
  const { user } = useSession() ?? {};

  if (!user?.displayName) {
    return null;
  }

  return (
    <div className="mt-1 text-muted-foreground">
      Best,
      <br />
      {getFirstName(user)}
      <div className="text-xs mt-2">
        Note: This signature will be automatically included in email responses, but not in live chat conversations.
      </div>
    </div>
  );
};
