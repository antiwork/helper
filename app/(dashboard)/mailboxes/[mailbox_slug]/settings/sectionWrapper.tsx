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
    <section className="flex flex-col gap-4 border-b py-8 first:pt-4 lg:flex-row">
      <div className="flex w-full flex-col gap-3 lg:max-w-xs">
        <div className="flex w-full flex-col gap-1">
          <h2 className="text-base flex items-center gap-2">{title}</h2>
          <div className="w-full text-sm text-muted-foreground">{description}</div>
        </div>
        {action}
      </div>
      <div className={cn("grow", !fullWidth && "max-w-xl", className)}>{children}</div>
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
    if (onSwitchChange) {
      onSwitchChange(checked);
    }
  };

  return (
    <SectionWrapper
      title={
        <>
          {title}
          <Badge variant={isSwitchChecked ? "dark" : "default"}>{isSwitchChecked ? "On" : "Off"}</Badge>
        </>
      }
      description={description}
      fullWidth={fullWidth}
      className={className}
      action={<Switch aria-label={`${title} Switch`} checked={isSwitchChecked} onCheckedChange={handleSwitchChange} />}
    >
      {children}
    </SectionWrapper>
  );
};

export default SectionWrapper;
export { SwitchSectionWrapper };
