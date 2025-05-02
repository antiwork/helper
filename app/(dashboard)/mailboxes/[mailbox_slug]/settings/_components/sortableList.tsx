import * as React from "react";
import { ReactSortable as Sortable, type ReactSortableProps } from "react-sortablejs";
import DragSvg from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/icons/outline-drag.svg";
import { cn } from "@/lib/utils";

type Props<T extends string | number> = {
  currentOrder: T[];
  onReorder: (newIdOrder: T[]) => void;
  children: React.ReactNode;
  group?: string | undefined;
  tag?: ReactSortableProps<string>["tag"];
};

// To verify this works on mobile, you may need to set `reactStrictMode` to `false` in next.config.js:
// https://github.com/SortableJS/react-sortablejs/issues/241
export const SortableList = <T extends string | number>({
  currentOrder,
  onReorder,
  children,
  group,
  tag = "div",
}: Props<T>) => (
  <Sortable
    group={group}
    list={currentOrder.map((id) => ({ id }))}
    setList={(items) => {
      const itemIds = items.map((i) => i.id);
      onReorder(itemIds);
    }}
    handle="[aria-grabbed]"
    tag={tag}
    scrollSensitivity={150}
    setData={(dataTransfer: DataTransfer, draggedElement: HTMLElement) => {
      dataTransfer.setDragImage(draggedElement, 0, 0);
    }}
  >
    {children}
  </Sortable>
);

export const ReorderingHandle = ({ className }: { className?: string }) => (
  <div
    className={cn("flex items-center justify-center", className)}
    aria-grabbed
    data-drag-handle
    draggable
    onClick={(evt) => evt.stopPropagation()}
  >
    <DragSvg className="h-4 w-4 cursor-move" />
  </div>
);
