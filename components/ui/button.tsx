import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-[.60]",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground bg-primary dark:bg-bright dark:text-bright-foreground hover:bg-foreground hover:text-background",
        destructive: "bg-destructive text-destructive-foreground hover:bg-primary hover:text-primary-foreground",
        destructive_outlined:
          "border border-destructive text-destructive hover:bg-primary hover:text-primary-foreground",
        outlined: "border border-primary text-foreground hover:bg-secondary",
        outlined_subtle: "border border-border text-foreground hover:bg-secondary",
        subtle: "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
        ghost: "text-primary hover:bg-secondary",
        bare: "text-primary hover:bg-secondary p-0 h-auto",
        link: "text-primary underline-offset-4 hover:underline",
        bright: "bg-bright text-bright-foreground hover:bg-primary hover:text-primary-foreground",
        sidebar:
          "hover:bg-sidebar-accent hover:text-sidebar-foreground data-[desktop=false]:hover:bg-accent data-[desktop=false]:hover:text-foreground",
        "sidebar-subtle":
          "bg-sidebar-accent text-sidebar-foreground data-[desktop=false]:bg-accent data-[desktop=false]:text-foreground hover:bg-sidebar-accent/80 data-[desktop=false]:hover:bg-accent/80",
        "sidebar-link":
          "text-sidebar-foreground hover:text-sidebar-foreground/80 hover:bg-transparent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded px-3 text-xs",
        default: "h-10 rounded-md px-4 text-sm",
        lg: "h-16 rounded-lg px-8 text-xl",
      },
      iconOnly: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        size: "sm",
        iconOnly: true,
        className: "w-8 px-0",
      },
      {
        size: "default",
        iconOnly: true,
        className: "w-10 px-0",
      },
      {
        size: "lg",
        iconOnly: true,
        className: "w-12 px-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      iconOnly: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  desktop?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export const Button = ({
  className,
  variant,
  size,
  iconOnly,
  asChild = false,
  desktop,
  tabIndex,
  ref,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, iconOnly, className }))}
      ref={ref}
      tabIndex={tabIndex}
      data-desktop={desktop}
      {...props}
    />
  );
};

Button.displayName = "Button";
