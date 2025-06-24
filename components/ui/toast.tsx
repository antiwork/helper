"use client";

import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof ToastPrimitives.Viewport>) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
);
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center space-x-3 overflow-hidden rounded-md px-3 py-2 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full sm:data-[state=open]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        success: "success group bg-success text-success-foreground",
        destructive: "destructive group bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  },
);

const Toast = ({
  className,
  variant,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>) => {
  const variantIconMap: Record<string, React.ElementType> = {
    success: CircleCheck,
    destructive: CircleAlert,
    default: Info,
  };

  const IconComponent = variantIconMap[variant || "default"];

  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {IconComponent && (
        <IconComponent className="h-4 w-4 shrink-0 group-[.success]:text-success-foreground group-[.destructive]:text-destructive-foreground" />
      )}
      {props.children}
    </ToastPrimitives.Root>
  );
};
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof ToastPrimitives.Action>) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn("text-sm leading-none text-success-foreground underline", className)}
    {...props}
  />
);
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof ToastPrimitives.Close>) => (
  <ToastPrimitives.Close ref={ref} className={cn("text-success-foreground", className)} toast-close="" {...props}>
    <X className="h-4 w-4 shrink-0" />
  </ToastPrimitives.Close>
);
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof ToastPrimitives.Title>) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
);
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof ToastPrimitives.Description>) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm", className)} {...props} />
);
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
