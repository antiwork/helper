export const formatDisplayName = (displayName: string): { short: string; full: string } => {
  if (displayName.includes("@")) {
    const [localPart = "", domain] = displayName.split("@");
    const shortName = localPart.length > 12 ? `${localPart.substring(0, 12)}...` : localPart;
    return { short: shortName, full: displayName };
  }

  const firstName = displayName.split(" ")[0] || displayName;
  return { short: firstName, full: displayName };
};
