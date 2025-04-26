export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;

  return 'SpeechRecognition' in window ||
         'webkitSpeechRecognition' in window;
}