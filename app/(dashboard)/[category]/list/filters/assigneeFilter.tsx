import { User } from "lucide-react";
import { memo } from "react";
import { MemberFilter } from "./memberFilter";

export const AssigneeFilter = memo(function AssigneeFilter({
  includeUnassigned = true,
  selectedAssignees,
  onChange,
}: {
  includeUnassigned?: boolean;
  selectedAssignees: string[];
  onChange: (assignees: string[]) => void;
}) {
  return (
    <MemberFilter
      selectedMembers={selectedAssignees}
      onChange={onChange}
      icon={User}
      placeholder="Assignee"
      searchPlaceholder="Search assignees..."
      emptyText="No assignees found"
      multiSelectionDisplay={(count) => `${count} assignees`}
      includeUnassigned={includeUnassigned}
    />
  );
});
