import * as React from "react";
import { onModEnterKeyboardEvent } from "@/components/onModEnterKeyboardEvent";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onModEnter?: () => void;
  hint?: React.ReactNode;
  iconsSuffix?: React.ReactNode;
  iconsPrefix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onModEnter, iconsSuffix, iconsPrefix, hint, ...props }, ref) => {
    return (
      <>
        <div className="relative grow">
          {iconsPrefix && <div className="absolute inset-y-0 left-0 flex items-center gap-2 pl-3">{iconsPrefix}</div>}
          <input
            type={type}
            className={cn(
              "w-full rounded-lg bg-background border-border text-sm focus:border-transparent focus:outline-none focus:ring-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
              "placeholder:text-muted-foreground",
              iconsPrefix && "pl-10",
              className,
            )}
            ref={ref}
            onKeyDown={props.onKeyDown || (onModEnter ? onModEnterKeyboardEvent(onModEnter) : undefined)}
            {...props}
          />
          {iconsSuffix && <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">{iconsSuffix}</div>}
        </div>
        {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
      </>
    );
  },
);

Input.displayName = "Input";

export { Input };
