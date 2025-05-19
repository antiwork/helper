"use client";

import { mapValues } from "lodash-es";
import { useEffect, useState } from "react";
import { useInboxTheme } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { toast } from "@/components/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { normalizeHex } from "@/lib/themes";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

export type ThemeUpdates = {
  theme?: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
    sidebarBackground: string;
  };
};

const ThemeSetting = ({
  mailbox,
  preferences,
}: {
  mailbox: RouterOutputs["mailbox"]["get"];
  preferences: RouterOutputs["mailbox"]["preferences"]["get"];
}) => {
  const { setTheme: setWindowTheme } = useInboxTheme();

  const [isEnabled, setIsEnabled] = useState(!!preferences.preferences?.theme);
  const [theme, setTheme] = useState(
    preferences.preferences?.theme ?? {
      background: "#ffffff",
      foreground: "#000000",
      primary: "#000000",
      accent: "#000000",
      sidebarBackground: "#ffffff",
    },
  );

  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.preferences.update.useMutation({
    onSuccess: () => {
      utils.mailbox.preferences.get.invalidate({ mailboxSlug: mailbox.slug });
    },
    onError: (error) => {
      toast({
        title: "Error updating theme",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const save = useDebouncedCallback(() => {
    if (!isEnabled && !preferences.preferences?.theme) return;
    update({
      mailboxSlug: mailbox.slug,
      preferences: { theme: isEnabled ? mapValues(theme, (value) => `#${normalizeHex(value)}`) : null },
    });
  }, 2000);

  useOnChange(() => {
    save();
  }, [isEnabled, theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (!isEnabled) {
      setTheme({
        background: getComputedStyle(root).getPropertyValue("--background").trim() || "#ffffff",
        foreground: getComputedStyle(root).getPropertyValue("--foreground").trim() || "#000000",
        primary: getComputedStyle(root).getPropertyValue("--primary").trim() || "#000000",
        accent: getComputedStyle(root).getPropertyValue("--bright").trim() || "#000000",
        sidebarBackground: getComputedStyle(root).getPropertyValue("--sidebar-background").trim() || "#ffffff",
      });
    }
  }, [isEnabled]);

  const debouncedSetWindowTheme = useDebouncedCallback(setWindowTheme, 200);

  const handleColorChange =
    (color: keyof NonNullable<ThemeUpdates["theme"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setTheme({ ...theme, [color]: e.target.value });
      const normalized = /#([0-9a-f]{3})$/i.test(e.target.value) ? `#${normalizeHex(e.target.value)}` : e.target.value;
      if (/#([0-9a-f]{6})$/i.test(normalized)) debouncedSetWindowTheme({ ...theme, [color]: normalized });
    };

  const handleSwitchChange = (checked: boolean) => {
    setIsEnabled(checked);
  };

  return (
    <SectionWrapper
      title="Custom Theme"
      description="Choose the appearance of your mailbox with custom colors"
      initialSwitchChecked={isEnabled}
      onSwitchChange={handleSwitchChange}
    >
      {isEnabled && (
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label>Background Color</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                type="color"
                value={theme.background}
                onChange={handleColorChange("background")}
                className="h-10 w-20 p-1"
              />
              <Input
                type="text"
                value={theme.background}
                onChange={handleColorChange("background")}
                className="w-[200px]"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Foreground Color</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                type="color"
                value={theme.foreground}
                onChange={handleColorChange("foreground")}
                className="h-10 w-20 p-1"
              />
              <Input
                type="text"
                value={theme.foreground}
                onChange={handleColorChange("foreground")}
                className="w-[200px]"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Primary Color</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                type="color"
                value={theme.primary}
                onChange={handleColorChange("primary")}
                className="h-10 w-20 p-1"
              />
              <Input type="text" value={theme.primary} onChange={handleColorChange("primary")} className="w-[200px]" />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Accent Color</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                type="color"
                value={theme.accent}
                onChange={handleColorChange("accent")}
                className="h-10 w-20 p-1"
              />
              <Input type="text" value={theme.accent} onChange={handleColorChange("accent")} className="w-[200px]" />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Sidebar Color</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Input
                type="color"
                value={theme.sidebarBackground}
                onChange={handleColorChange("sidebarBackground")}
                className="h-10 w-20 p-1"
              />
              <Input
                type="text"
                value={theme.sidebarBackground}
                onChange={handleColorChange("sidebarBackground")}
                className="w-[200px]"
              />
            </div>
          </div>
        </div>
      )}
    </SectionWrapper>
  );
};

export default ThemeSetting;
