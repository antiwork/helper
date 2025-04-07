import confetti from "canvas-confetti";

interface ConfettiOptions {
  target?: string;
  intensity?: "low" | "medium" | "high";
}

const confettiConfig = {
  low: {
    particleCount: 50,
    spread: 40,
    origin: { y: 0.6 },
  },
  medium: {
    particleCount: 70,
    spread: 60,
    origin: { y: 0.6 },
  },
  high: {
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
  },
};

export const triggerConfetti = ({ target, intensity = "medium" }: ConfettiOptions = {}) => {
  const config = confettiConfig[intensity];
  const targetElement = target ? document.getElementById(target) : null;
  const rect = targetElement?.getBoundingClientRect();

  const origin = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : config.origin;

  confetti({
    ...config,
    disableForReducedMotion: true,
    scalar: 0.5,
    gravity: 0.85,
    decay: 0.75,
    ticks: 100,
    origin,
    shapes: ["square", "circle"],
  });
};
