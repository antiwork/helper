import { User } from "lucide-react";
import { MemberFilter } from "./memberFilter";

export function AssigneeFilter({
  selectedAssignees,
  onChange,
}: {
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
    />
  );
}