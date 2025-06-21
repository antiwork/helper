"use client";

import { useCallback, useEffect } from "react";
import { useInboxTheme } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/clientLayout";
import { useManualSave } from "@/components/hooks/useManualSave";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveableForm } from "@/components/ui/saveableForm";
import { normalizeHex } from "@/lib/themes";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { SwitchSectionWrapper } from "../sectionWrapper";

export type ThemeUpdates = {
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

  const utils = api.useUtils();
  const { mutate: update } = api.mailbox.update.useMutation();

  const { currentData, isDirty, isLoading, updateData, handleSave, handleCancel, handleReset } = useManualSave(
    {
      isEnabled: !!mailbox.preferences?.theme,
      theme: mailbox.preferences?.theme ?? {
        background: "#ffffff",
        foreground: "#000000",
        primary: "#000000",
        accent: "#000000",
        sidebarBackground: "#ffffff",
      },
    },
    {
      onSave: async (data: { isEnabled: boolean; theme: ThemeUpdates["theme"] }) => {
        if (!data.isEnabled && !mailbox.preferences?.theme) return;

        await new Promise<void>((resolve, reject) => {
          update(
            {
              mailboxSlug: mailbox.slug,
              preferences: {
                theme:
                  data.isEnabled && data.theme
                    ? {
                        background: `#${normalizeHex(data.theme.background)}`,
                        foreground: `#${normalizeHex(data.theme.foreground)}`,
                        primary: `#${normalizeHex(data.theme.primary)}`,
                        accent: `#${normalizeHex(data.theme.accent)}`,
                        sidebarBackground: `#${normalizeHex(data.theme.sidebarBackground)}`,
                      }
                    : null,
              },
            },
            {
              onSuccess: () => {
                utils.mailbox.get.invalidate({ mailboxSlug: mailbox.slug });
                resolve();
              },
              onError: reject,
            },
          );
        });
      },
      successMessage: "Theme settings updated successfully",
      errorMessage: "Failed to update theme settings",
    },
  );

  useEffect(() => {
    handleReset({
      isEnabled: !!mailbox.preferences?.theme,
      theme: mailbox.preferences?.theme ?? {
        background: "#ffffff",
        foreground: "#000000",
        primary: "#000000",
        accent: "#000000",
        sidebarBackground: "#ffffff",
      },
    });
  }, [mailbox.preferences?.theme, handleReset]);

  useEffect(() => {
    const root = document.documentElement;
    if (!currentData.isEnabled) {
      updateData({
        theme: {
          background: getComputedStyle(root).getPropertyValue("--background").trim() || "#ffffff",
          foreground: getComputedStyle(root).getPropertyValue("--foreground").trim() || "#000000",
          primary: getComputedStyle(root).getPropertyValue("--primary").trim() || "#000000",
          accent: getComputedStyle(root).getPropertyValue("--bright").trim() || "#000000",
          sidebarBackground: getComputedStyle(root).getPropertyValue("--sidebar-background").trim() || "#ffffff",
        },
      });
    }
  }, [currentData.isEnabled, updateData]);

  const handleColorChange = useCallback(
    (color: keyof NonNullable<ThemeUpdates["theme"]>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTheme = { ...currentData.theme, [color]: e.target.value };
      updateData({ theme: newTheme });

      const normalized = /#([0-9a-f]{3})$/i.test(e.target.value) ? `#${normalizeHex(e.target.value)}` : e.target.value;
      if (/#([0-9a-f]{6})$/i.test(normalized)) {
        setWindowTheme({ ...newTheme, [color]: normalized });
      }
    },
    [currentData.theme, updateData, setWindowTheme],
  );

  const handleSwitchChange = (checked: boolean) => {
    updateData({ isEnabled: checked });
  };

  return (
    <SaveableForm isDirty={isDirty} isLoading={isLoading} onSave={handleSave} onCancel={handleCancel}>
      <SwitchSectionWrapper
        title="Custom Theme"
        description="Choose the appearance of your mailbox with custom colors"
        initialSwitchChecked={currentData.isEnabled}
        onSwitchChange={handleSwitchChange}
      >
        {currentData.isEnabled && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Background Color</Label>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Input
                  type="color"
                  value={currentData.theme.background}
                  onChange={handleColorChange("background")}
                  className="h-10 w-20 p-1"
                />
                <Input
                  type="text"
                  value={currentData.theme.background}
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
                  value={currentData.theme.foreground}
                  onChange={handleColorChange("foreground")}
                  className="h-10 w-20 p-1"
                />
                <Input
                  type="text"
                  value={currentData.theme.foreground}
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
                  value={currentData.theme.primary}
                  onChange={handleColorChange("primary")}
                  className="h-10 w-20 p-1"
                />
                <Input
                  type="text"
                  value={currentData.theme.primary}
                  onChange={handleColorChange("primary")}
                  className="w-[200px]"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Accent Color</Label>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Input
                  type="color"
                  value={currentData.theme.accent}
                  onChange={handleColorChange("accent")}
                  className="h-10 w-20 p-1"
                />
                <Input
                  type="text"
                  value={currentData.theme.accent}
                  onChange={handleColorChange("accent")}
                  className="w-[200px]"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label>Sidebar Color</Label>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Input
                  type="color"
                  value={currentData.theme.sidebarBackground}
                  onChange={handleColorChange("sidebarBackground")}
                  className="h-10 w-20 p-1"
                />
                <Input
                  type="text"
                  value={currentData.theme.sidebarBackground}
                  onChange={handleColorChange("sidebarBackground")}
                  className="w-[200px]"
                />
              </div>
            </div>
          </div>
        )}
      </SwitchSectionWrapper>
    </SaveableForm>
  );
};

export default ThemeSetting;
