export const getFullName = ({ displayName, email }: { displayName: string | null; email: string | null }): string => {
  if (displayName?.trim()) return displayName.trim();
  return email || "User";
};

export const getFirstName = ({ displayName, email }: { displayName: string | null; email: string | null }): string => {
  const fullName = getFullName({ displayName, email });
  const firstName = fullName.split(" ")[0];
  return firstName || "User";
};
