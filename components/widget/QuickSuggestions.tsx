import { useState } from "react";  
import { Button } from "../ui/button";  
import { AnimatePresence, motion } from "framer-motion";  
  
type SuggestionItem = {  
  label: string;  
  prompt: string;  
};  
  
const SUGGESTIONS: SuggestionItem[] = [  
  { label: "Where's my payout?", prompt: "Where's my payout?" },  
  { label: "Publishing error", prompt: "Why won't my post publish?" },  
  { label: "Email tools locked", prompt: "How do I unlock email tools?" },  
  { label: "KYC help", prompt: "How do I complete verification?" },  
];  
  
type Props = {  
  onSuggestionClick: (prompt: string) => void;  
  isVisible: boolean;  
};  

export default function QuickSuggestions({ onSuggestionClick, isVisible }: Props) {  
  const [hasInteracted, setHasInteracted] = useState(false);  
  
  const handleSuggestionClick = (prompt: string) => {  
    setHasInteracted(true);  
    onSuggestionClick(prompt);  
  };  

if (!isVisible || hasInteracted) return null;  
  
  return (  
    <AnimatePresence>  
      <motion.div  
        className="flex flex-wrap justify-center gap-2 py-3"  
        initial={{ opacity: 0, y: 20 }}  
        animate={{ opacity: 1, y: 0 }}  
        exit={{ opacity: 0, y: 20 }}  
        transition={{ duration: 0.3 }}  
      >  
        {SUGGESTIONS.map((suggestion, index) => (  
          <Button  
            key={index}  
            variant="subtle"  
            size="sm"  
            className="text-sm"  
            onClick={() => handleSuggestionClick(suggestion.prompt)}  
          >  
            {suggestion.label}  
          </Button>  
        ))}  
      </motion.div>  
    </AnimatePresence>  
  );  
}
