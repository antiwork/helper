import { MessagesSquare } from "lucide-react";
import { memo } from "react";
import { MemberFilter } from "./memberFilter";

export const ResponderFilter = memo(function ResponderFilter({
  selectedResponders,
  onChange,
}: {
  selectedResponders: string[];
  onChange: (responders: string[]) => void;
}) {
  return (
    <MemberFilter
      selectedMembers={selectedResponders}
      onChange={onChange}
      icon={MessagesSquare}
      placeholder="Replied by"
      searchPlaceholder="Search responders..."
      emptyText="No responders found"
      multiSelectionDisplay={(count) => `${count} responders`}
    />
  );
});
