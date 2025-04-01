"use client";

import { invoke } from "@tauri-apps/api/core";
import { useRunOnce } from "@/components/useRunOnce";

export default function SignedOutPage() {
  useRunOnce(() => {
    invoke("close_all_tabs");
  });

  return null;
}
