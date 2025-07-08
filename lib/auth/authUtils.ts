import { DbOrAuthUser } from "@/db/supabaseSchema/auth";

export const hasDisplayName = (displayName?: string | null): displayName is string => {
  return typeof displayName === "string";
};

export const getFullName = (displayName?: string | null, email?: string | null): string => {
  if (displayName?.trim()) return displayName.trim();

  if (email) {
    const [username] = email.split("@");
    if (username) {
      return username
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return "Unknown";
};

export const getFirstName = (displayName?: string | null, email?: string | null): string => {
  const fullName = getFullName(displayName, email);
  const firstName = fullName.split(" ")[0];
  return firstName || "Unknown";
};
