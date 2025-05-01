import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Android from "./icons/android.svg";
import Apple from "./icons/apple.svg";

export const MAC_UNIVERSAL_INSTALLER_URL =
  "https://helper-production-private.s3.us-east-1.amazonaws.com/public/desktop-apps/Helper_universal.dmg";
export const WINDOWS_INSTALLER_URL =
  "https://helper-production-private.s3.us-east-1.amazonaws.com/public/desktop-apps/Helper_x64-setup.exe";
export const LINUX_APPIMAGE_URL =
  "https://helper-production-private.s3.us-east-1.amazonaws.com/public/desktop-apps/Helper_amd64.AppImage";
export const LINUX_DEB_URL =
  "https://helper-production-private.s3.us-east-1.amazonaws.com/public/desktop-apps/Helper_amd64.deb";
export const LINUX_RPM_URL =
  "https://helper-production-private.s3.us-east-1.amazonaws.com/public/desktop-apps/Helper-1.x86_64.rpm";
export const APP_STORE_URL = "https://apps.apple.com/app/helper-for-customer-support/id6739270977";
export const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.antiwork.helper";

export const isMac = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);
export const isWindows = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined" && /win/i.test(navigator.userAgent);
export const isLinux = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined" && /linux/i.test(navigator.userAgent);
export const isIOS = () =>
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
export const isAndroid = () =>
  typeof window !== "undefined" && typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NativeAppModal = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Download Helper</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">macOS</h3>
            <p className="text-sm text-muted-foreground">
              For Apple Silicon and Intel Macs running macOS 10.15 or later
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isMac() ? "bright" : "subtle"}>
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Apple className="mr-2 h-4 w-4" />
                  Mac App Store
                </a>
              </Button>
              <Button asChild variant="subtle">
                <a href={MAC_UNIVERSAL_INSTALLER_URL} download>
                  <Download className="mr-2 h-4 w-4" />
                  Universal installer (.dmg)
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Windows</h3>
            <p className="text-sm text-muted-foreground">For Windows 10 and later (64-bit)</p>
            <Button asChild variant={isWindows() ? "bright" : "subtle"}>
              <a href={WINDOWS_INSTALLER_URL} download>
                <Download className="mr-2 h-4 w-4" />
                64-bit installer (.exe)
              </a>
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Linux</h3>
            <p className="text-sm text-muted-foreground">Compatible with all major Linux distributions</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isLinux() ? "bright" : "subtle"}>
                <a href={LINUX_APPIMAGE_URL} download>
                  <Download className="mr-2 h-4 w-4" />
                  64-bit AppImage
                </a>
              </Button>
              <Button asChild variant={isLinux() ? "bright" : "subtle"}>
                <a href={LINUX_DEB_URL} download>
                  <Download className="mr-2 h-4 w-4" />
                  64-bit deb package
                </a>
              </Button>
              <Button asChild variant={isLinux() ? "bright" : "subtle"}>
                <a href={LINUX_RPM_URL} download>
                  <Download className="mr-2 h-4 w-4" />
                  64-bit RPM package
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Mobile</h3>
            <p className="text-sm text-muted-foreground">Get Helper on your phone or tablet</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isIOS() ? "bright" : "subtle"}>
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Apple className="mr-2 h-4 w-4" />
                  iOS App Store
                </a>
              </Button>
              <Button asChild variant={isAndroid() ? "bright" : "subtle"}>
                <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">
                  <Android className="mr-2 h-4 w-4" />
                  Google Play Store
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NativeAppModal;
