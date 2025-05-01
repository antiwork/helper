"use client";

import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNativePlatform } from "@/components/useNativePlatform";

export const TauriUpdateChecker = () => {
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const { isTauri } = useNativePlatform();

  useEffect(() => {
    if (!isTauri) return;

    const checkForUpdates = async () => {
      const update = await check();
      if (update) {
        await update.downloadAndInstall(({ event }) => {
          if (event === "Finished") {
            setIsUpdateReady(true);
          }
        });
      }
    };
    checkForUpdates();
  }, [isTauri]);

  return (
    <Dialog open={isUpdateReady} onOpenChange={setIsUpdateReady}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Ready</DialogTitle>
          <DialogDescription>
            A new version of Helper has been downloaded and is ready to install. Would you like to restart the app now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outlined" onClick={() => setIsUpdateReady(false)}>
            Later
          </Button>
          <Button onClick={() => void relaunch()}>Restart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
