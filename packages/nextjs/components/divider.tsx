import * as React from "react";

export type DividerProps = {
  label: string;
};

const Divider = ({ label }: DividerProps) => (
  <div className="my-6 flex items-center">
    <div className="h-px flex-1 bg-border" />
    <span className="px-4 text-xs font-medium tracking-wider text-muted-foreground">{label}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

export default Divider;
