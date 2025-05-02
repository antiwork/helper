"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type AnimatedCursorProps = {
  position: { x: number; y: number };
  animate: boolean;
  showSpotlight: boolean;
  labelPosition: "left" | "right" | "top" | "bottom";
};

export function AnimatedCursor({ position, animate, showSpotlight, labelPosition }: AnimatedCursorProps) {
  const [cursorPosition, setCursorPosition] = useState(position);

  useEffect(() => {
    if (!animate) {
      setCursorPosition(position);
      return;
    }

    const animationDuration = 500; // ms
    const startTime = Date.now();
    const startPosition = { ...cursorPosition };
    const endPosition = { ...position };

    const animateCursor = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / animationDuration, 1);

      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
      const easedProgress = easeOutCubic(progress);

      const newX = startPosition.x + (endPosition.x - startPosition.x) * easedProgress;
      const newY = startPosition.y + (endPosition.y - startPosition.y) * easedProgress;

      setCursorPosition({ x: newX, y: newY });

      if (progress < 1) {
        requestAnimationFrame(animateCursor);
      }
    };

    requestAnimationFrame(animateCursor);
  }, [position, animate]);

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${cursorPosition.x}px`,
        top: `${cursorPosition.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {showSpotlight && (
        <motion.div
          className="absolute rounded-full bg-yellow-400/20"
          initial={{ width: 0, height: 0 }}
          animate={{ width: 100, height: 100 }}
          transition={{ duration: 0.5 }}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
      <motion.div
        className="w-8 h-8 rounded-full border-2 border-yellow-400 flex items-center justify-center"
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
      </motion.div>
    </div>
  );
}

export default AnimatedCursor;
