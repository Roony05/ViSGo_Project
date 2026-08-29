import React, { useRef, useState } from 'react';
import type { Language } from '../types';
import { hostAssist, type HostAssistOutcome } from '../utils/aiClient';
import { ChatMarkdown } from './ChatMarkdown';

export interface ListingDraft {
  title: string;
  tagline: string;
  description: string;
  included: string;
  meetingPoint: string;
}

interface HostAiAssistantProps {
  language: Language;
  draft: ListingDraft;
  tourLanguages: string[];
  onApply: (patch: Partial<ListingDraft>) => void;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  patch?: Partial<ListingDraft>;
}

const QUICK_PROMPTS = {
  vi: ['Viết hay hơn', 'Dịch sang tiếng Anh', 'Dịch sang tiếng Việt', 'Ngắn gọn lại'],
  en: ['Polish this', 'Translate to English', 'Translate to Vietnamese', 'Make it concise'],
};

export const HostAiAssistant: React.FC<HostAiAssistantProps> = ({
  language,
  draft,
  tourLanguages,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const calls = useRef(0);
  const nextId = useRef(1);
  const cache = useRef(new Map<string, HostAssistOutcome>());
  const isVi = language === 'vi';

  const failureText = (reason?: string) => {
    if (reason === 'RATE_LIMITED') return isVi ? 'Bạn gửi hơi nhanh. Đợi một phút rồi thử lại.' : 'Too many requests. Wait a minute and try again.';
    if (reason === 'DAILY_CAP') return isVi ? 'Trợ lý đã chạm giới hạn AI hôm nay.' : 'The assistant reached today’s AI limit.';
    if (reason === 'NO_API_KEY') return isVi ? 'Backend chưa có GEMINI_API_KEY.' : 'The backend has no GEMINI_API_KEY.';
    return isVi ? 'Trợ lý AI hiện không dùng được. Nội dung form vẫn được giữ nguyên.' : 'The AI assistant is unavailable. Your draft was left unchanged.';
  };

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || busy) return;

    if (calls.current >= 12) {
      setMessages((previous) => [
        ...previous,
        { id: nextId.current++, role: 'assistant', text: isVi ? 'Bạn đã dùng đủ 12 lượt trong lần mở form này.' : 'You have used all 12 requests for this form session.' },
      ]);
      return;
    }

    const history = messages.map(({ role, text }) => ({ role: role === 'assistant' ? 'model' : 'user', text }));
    const fingerprint = JSON.stringify(draft) + '\u0001' + message;
    const userMessage: Message = { id: nextId.current++, role: 'user', text: message };
    setMessages((previous) => [...previous, userMessage]);
    setInput('');

    let outcome = cache.current.get(fingerprint);
    if (!outcome) {
      setBusy(true);
      calls.current += 1;
      outcome = await hostAssist({ message, draft, tourLanguages, history, uiLanguage: language });
      cache.current.set(fingerprint, outcome);
      setBusy(false);
    }

    setMessages((previous) => [
      ...previous,
      {
        id: nextId.current++,
        role: 'assistant',
        text: outcome!.ok ? outcome!.reply || (isVi ? 'Đã xử lý.' : 'Done.') : failureText(outcome!.reason),
        patch: outcome!.ok ? outcome!.patch : undefined,
      },
    ]);
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-amber-950">
          <i className="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
          {isVi ? 'Trợ lý AI viết bài' : 'AI listing assistant'}
        </span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-amber-700 text-xs`}></i>
      </button>

      {open && (
        <div className="border-t border-amber-200 p-3 space-y-3">
          <p className="text-[11px] text-stone-600">
            {isVi ? 'AI chỉ đề xuất. Bạn chủ động bấm “Áp dụng vào form” để thay đổi nội dung.' : 'AI only suggests. Your draft changes only when you press “Apply to form”.'}
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {messages.map((message) => (
              <div key={message.id} className={`rounded-xl px-3 py-2 text-xs ${message.role === 'user' ? 'ml-8 bg-stone-900 text-white' : 'mr-8 bg-white border border-stone-200 text-stone-700'}`}>
                <ChatMarkdown text={message.text} />
                {message.patch && (
                  <button
                    type="button"
                    onClick={() => onApply(message.patch!)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[#A82323] text-white font-bold cursor-pointer"
                  >
                    {isVi ? 'Áp dụng vào form' : 'Apply to form'}
                  </button>
                )}
              </div>
            ))}
            {busy && <div className="text-xs text-stone-500"><i className="fa-solid fa-spinner fa-spin mr-2"></i>{isVi ? 'Đang viết…' : 'Writing…'}</div>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS[language].map((prompt) => (
              <button key={prompt} type="button" disabled={busy} onClick={() => void send(prompt)} className="px-2.5 py-1 rounded-full border border-amber-300 bg-white text-[11px] font-bold text-stone-700 cursor-pointer disabled:opacity-50">
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex gap-2">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={isVi ? 'Bạn muốn sửa hoặc dịch phần nào?' : 'What should I rewrite or translate?'} className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs" />
            <button type="submit" disabled={busy || !input.trim()} aria-label={isVi ? 'Gửi' : 'Send'} className="w-10 rounded-xl bg-amber-500 text-stone-950 cursor-pointer disabled:opacity-40">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
          <p className="text-[10px] text-stone-400">{calls.current}/12</p>
        </div>
      )}
    </div>
  );
};
