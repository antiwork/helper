import {
  InboxIcon as HeroInbox,
  UserIcon as HeroUser,
  UserMinusIcon as HeroUserMinus,
  UsersIcon as HeroUsers,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Chip, ChipContainer, ChipVariant } from "@/components/ui/chip";
import { RouterOutputs } from "@/trpc";

export const CATEGORY_LABELS = {
  all: "All",
  mine: "Mine",
  assigned: "Assigned",
  unassigned: "Unassigned",
};

export const CategoryNav = ({
  openCount,
  mailboxSlug,
  variant,
  prefix,
  className,
}: {
  openCount?: RouterOutputs["mailbox"]["openCount"];
  mailboxSlug: string;
  variant: ChipVariant;
  prefix?: ReactNode;
  className?: string;
}) => {
  const pathname = usePathname();

  const items = [
    {
      label: CATEGORY_LABELS.mine,
      icon: HeroUser,
      href: `/mailboxes/${mailboxSlug}/mine`,
      count: openCount?.mine ?? 0,
    },
    {
      label: CATEGORY_LABELS.all,
      icon: HeroInbox,
      href: `/mailboxes/${mailboxSlug}/conversations`,
    },
    {
      label: CATEGORY_LABELS.assigned,
      icon: HeroUsers,
      href: `/mailboxes/${mailboxSlug}/assigned`,
      count: openCount?.assigned ?? 0,
    },
    {
      label: CATEGORY_LABELS.unassigned,
      icon: HeroUserMinus,
      href: `/mailboxes/${mailboxSlug}/unassigned`,
      count: openCount?.unassigned ?? 0,
    },
  ];

  return (
    <ChipContainer className={className} storageKey={`categoryNav-${mailboxSlug}`}>
      {prefix}
      {items.map((item) => (
        <Chip
          key={item.label}
          label={item.label}
          icon={item.icon}
          count={item.count}
          href={item.href}
          isActive={pathname === item.href}
          variant={variant}
        />
      ))}
    </ChipContainer>
  );
};
