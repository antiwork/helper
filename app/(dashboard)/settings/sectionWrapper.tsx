"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SectionWrapperProps = {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

const SectionWrapper = ({ title, description, fullWidth, className, action, children }: SectionWrapperProps) => {
  return (
    <section className="flex flex-col gap-8 border-b py-8 first:pt-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">{title}</h2>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className={cn("w-full", !fullWidth && "max-w-3xl", className)}>
        {children}
      </div>
    </section>
  );
};

type SwitchSectionWrapperProps = {
  title: string;
  description?: string | React.ReactNode;
  fullWidth?: boolean;
  initialSwitchChecked: boolean;
  onSwitchChange: (checked: boolean) => void;
  className?: string;
  children: React.ReactNode;
};

const SwitchSectionWrapper = ({
  title,
  description,
  fullWidth,
  initialSwitchChecked,
  onSwitchChange,
  className,
  children,
}: SwitchSectionWrapperProps) => {
  const [isSwitchChecked, setIsSwitchChecked] = useState(initialSwitchChecked);

  const handleSwitchChange = (checked: boolean) => {
    setIsSwitchChecked(checked);
    onSwitchChange?.(checked);
  };

  return (
    <SectionWrapper
      title={
        <div className="flex items-center gap-3">
          <span>{title}</span>
          <Badge variant={isSwitchChecked ? "dark" : "default"} className="h-6">
            {isSwitchChecked ? "On" : "Off"}
          </Badge>
        </div>
      }
      description={description}
      fullWidth={fullWidth}
      className={className}
      action={
        <Switch 
          aria-label={`${title} Switch`} 
          checked={isSwitchChecked} 
          onCheckedChange={handleSwitchChange}
          className="scale-110"
        />
      }
    >
      {children}
    </SectionWrapper>
  );
};

export default SectionWrapper;
export { SwitchSectionWrapper };
