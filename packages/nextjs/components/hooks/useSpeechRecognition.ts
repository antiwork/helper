import { useCallback, useEffect, useRef, useState } from "react";
import { isSpeechRecognitionSupported } from "@/lib/shared/browser";

interface UseSpeechRecognitionProps {
  onSegment?: (segment: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onSegment, onError }: UseSpeechRecognitionProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported = isSpeechRecognitionSupported();

  const setupRecognition = useCallback(() => {
    if (!isSupported || recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinalSegment = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) {
          newFinalSegment = result[0]?.transcript || "";
        }
      }

      if (newFinalSegment && onSegment) {
        onSegment(newFinalSegment);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMsg = event.error || "Speech recognition error";
      if (onError) {
        onError(errorMsg);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [isSupported, onSegment, onError]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      if (onError) {
        onError("Speech recognition is not supported in this browser");
      }
      return;
    }

    const recognition = setupRecognition();
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
    }

    try {
      recognition.start();
      setIsRecording(true);
    } catch (err: any) {
      if (onError) {
        onError(`Failed to start recording: ${err.message}`);
      }
      setIsRecording(false);
    }
  }, [isSupported, setupRecognition, onError, isRecording]);

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition && isRecording) {
      recognition.stop();
    }
  }, [isRecording]);

  useEffect(() => {
    setupRecognition();
  }, [setupRecognition]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return {
    isSupported,
    isRecording,
    startRecording,
    stopRecording,
  };
}
