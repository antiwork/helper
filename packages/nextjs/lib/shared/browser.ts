export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;

  // https://github.com/mdn/browser-compat-data/issues/22126
  const isEdgeMacArm =
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Edg") &&
    navigator.userAgent.includes("Mac") &&
    /arm64|aarch64/.test(navigator.userAgent);

  if (isEdgeMacArm) return false;

  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}
