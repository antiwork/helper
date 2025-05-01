"use client";

import { useEffect, useState } from "react";

interface AnimatedTypingProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export default function AnimatedTyping({ text, speed = 50, onComplete }: AnimatedTypingProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <div>
      <span>{displayedText}</span>
      {!isComplete && <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse"></span>}
    </div>
  );
}
