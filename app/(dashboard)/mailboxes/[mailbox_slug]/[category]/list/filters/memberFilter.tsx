import { LucideIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { FilterBase } from "./filterBase";

interface MemberFilterProps {
  selectedMembers: string[];
  onChange: (members: string[]) => void;
  icon: LucideIcon;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  singleSelectionDisplay?: (memberName: string) => string;
  multiSelectionDisplay?: (count: number) => string;
}

export function MemberFilter(props: MemberFilterProps) {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return (
    <FilterBase
      selectedItems={props.selectedMembers}
      onChange={props.onChange}
      icon={props.icon}
      placeholder={props.placeholder}
      searchPlaceholder={props.searchPlaceholder}
      emptyText={props.emptyText}
      items={members || []}
      singleSelectionDisplay={props.singleSelectionDisplay}
      multiSelectionDisplay={props.multiSelectionDisplay}
    />
  );
}
