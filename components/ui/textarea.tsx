import * as React from "react";
import { onModEnterKeyboardEvent } from "@/components/onModEnterKeyboardEvent";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onModEnter?: () => void;
  ref?: React.Ref<HTMLTextAreaElement>;
}

const Textarea = ({ className, onModEnter, ref, ...props }: TextareaProps) => {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg bg-background border-border text-sm focus:border-transparent focus:outline-hidden focus:ring-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        "placeholder:text-muted-foreground",
        className,
      )}
      ref={ref}
      onKeyDown={props.onKeyDown || (onModEnter ? onModEnterKeyboardEvent(onModEnter) : undefined)}
      {...props}
    />
  );
};
Textarea.displayName = "Textarea";

export { Textarea };
