import React from 'react';
import { Language } from '../types';
import { sounds } from '../utils/audio';

interface FloatingAIBubbleProps {
  language: Language;
  onOpenAIChat: () => void;
}

export const FloatingAIBubble: React.FC<FloatingAIBubbleProps> = ({
  language,
  onOpenAIChat,
}) => {
  const isVi = language === 'vi';

  const handleClick = () => {
    sounds.playTap();
    onOpenAIChat();
  };

  return (
    <aside aria-label="ViS-AI Assistant Trigger" className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1.5 pointer-events-auto select-none">
      {/* Exactly 1 Single Messenger Floating Chat Bubble */}
      <button
        onClick={handleClick}
        className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#991B1B] via-[#B91C1C] to-[#DC2626] text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer border-2 border-white group"
        title="ViS-AI"
        aria-label="Open ViS-AI Chat"
      >
        {/* Chat icon */}
        <i className="fa-solid fa-comments text-2xl group-hover:rotate-6 transition-transform"></i>

        {/* Online status indicator */}
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
      </button>

      {/* Label for the bubble above, not a control of its own. It used to be a
          second <button> firing the same handler: a duplicate tap target, and
          at 23px tall the smallest one on the page. */}
      <span
        aria-hidden="true"
        className="px-2.5 py-0.5 bg-stone-900/90 text-white text-[11px] font-bold rounded-full shadow-md flex items-center gap-1.5 border border-stone-700/60 tracking-wide"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>ViS-AI</span>
      </span>
    </aside>
  );
};
