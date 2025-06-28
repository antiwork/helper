"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";
import { cn } from "@/lib/utils";

const BaseAvatar = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Root>) => {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
};
BaseAvatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Image>) => {
  return <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />;
};
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = ({ className, ref, ...props }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Fallback>) => {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn("flex h-full w-full items-center justify-center rounded-full", className)}
      {...props}
    />
  );
};

AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

interface CustomAvatarProps {
  src?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar = ({ src, fallback, size = "md" }: CustomAvatarProps) => {
  const sizeClasses = {
    sm: "h-5 w-5 text-xxs font-bold",
    md: "h-8 w-8 text-xs font-bold",
    lg: "h-12 w-12 text-sm font-bold",
  };

  return (
    <BaseAvatar className={sizeClasses[size]}>
      <AvatarImage src={src} />
      <AvatarFallback className="text-bright-foreground bg-bright border border-primary-foreground">
        {fallback.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </BaseAvatar>
  );
};

export { BaseAvatar, AvatarImage, AvatarFallback };
