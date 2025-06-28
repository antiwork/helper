import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        bright: "border-bright bg-bright/10 text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = ({
  className,
  variant,
  ref,
  ...props
}: React.ComponentPropsWithRef<"div"> & VariantProps<typeof alertVariants>) => {
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
};
Alert.displayName = "Alert";

const AlertTitle = ({ className, ref, ...props }: React.ComponentPropsWithRef<"h5">) => {
  return <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
};
AlertTitle.displayName = "AlertTitle";

const AlertDescription = ({ className, ref, ...props }: React.ComponentPropsWithRef<"div">) => {
  return <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
};
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
