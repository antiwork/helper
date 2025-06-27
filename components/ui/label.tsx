"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "mb-1 block text-sm border-border focus:border-transparent focus:outline-hidden focus:ring-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
