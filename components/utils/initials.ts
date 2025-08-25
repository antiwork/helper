export const getInitials = (name: string): string => {
  const parts = name.split(" ").filter((part) => part.length > 0);
  if (parts.length === 0) return "AN";
  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
