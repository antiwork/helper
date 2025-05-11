import type * as React from "react";
import UAParser from "ua-parser-js";

export const onModEnterKeyboardEvent = (callback: () => any) => (event: React.KeyboardEvent<HTMLElement>) => {
  const isMacOS = new UAParser().getOS().name === "Mac OS";
  if ((isMacOS && event.metaKey && event.key === "Enter") || (!isMacOS && event.ctrlKey && event.key === "Enter")) {
    event.preventDefault();
    callback();
  }
};
