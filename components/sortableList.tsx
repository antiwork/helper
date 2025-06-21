import * as React from "react";
import { type ReactSortableProps } from "react-sortablejs";

type Props<T extends string | number> = {
  currentOrder: T[];
  onReorder: (newIdOrder: T[]) => void;
  children: React.ReactNode;
  group?: string | undefined;
  tag?: ReactSortableProps<string>["tag"];
};
