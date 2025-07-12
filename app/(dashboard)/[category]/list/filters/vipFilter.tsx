import { Star } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const VipFilter = memo(function VipFilter({
  isVip,
  onChange,
}: {
  isVip: boolean | undefined;
  onChange: (isVip: boolean | undefined) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isVip ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <Star className="h-4 w-4 mr-2" />
          VIP
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={isVip?.toString() ?? "undefined"}
          onValueChange={(value) => onChange(value === "undefined" ? undefined : true)}
          className="flex flex-col"
        >
          <DropdownMenuRadioItem value="undefined">All conversations</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="true">VIP only</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
