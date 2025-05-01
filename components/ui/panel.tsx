import { ReactNode } from "react";

export const Panel = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`light flex-1 border rounded-lg bg-white text-bright-foreground ${className}`}>
    <div className="flex flex-col w-full h-full p-5 overflow-auto">
      <h4 className="scroll-m-20 mb-2 text-sm font-semibold tracking-tight uppercase">{title}</h4>
      <div className="flex-1">{children}</div>
    </div>
  </div>
);
