"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

interface LogoProps {
  themePreference?: "auto" | "light" | "dark";
  className?: string;
  isWaving?: boolean;
  waveDuration?: number;
}

export default function Logo({
  themePreference = "auto",
  className = "",
  isWaving = false,
  waveDuration = 1,
}: LogoProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [waving, setWaving] = useState(false);
  const { theme, systemTheme } = useTheme();

  // Wave on page load and set up random waving
  useEffect(() => {
    // Initial wave on page load
    setWaving(true);

    const initialWaveTimer = setTimeout(() => {
      setWaving(false);
      startRandomWaving();
    }, waveDuration * 1000);

    let cleanupRandomWaving: () => void;
    function startRandomWaving() {
      const randomWave = () => {
        // Between 3-5 seconds (3000-5000ms)
        const randomDelay = Math.floor(Math.random() * (5000 - 3000) + 3000);

        const waveTimer = setTimeout(() => {
          setWaving(true);

          const stopWaveTimer = setTimeout(() => {
            setWaving(false);
            randomWave();
          }, waveDuration * 1000);

          return () => clearTimeout(stopWaveTimer);
        }, randomDelay);

        return () => clearTimeout(waveTimer);
      };

      cleanupRandomWaving = randomWave();
      return cleanupRandomWaving;
    }

    return () => {
      clearTimeout(initialWaveTimer);
      if (cleanupRandomWaving) {
        cleanupRandomWaving();
      }
    };
  }, [waveDuration]);

  return (
    <div className={`${className} flex items-center`}>
      <div
        className="relative"
        onMouseEnter={() => setWaving(true)}
        onMouseLeave={() => !isWaving && setWaving(false)}
        role="img"
        aria-label="Helper Icon"
      >
        <Image
          src="/logo-hand.svg"
          alt="Helper Icon"
          width={28}
          height={32}
          className={`transition-transform ${
            (waving || isWaving) && !prefersReducedMotion
              ? "animate-wave"
              : ""
          }`}
          priority
        />
      </div>
      <Image
        src={
          themePreference === "dark"
            ? "/logo-text-white.svg"
            : themePreference === "light"
              ? "/logo-text.svg"
              : theme === "dark" || systemTheme === "dark"
                ? "/logo-text-white.svg"
                : "/logo-text.svg"
        }
        alt="Helper"
        width="82"
        height="32"
      />
    </div>
  );
}
