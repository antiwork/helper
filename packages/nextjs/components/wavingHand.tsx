"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface WavingHandProps {
  className?: string;
  isWaving?: boolean;
  waveDuration?: number;
}

export default function WavingHand({ className = "", isWaving = false, waveDuration = 1 }: WavingHandProps) {
  const [waving, setWaving] = useState(false);

  // Wave on page load and set up random waving
  useEffect(() => {
    // Initial wave on page load
    setWaving(true);

    const initialWaveTimer = setTimeout(() => {
      setWaving(false);
      startRandomWaving();
    }, waveDuration * 1000);

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

      return randomWave();
    }

    return () => {
      clearTimeout(initialWaveTimer);
    };
  }, [waveDuration]);

  return (
    <div
      className={`${className} relative`}
      onMouseEnter={() => setWaving(true)}
      onMouseLeave={() => !isWaving && setWaving(false)}
    >
      <Image
        src="/logo-hand.svg"
        priority
        alt="Helper Icon"
        width={28}
        height={32}
        className={`transition-transform ${waving || isWaving ? "animate-wave" : ""}`}
      />
    </div>
  );
}
