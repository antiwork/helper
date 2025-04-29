import { useEffect, useRef, useState } from "react";
import { isSpeechRecognitionSupported } from "@/lib/shared/browser";

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [latestSegment, setLatestSegment] = useState<{
    id: string;
    segment: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  const isSupported = isSpeechRecognitionSupported();

  const getRecognition = () => {
    if (!isSupported) return null;

    if (!recognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let newFinalSegment = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (!result) continue;
          if (result.isFinal) {
            const segment = result[0]?.transcript || "";
            finalTranscript += segment;
            newFinalSegment = segment;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }

        if (newFinalSegment) {
          setLatestSegment({
            id: new Date().getTime().toString(),
            segment: newFinalSegment,
          });
        }
      };

      recognition.onerror = (event: any) => {
        setError(event.error || "Speech recognition error");
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognition);

      return recognition;
    }

    return recognition;
  };

  const startRecording = () => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = getRecognition();
    if (!recognition) return;

    recognition.start();
    setIsRecording(true);
    setError(null);
  };

  const stopRecording = () => {
    const recognition = getRecognition();
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  return {
    isSupported,
    isRecording,
    transcript,
    error,
    latestSegment,
    startRecording,
    stopRecording,
  };
}
