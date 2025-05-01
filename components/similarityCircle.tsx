import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SimilarityCircleProps {
  similarity: number;
  size?: "sm" | "md";
}

export const SimilarityCircle = ({ similarity }: SimilarityCircleProps) => {
  const percentage = Math.round(similarity * 100);
  const radius = 6;
  const strokeWidth = 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${similarity * circumference} ${circumference}`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger>
          <svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2} className="transform -rotate-90">
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="opacity-20"
            />
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              className="transition-all duration-200"
            />
          </svg>
        </TooltipTrigger>
        <TooltipContent>
          <p>{percentage}% similar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
