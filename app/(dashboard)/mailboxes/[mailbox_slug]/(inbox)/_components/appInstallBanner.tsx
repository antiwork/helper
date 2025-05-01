import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const AppInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => void; userChoice: Promise<unknown> } | null>(
    null,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <div className="relative bg-primary/10 py-3 pl-2 pr-1 flex items-center">
      <Image src="/icon_192.png" alt="Helper" width={48} height={48} />
      <div className="flex-1 mx-1">
        <p className="text-sm font-medium">Helper for Customer Support</p>
        <p className="text-xs text-muted-foreground">Install for a better mobile experience</p>
      </div>
      <Button onClick={handleInstall} variant="bright" size="sm">
        View
      </Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDeferredPrompt(null)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
