import { isSpeechRecognitionSupported } from '@/lib/shared/browser';
import { useEffect, useState } from 'react';

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recognition, setRecognition] = useState<any>(null);

  const isSupported = isSpeechRecognitionSupported()

  const getRecognition = () => {
    if (!isSupported) return null;

    if (!recognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';

        // Combine all results
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        setError(event.error || 'Speech recognition error');
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
      setError('Speech recognition is not supported in this browser');
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
    startRecording,
    stopRecording,
  };
}

