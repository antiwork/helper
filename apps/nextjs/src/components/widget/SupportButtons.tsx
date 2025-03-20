import React from "react";

type Props = {
  onHelpfulClick: () => void;
  onTalkToTeamClick: () => void;
};

export default function SupportButtons({ onHelpfulClick, onTalkToTeamClick }: Props) {
  return (
    <div className="flex justify-center gap-4 py-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={onHelpfulClick}
        className="flex items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200"
      >
        That helped
      </button>
      <button
        onClick={onTalkToTeamClick}
        className="flex items-center gap-2 rounded-full border border-gray-400 px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200"
      >
        Talk to the team
      </button>
    </div>
  );
}
