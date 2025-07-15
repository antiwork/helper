"use client";

import { useCallback } from "react";

function withHelperWidget(callback: (helperWidget: typeof window.HelperWidget) => void) {
  if (!window.HelperWidget) {
    console.warn("[useHelper] HelperWidget is undefined. Did you set up the provider?");
    return;
  }
  callback(window.HelperWidget);
}

export function useHelper() {
  const show = useCallback(() => {
    withHelperWidget((helperWidget) => helperWidget?.show());
  }, []);

  const hide = useCallback(() => {
    withHelperWidget((helperWidget) => helperWidget?.hide());
  }, []);

  const toggle = useCallback(() => {
    withHelperWidget((helperWidget) => helperWidget?.toggle());
  }, []);

  const sendPrompt = useCallback((prompt: string) => {
    withHelperWidget((helperWidget) => helperWidget?.sendPrompt(prompt));
  }, []);

  return {
    show,
    hide,
    toggle,
    sendPrompt,
  };
}
