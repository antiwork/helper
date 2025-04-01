"use client";

import { TauriDragArea } from "@/components/tauriDragArea";
import { useNativePlatform } from "@/components/useNativePlatform";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { nativePlatform, isLegacyTauri } = useNativePlatform();
  return (
    <>
      {nativePlatform === "macos" && isLegacyTauri && <TauriDragArea className="top-0 inset-x-0 h-8" />}
      {children}
    </>
  );
}
