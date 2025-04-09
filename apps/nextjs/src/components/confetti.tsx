import confetti from "canvas-confetti";

interface ConfettiOptions {
  target?: string;
}

export const triggerConfetti = ({ target }: ConfettiOptions = {}) => {
  const targetElement = target ? document.getElementById(target) : null;
  const rect = targetElement?.getBoundingClientRect();

  const origin = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : { y: 0.7, x: 0.5 };

  confetti({
    origin,
    particleCount: 150,
    spread: 100,
    disableForReducedMotion: true,
    scalar: 0.6,
  });
};
