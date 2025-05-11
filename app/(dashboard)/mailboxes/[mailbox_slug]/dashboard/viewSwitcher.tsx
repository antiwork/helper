import { BarChart, ChevronsUpDown, Inbox } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewSwitcherProps = {
  mailboxSlug: string;
};

export function ViewSwitcher({ mailboxSlug }: ViewSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10">
        <div className="flex items-center">
          <Image src="/helper_logo_02.svg" alt="Helper" width={20} height={20} priority />
          <span className="font-sundry-narrow-bold text-xl mx-4">Helper</span>
          <div className="flex items-center gap-1 ml-40">
            <ChevronsUpDown className="h-4 w-4" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem asChild>
          <Link href={`/mailboxes/${mailboxSlug}/dashboard`} className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/mailboxes/${mailboxSlug}/conversations`} className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span>Inbox</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
