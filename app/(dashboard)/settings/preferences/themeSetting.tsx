"use client";

import { mapValues } from "lodash-es";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInboxTheme } from "@/app/(dashboard)/clientLayout";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useOnChange } from "@/components/useOnChange";
import { normalizeHex } from "@/lib/themes";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";
import { ColorInput } from "./colorInput";

type ThemeUpdates = {
  theme?: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
    sidebarBackground: string;
  };
};

const ThemeSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  const { setTheme: setWindowTheme } = useInboxTheme();
  const savingIndicator = useSavingIndicator();

  const [isEnabled, setIsEnabled] = useState(!!mailbox.preferences?.theme);
  const [theme, setTheme] = useState(
    mailbox.preferences?.theme ?? {
      background: "#ffffff",
      foreground: "#000000",
      primary: "#000000",
      accent: "#000000",
      sidebarBackground: "#ffffff",
    },
  );

  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating theme", { description: error.message });
    },
  });

  const save = useDebouncedCallback(() => {
    if (!isEnabled && !mailbox.preferences?.theme) return;
    savingIndicator.setState("saving");
    update({
      preferences: { theme: isEnabled ? mapValues(theme, (value) => `#${normalizeHex(value)}`) : null },
    });
  }, 500);

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
  }, []);

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
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SwitchSectionWrapper
        title="Custom Theme"
        description="Choose the appearance of your mailbox with custom colors"
        initialSwitchChecked={isEnabled}
        onSwitchChange={handleSwitchChange}
      >
        {isEnabled && (
          <div className="space-y-4">
            <ColorInput label="Background Color" value={theme.background} onChange={handleColorChange("background")} />
            <ColorInput label="Foreground Color" value={theme.foreground} onChange={handleColorChange("foreground")} />
            <ColorInput label="Primary Color" value={theme.primary} onChange={handleColorChange("primary")} />
            <ColorInput label="Accent Color" value={theme.accent} onChange={handleColorChange("accent")} />
            <ColorInput
              label="Sidebar Color"
              value={theme.sidebarBackground}
              onChange={handleColorChange("sidebarBackground")}
            />
          </div>
        )}
      </SwitchSectionWrapper>
    </div>
  );
};

export default ThemeSetting;
