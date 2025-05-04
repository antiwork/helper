"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";
import { cn } from "@/lib/utils";

const BaseAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
BaseAvatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface CustomAvatarProps {
  src?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar = ({ src, fallback, size = "md" }: CustomAvatarProps) => {
  const sizeClasses = {
    sm: "h-5 w-5 text-xxs",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <BaseAvatar className={sizeClasses[size]}>
      <AvatarImage src={src} />
      <AvatarFallback className="font-sundry-narrow-medium text-bright-foreground bg-bright border border-primary-foreground">
        {fallback.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </BaseAvatar>
  );
};

export { BaseAvatar, AvatarImage, AvatarFallback };
