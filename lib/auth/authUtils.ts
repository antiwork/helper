import { DbOrAuthUser } from "@/db/supabaseSchema/auth";

export const hasDisplayName = (
  user: DbOrAuthUser | null | undefined,
): user is DbOrAuthUser & { user_metadata: { display_name: string } } => {
  return typeof user?.user_metadata?.display_name === "string";
};

export const getFullName = (user: DbOrAuthUser) => {
  if (hasDisplayName(user)) return user.user_metadata.display_name.trim();
  return user.email ?? user.id;
};

export const getFirstName = (user: DbOrAuthUser) => {
  return getFullName(user).split(" ")[0];
};
