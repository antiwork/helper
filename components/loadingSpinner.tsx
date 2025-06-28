import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("relative", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-8 w-8",
      lg: "h-12 w-12",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
  spinnerClassName?: string;
  ref?: React.Ref<HTMLDivElement>;
}

const LoadingSpinner = ({ className, spinnerClassName, size, ref, ...props }: LoadingSpinnerProps) => {
  return (
    <div className={cn(spinnerVariants({ size }), className)} ref={ref} {...props}>
      <div
        className={cn(
          spinnerVariants({ size }),
          "border-primary absolute inset-0 animate-spin rounded-full border",
          spinnerClassName,
          "border-t-transparent",
        )}
      />
    </div>
  );
};

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
