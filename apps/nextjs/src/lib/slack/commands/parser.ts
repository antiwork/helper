import { CommandArgs } from "./types";

export const parseCommandArgs = (text: string): CommandArgs => {
  const parts = text.trim().split(/\s+/);
  const command = parts[0] || "help";
  const args: Record<string, string> = {};

  let currentKey = "";
  let searchTerm = "";

  // Extract flags and their values
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (!part) continue;

    if (part.startsWith("--")) {
      if (searchTerm && !currentKey) {
        args.search = searchTerm.trim();
        searchTerm = "";
      }

      // Start a new flag
      currentKey = part.substring(2);
      args[currentKey] = "";
    } else if (currentKey) {
      args[currentKey] = args[currentKey] ? `${args[currentKey]} ${part}` : part;
    } else {
      searchTerm = searchTerm ? `${searchTerm} ${part}` : part;
    }
  }

  if (searchTerm && !args.search) {
    args.search = searchTerm.trim();
  }

  return { command, ...args };
};
