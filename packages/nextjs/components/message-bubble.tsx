"use client"

import { motion } from "framer-motion"

interface MessageBubbleProps {
  position: { x: number; y: number }
  text: string
  variant?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
}

export default function MessageBubble({ position, text, variant = "bottomRight" }: MessageBubbleProps) {
  // Calculate position and styles based on variant
  const getBubbleStyles = () => {
    switch (variant) {
      case "topLeft":
        return {
          left: "auto",
          right: "0px",
          top: "auto",
          bottom: "0px",
          transform: "translate(0, 0)",
        }
      case "topRight":
        return {
          left: "20px",
          right: "auto",
          top: "auto",
          bottom: "0px",
          transform: "translate(0, 0)",
        }
      case "bottomLeft":
        return {
          left: "auto",
          right: "10px",
          top: "10px",
          bottom: "auto",
          transform: "translate(0, 0)",
        }
      case "bottomRight":
        return {
          left: "30px",
          right: "auto",
          top: "10px",
          bottom: "auto",
          transform: "translate(0, 0)",
        }
      default:
        return {
          left: "30px",
          right: "auto",
          top: "30px",
          bottom: "auto",
          transform: "translate(0, 0)",
        }
    }
  }

  return (
    <motion.div
      className="absolute z-40"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-black p-4 rounded-xl border border-gray-800 w-[300px] absolute" style={getBubbleStyles()}>
        <p className="text-sm text-white">{text}</p>
      </div>
    </motion.div>
  )
}
