import React, { useState, useEffect, useRef } from 'react';
import { Tour, User, Booking, Language } from '../types';
import { ViSGoRagEngine, RagActionItem } from '../utils/ragEngine';
import { sounds } from '../utils/audio';

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  tours: Tour[];
  hosts: User[];
  bookings: Booking[];
  activeUser: User | null;
  onSelectTour: (tour: Tour) => void;
  onSelectCity?: (city: string) => void;
}

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionItems?: RagActionItem[];
}

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({
  isOpen,
  onClose,
  language,
  tours,
  hosts,
  bookings,
  activeUser,
  onSelectTour,
  onSelectCity,
}) => {
  const isVi = language === 'vi';
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt starters
  const starterPrompts = isVi
    ? [
        '🍜 Tour ẩm thực ngõ hẻm Hà Nội ngon nhất',
        '🛵 Tour xe máy Vespa đêm ở TP. Hồ Chí Minh',
        '🏮 Gợi ý lịch trình dạo chơi Hội An',
        '☕ Địa chỉ thưởng thức cà phê trứng phố cổ',
      ]
    : [
        '🍜 Best hidden alleyway food tours in Hanoi',
        '🛵 Vintage Vespa night tours in Ho Chi Minh City',
        '🏮 Recommendations for exploring Hoi An',
        '☕ Best egg coffee spots in the Old Quarter',
      ];

  // Initialize initial greeting when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting = isVi
        ? `Xin chào ${activeUser ? activeUser.name : 'bạn'}! 🇻🇳\nTôi là **ViS-AI** - trợ lý hỗ trợ tìm kiếm tour trải nghiệm bản địa, khám phá ẩm thực ngõ hẻm và kết nối với các bạn Host địa phương.\n\nBạn đang muốn khám phá thành phố nào (Hà Nội, Sài Gòn, Đà Nẵng, Hội An...) hay cần tư vấn trải nghiệm gì hôm nay?`
        : `Hello ${activeUser ? activeUser.name : 'there'}! 🇻🇳\nI am **ViS-AI** - your local travel companion on ViS-Go. I can help you discover authentic alleyway tours, street food spots, and connect with local buddies.\n\nWhich destination or experience would you like to explore today?`;

      setMessages([
        {
          id: 'msg-init',
          role: 'assistant',
          text: initialGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, isVi, activeUser]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    sounds.playMessageSent();
    const userMsg: ChatItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const response = await ViSGoRagEngine.queryRag(
        text,
        tours,
        hosts,
        bookings,
        activeUser,
        history,
        language
      );

      sounds.playNotificationPing();
      const assistantMsg: ChatItem = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionItems: response.actionItems,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      const fallbackMsg: ChatItem = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        text: isVi
          ? 'Rất tiếc, đã có gián đoạn kết nối. Bạn có thể chọn các gợi ý bên dưới để tiếp tục nhé!'
          : 'Sorry, there was a temporary network hitch. Please choose one of the suggestions below!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: RagActionItem) => {
    if (action.type === 'tour' && action.payload) {
      onSelectTour(action.payload as Tour);
    } else if (action.type === 'city' && action.payload && onSelectCity) {
      onSelectCity(action.payload as string);
      onClose();
    }
  };

  const handleVoiceSim = () => {
    setIsListening(true);
    sounds.playTap();
    setTimeout(() => {
      setIsListening(false);
      const randomVoiceQuery = isVi
        ? 'Gợi ý tour ẩm thực đêm phố cổ Hà Nội có thưởng thức phở gánh'
        : 'Find me the best street food tour in Hanoi Old Quarter';
      setInputValue(randomVoiceQuery);
    }, 1500);
  };

  const handleClearHistory = () => {
    setMessages([]);
    sounds.playTap();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden max-h-[90vh] h-[720px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#4A1010] p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-[#A82323] border border-[#D4AF37]/50 flex items-center justify-center text-white text-base shadow-md">
                <i className="fa-solid fa-wand-magic-sparkles text-[#D4AF37]"></i>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-stone-900"></span>
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                ViS-AI
              </h3>
              <p className="text-[11px] text-stone-300">
                {isVi ? 'Trợ lý du lịch bản địa' : 'Local Travel Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="w-8 h-8 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 text-xs flex items-center justify-center transition-colors cursor-pointer"
              title={isVi ? 'Xóa cuộc trò chuyện' : 'Clear Chat'}
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 text-sm flex items-center justify-center transition-colors cursor-pointer"
              title={isVi ? 'Đóng' : 'Close'}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-stone-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-[#A82323] text-white rounded-tr-xs'
                    : 'bg-white text-stone-900 border border-stone-200/90 rounded-tl-xs'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-4 mb-1.5 opacity-80 text-[10px]">
                  <span className="font-bold uppercase tracking-wider">
                    {m.role === 'user'
                      ? (activeUser?.name || (isVi ? 'Bạn' : 'You'))
                      : 'ViS-AI'}
                  </span>
                  <span>{m.timestamp}</span>
                </div>

                {/* Message Body */}
                <div className="whitespace-pre-line prose-sm font-sans">{m.text}</div>

                {/* Interactive Action Chips for Tours */}
                {m.actionItems && m.actionItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                    {m.actionItems.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(act)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8C6D1F] border border-[#D4AF37]/50 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer hover:scale-102"
                      >
                        <span>{act.label}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2 text-stone-500 text-xs">
              <div className="w-7 h-7 rounded-xl bg-stone-200 flex items-center justify-center text-stone-600 text-xs">
                <i className="fa-solid fa-wand-magic-sparkles animate-spin"></i>
              </div>
              <div className="bg-white border border-stone-200 px-4 py-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#A82323] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-stone-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-stone-600 text-xs ml-1 font-medium">
                  {isVi ? 'Đang tra cứu dữ liệu tour & tổng hợp câu trả lời...' : 'Searching live tours & synthesizing answer...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Suggestion Chips */}
        <div className="px-4 py-2.5 bg-white border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-stone-400 shrink-0">
            <i className="fa-regular fa-lightbulb text-amber-500 mr-1"></i>
            {isVi ? 'Gợi ý:' : 'Quick:'}
          </span>
          {starterPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isLoading}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer border border-stone-200/60"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleVoiceSim}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
              title={isVi ? 'Mô phỏng nhập bằng giọng nói' : 'Simulate voice query'}
            >
              <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isListening
                    ? isVi
                      ? 'Đang lắng nghe câu hỏi của bạn...'
                      : 'Listening to your voice...'
                    : isVi
                    ? 'Hỏi về tour ẩm thực, host bản địa, giá vé, thanh toán...'
                    : 'Ask about street food tours, local buddies, escrow...'
                }
                disabled={isLoading}
                className="w-full pl-4 pr-10 py-2.5 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 focus:border-[#A82323] focus:ring-1 focus:ring-[#A82323] rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden transition-all"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2.5 bg-[#A82323] hover:bg-[#8C1818] disabled:bg-stone-200 text-white disabled:text-stone-400 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <span className="hidden sm:inline">{isVi ? 'Gửi' : 'Send'}</span>
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
