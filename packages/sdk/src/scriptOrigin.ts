if (typeof window === "undefined" || !window.document.currentScript) {
  throw new Error("Script origin not found. The SDK is intended to run in a browser environment.");
}

export const scriptOrigin = new URL((window.document.currentScript as HTMLScriptElement)?.src).origin;

if (!scriptOrigin) {
  throw new Error("Script origin not found. The SDK is intended to run in a browser environment.");
}
