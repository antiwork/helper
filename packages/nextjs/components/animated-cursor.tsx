"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface AnimatedCursorProps {
  position: { x: number; y: number }
  animate?: boolean
  stopAnimation?: boolean
  showSpotlight?: boolean
  labelPosition?: "left" | "right" | "top" | "bottom"
}

export default function AnimatedCursor({
  position,
  animate = true,
  stopAnimation = false,
  showSpotlight = true,
  labelPosition = "left",
}: AnimatedCursorProps) {
  const [isWaving, setIsWaving] = useState(false)
  const [cursorVariant, setCursorVariant] = useState("initial")
  const [spotlightIntensity, setSpotlightIntensity] = useState(0)
  const [isFlickering, setIsFlickering] = useState(false)
  const [hasStartedMoving, setHasStartedMoving] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const sequenceRunning = useRef(false)

  // Define the cursor animation variants
  const cursorVariants = {
    initial: position,
    animate1: {
      x: position.x + 30,
      y: position.y - 20,
      transition: { duration: 1.2, ease: "easeInOut" },
    },
    animate2: {
      x: position.x - 20,
      y: position.y + 15,
      transition: { duration: 1.5, ease: "easeInOut" },
    },
    animate3: {
      x: position.x + 10,
      y: position.y + 25,
      transition: { duration: 1.3, ease: "easeInOut" },
    },
    animate4: {
      x: position.x,
      y: position.y,
      transition: { duration: 1, ease: "easeInOut" },
    },
    rest: position,
  }

  // Get label position styles
  const getLabelPositionStyle = () => {
    switch (labelPosition) {
      case "left":
        return { left: "-40px", top: "30px" }
      case "right":
        return { right: "-40px", top: "-30px" }
      case "top":
        return { top: "-30px", left: "0px", transform: "translateX(-50%)" }
      case "bottom":
        return { bottom: "-30px", left: "0px", transform: "translateX(-50%)" }
      default:
        return { left: "-80px", top: "0px" }
    }
  }

  // Stop animation when requested
  useEffect(() => {
    if (stopAnimation) {
      sequenceRunning.current = false
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
      setCursorVariant("rest")
    }
  }, [stopAnimation])

  // Initial animation sequence - flickering spotlight, then wave, then movement
  useEffect(() => {
    if (!animate) return
    sequenceRunning.current = true

    // Step 1: Wait, then flicker on the spotlight
    const startFlickering = async () => {
      // Wait before starting the flicker
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (!sequenceRunning.current) return

      // Flickering sequence
      setIsFlickering(true)
      setTimeout(() => setSpotlightIntensity(0.4), 0)
      setTimeout(() => setSpotlightIntensity(0.1), 100)
      setTimeout(() => setSpotlightIntensity(0.7), 200)
      setTimeout(() => setSpotlightIntensity(0.2), 300)
      setTimeout(() => {
        setSpotlightIntensity(1)

        // Step 2: After spotlight is on, start waving
        setTimeout(() => {
          if (!sequenceRunning.current) return
          setIsWaving(true)

          // Step 3: After waving, start movement loop
          setTimeout(() => {
            if (!sequenceRunning.current) return
            setIsWaving(false)
            setHasStartedMoving(true)
            startMovementLoop()
          }, 2000) // Wave for 2 seconds
        }, 500) // Wait 0.5s after spotlight is on before waving
      }, 500) // Final flicker to full intensity
    }

    startFlickering()

    return () => {
      sequenceRunning.current = false
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [animate])

  // Movement loop - only starts after spotlight and waving
  const startMovementLoop = async () => {
    if (!sequenceRunning.current) return

    // Movement sequence
    const runMovementLoop = async () => {
      if (!sequenceRunning.current) return

      // Move to position 1
      setCursorVariant("animate1")
      await new Promise((resolve) => setTimeout(resolve, 1200))
      if (!sequenceRunning.current) return

      // Move to position 2
      setCursorVariant("animate2")
      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (!sequenceRunning.current) return

      // Move to position 3
      setCursorVariant("animate3")
      await new Promise((resolve) => setTimeout(resolve, 1300))
      if (!sequenceRunning.current) return

      // Return to original position
      setCursorVariant("animate4")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (!sequenceRunning.current) return

      // Loop the sequence
      if (sequenceRunning.current) {
        animationRef.current = setTimeout(runMovementLoop, 500)
      }
    }

    runMovementLoop()
  }

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      variants={cursorVariants}
      initial="initial"
      animate={cursorVariant}
    >
      {/* Spotlight effect - only show if showSpotlight is true */}
      {showSpotlight && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: "180px",
            height: "180px",
            top: "-90px",
            left: "-90px",
            background: "radial-gradient(circle, rgba(255, 221, 51, 0.25) 0%, rgba(255, 221, 51, 0.15) 40%, rgba(255, 221, 51, 0) 60%)",
opacity: spotlightIntensity,
            transition: isFlickering ? "opacity 0.1s linear" : "opacity 0.5s ease-in-out",
          }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 2,
            ease: "easeInOut",
          }}
        />
      )}

      <div className="relative">
        <motion.div
          className="bg-black rounded-full w-6 h-6 flex items-center justify-center"
          animate={
            isWaving
              ? {
                  rotate: [0, 15, -15, 15, -15, 15, -15, 0],
                }
              : {}
          }
          transition={
            isWaving
              ? {
                  duration: 1.5,
                  ease: "easeInOut",
                }
              : {}
          }
        >
          <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6.54297 7.45803C5.51393 6.39426 9.93144 3.39129 9.93144 3.39129L8.80283 1.80955C8.80283 1.80955 7.07297 3.25637 5.79286 4.94131C5.52148 5.32133 4.98879 5.0078 5.31096 4.46884C6.10498 3.14037 8.40516 0.991963 8.40516 0.991963L6.65741 0.145129C6.65741 0.145129 5.51872 1.2598 4.08397 4.05591C3.82159 4.56718 3.28791 4.30831 3.46938 3.78141C3.93377 2.43304 5.44008 0.289442 5.44008 0.289442L3.60942 0C3.60942 0 2.622 1.73626 2.00838 3.89434C1.87715 4.35567 1.30568 4.24581 1.37359 3.7875C1.49117 2.99389 2.3054 0.698215 2.3054 0.698215L0.722135 0.704811C0.722135 0.704811 -0.63175 3.77528 0.368085 7.16219C0.937448 9.09087 2.71935 11 5.04475 11C7.32511 11 9.32076 9.29496 10 6.66496L8.41846 5.5006C8.41846 5.5006 7.5369 8.48553 6.54297 7.45803Z"
              fill="white"
            />
          </svg>
        </motion.div>
        <div className="absolute" style={getLabelPositionStyle()}>
          <div className="bg-yellow-400 text-black rounded-full px-2 py-0.5 text-xs whitespace-nowrap">Helper</div>
        </div>
      </div>
    </motion.div>
  )
}
