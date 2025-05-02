"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type MessageBubbleProps = {
  position: { x: number; y: number };
  text: string;
  variant: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
};

export function MessageBubble({ position, text, variant }: MessageBubbleProps) {
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let x = position.x;
    let y = position.y;

    const offset = 20; // Distance from cursor

    switch (variant) {
      case "topLeft":
        x -= 150 + offset;
        y -= 80 + offset;
        break;
      case "topRight":
        x += 150 + offset;
        y -= 80 + offset;
        break;
      case "bottomLeft":
        x -= 150 + offset;
        y += 80 + offset;
        break;
      case "bottomRight":
        x += 150 + offset;
        y += 80 + offset;
        break;
    }

    setBubblePosition({ x, y });
  }, [position, variant]);

  const getTailPosition = () => {
    switch (variant) {
      case "topLeft":
        return "bottom-[-8px] right-[20px] transform rotate-45";
      case "topRight":
        return "bottom-[-8px] left-[20px] transform rotate-45";
      case "bottomLeft":
        return "top-[-8px] right-[20px] transform rotate-45";
      case "bottomRight":
        return "top-[-8px] left-[20px] transform rotate-45";
    }
  };

  return (
    <motion.div
      className="fixed z-40 max-w-xs pointer-events-none"
      style={{
        left: `${bubblePosition.x}px`,
        top: `${bubblePosition.y}px`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative bg-yellow-400 text-black p-4 rounded-lg shadow-lg">
        <p className="text-sm">{text}</p>
        <div className={`absolute w-4 h-4 bg-yellow-400 ${getTailPosition()}`} />
      </div>
    </motion.div>
  );
}

export default MessageBubble;
