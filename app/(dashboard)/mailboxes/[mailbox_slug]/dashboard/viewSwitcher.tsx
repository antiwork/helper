import { ChartBarIcon, InboxIcon } from "@heroicons/react/24/outline";
import { ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
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
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useQueryState("view");

  const isDashboardPage = pathname.includes("/dashboard");
  const isInboxPage = pathname.includes("/conversations");

  const switchView = (newView: string) => {
    if (isDashboardPage) {
      router.push(`/mailboxes/${mailboxSlug}/conversations?view=${newView}`);
    } else {
      setView(newView);
    }
  };

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
        <DropdownMenuItem onClick={() => switchView("dashboard")}>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchView("inbox")}>
          <div className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4" />
            <span>Inbox</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
