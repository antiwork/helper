import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from "@heroicons/react/20/solid";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav role="navigation" aria-label="pagination" className={cn("items-center", className)} {...props} />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "default",
  iconOnly = true,
  ...props
}: PaginationLinkProps & Pick<ButtonProps, "iconOnly">) => (
  <Button aria-current={isActive ? "page" : undefined} size={size} iconOnly={iconOnly} className={className} asChild>
    <a {...props} />
  </Button>
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  showIcon = true,
  ...props
}: React.ComponentProps<typeof Button> & { showIcon?: boolean }) => (
  <Button aria-label="Go to previous page" className={cn("gap-1 pl-2.5", className)} {...props}>
    {showIcon && <ChevronLeft className="h-4 w-4" />}
    <span>Previous</span>
  </Button>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  showIcon = true,
  ...props
}: React.ComponentProps<typeof Button> & { showIcon?: boolean }) => (
  <Button aria-label="Go to next page" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>Next</span>
    {showIcon && <ChevronRight className="h-4 w-4" />}
  </Button>
);
PaginationNext.displayName = "PaginationNext";

const PaginationFirst = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button aria-label="Go to last page" className={cn("", className)} {...props}>
    <ChevronDoubleLeftIcon className="h-4 w-4" />
  </Button>
);
PaginationFirst.displayName = "PaginationFirst";

const PaginationLast = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button aria-label="Go to last page" className={cn("", className)} {...props}>
    <ChevronDoubleRightIcon className="h-4 w-4" />
  </Button>
);
PaginationLast.displayName = "PaginationLast";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationLast,
  PaginationFirst,
};
