import { useState, useTransition } from "react";
import { Button } from "../components/ui/button";
import { sendContactEmail } from "./actions/contactForm";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ContactModal({ isOpen, onClose, onSuccess }: ContactModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await sendContactEmail(formData);

      if (result.success) {
        (event.target as HTMLFormElement).reset();
        onClose();
        onSuccess(result.message!);
      } else {
        setErrorMessage(result.error!);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 bg-[#1A0505]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#3B1B1B] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Contact sales</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-lg mb-6 bg-red-900/50 border border-red-700 text-red-100">{errorMessage}</div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-3 bg-[#2B0808] border border-[#4B2B2B] rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#FFD34E] transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Work email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 bg-[#2B0808] border border-[#4B2B2B] rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#FFD34E] transition-colors"
              placeholder="your.email@company.com"
            />
          </div>

          <div>
            <label htmlFor="employees" className="block text-sm font-medium text-white mb-2">
              Number of employees
            </label>
            <select
              id="employees"
              name="employees"
              required
              className="w-full px-4 py-3 bg-[#2B0808] border border-[#4B2B2B] rounded-lg text-white focus:outline-none focus:border-[#FFD34E] transition-colors"
            >
              <option value="">Select range</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>

          <div>
            <label htmlFor="tickets" className="block text-sm font-medium text-white mb-2">
              Number of customer support tickets monthly
            </label>
            <select
              id="tickets"
              name="tickets"
              required
              className="w-full px-4 py-3 bg-[#2B0808] border border-[#4B2B2B] rounded-lg text-white focus:outline-none focus:border-[#FFD34E] transition-colors"
            >
              <option value="">Select range</option>
              <option value="0-50">0-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="501-1000">501-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>

          <div>
            <label htmlFor="issues" className="block text-sm font-medium text-white mb-2">
              Most common customer support issues
            </label>
            <textarea
              id="issues"
              name="issues"
              rows={4}
              className="w-full px-4 py-3 bg-[#2B0808] border border-[#4B2B2B] rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#FFD34E] transition-colors resize-none"
              placeholder="Describe your most common support issues..."
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#FFD34E] hover:bg-[#FFE6B0] text-[#2B0808] hover:text-[#2B0808] font-medium px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
