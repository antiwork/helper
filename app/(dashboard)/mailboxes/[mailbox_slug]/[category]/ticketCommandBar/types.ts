type CommandItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  shortcut?: string;
  description?: string;
  hidden?: boolean;
};

export type CommandGroup = {
  heading: string;
  items: CommandItem[];
};
