import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tour, User, Booking, Language } from '../types';
import { ViSGoRagEngine, RagActionItem } from '../utils/ragEngine';
import { ChatMarkdown } from './ChatMarkdown';
import { fetchBackendStatus } from '../utils/aiClient';
import { sounds } from '../utils/audio';

interface AIAssistantPageProps {
  language: Language;
  tours: Tour[];
  hosts: User[];
  bookings: Booking[];
  activeUser: User | null;
  onSelectTour: (tour: Tour) => void;
  onSelectCity?: (city: string) => void;
  onBack: () => void;
}

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionItems?: RagActionItem[];
}

/** Which engine is actually answering. Shown in the rail, honestly. */
type Engine = 'checking' | 'gemini' | 'offline';

/**
 * The thread survives navigating away and back.
 *
 * This is a route now, not an overlay, so leaving it unmounts the component and
 * used to throw the conversation away — a back-and-forth to a tour card cost
 * you everything you had asked. Session storage is the right lifetime: it
 * outlives the route, and it is gone when the tab closes.
 */
const DRAFT_KEY = 'visgo_ai_thread_v1';

function loadThread(): ChatItem[] {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatItem[]) : [];
  } catch {
    // Private browsing, or a shape written by an older build. Start clean.
    return [];
  }
}

function saveThread(items: ChatItem[]): void {
  try {
    // `actionItems` carry a whole Tour object in `payload`; that is fine to
    // rebuild from, and keeps the chips working after a reload.
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  } catch {
    /* Over quota or blocked — the thread just will not survive a reload. */
  }
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  language,
  tours,
  hosts,
  bookings,
  activeUser,
  onSelectTour,
  onSelectCity,
  onBack,
}) => {
  const isVi = language === 'vi';
  const [messages, setMessages] = useState<ChatItem[]>(loadThread);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState<Engine>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Starters, grouped.
   *
   * The overlay had one flat row of four; a full page has room to say what the
   * assistant is actually for, which is a better prompt than four examples that
   * all look like the same kind of question.
   */
  const starterGroups = useMemo(
    () =>
      isVi
        ? [
            {
              title: 'Tìm trải nghiệm',
              icon: 'fa-compass',
              prompts: [
                'Tour ẩm thực ngõ hẻm Hà Nội ngon nhất',
                'Tour xe máy Vespa đêm ở Sài Gòn',
                'Gợi ý lịch trình một ngày ở Hội An',
              ],
            },
            {
              title: 'Host bản địa',
              icon: 'fa-user-shield',
              prompts: ['Host nào nói được tiếng Anh?', 'Host được xác minh thế nào?'],
            },
            {
              title: 'Đặt chỗ & thanh toán',
              icon: 'fa-shield-halved',
              prompts: ['Đặt tour trên ViS-Go thì thanh toán thế nào?', 'Muốn hủy chuyến thì làm sao?'],
            },
          ]
        : [
            {
              title: 'Find an experience',
              icon: 'fa-compass',
              prompts: [
                'Best hidden alleyway food tours in Hanoi',
                'Vintage Vespa night tours in Saigon',
                'Plan me a day in Hoi An',
              ],
            },
            {
              title: 'Local hosts',
              icon: 'fa-user-shield',
              prompts: ['Which hosts speak English?', 'How is a host verified?'],
            },
            {
              title: 'Booking & payment',
              icon: 'fa-shield-halved',
              prompts: ['How does paying for a ViS-Go tour work?', 'How do I cancel a booking?'],
            },
          ],
    [isVi],
  );

  /** Flattened for the mobile chip strip, which has no room for headings. */
  const flatStarters = useMemo(
    () => starterGroups.flatMap((g) => g.prompts).slice(0, 4),
    [starterGroups],
  );

  // Greeting. `messages.length` is a dependency so clearing the thread brings
  // it back rather than leaving an empty page.
  useEffect(() => {
    if (messages.length > 0) return;
    const greeting = isVi
      ? `Xin chào ${activeUser ? activeUser.name : 'bạn'}!\nTôi là **ViS-AI** — trợ lý của ViS-Go. Tôi trả lời dựa trên các tour đang mở, host bản địa, giá và chính sách đặt chỗ.\n\nBạn muốn khám phá thành phố nào, hay cần tư vấn trải nghiệm gì hôm nay?`
      : `Hello ${activeUser ? activeUser.name : 'there'}!\nI'm **ViS-AI** — the ViS-Go assistant. I answer from the tours that are live, the local hosts, prices and booking policy.\n\nWhich destination or experience would you like to explore today?`;

    setMessages([
      {
        id: 'msg-init',
        role: 'assistant',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [isVi, activeUser, messages.length]);

  useEffect(() => {
    saveThread(messages);
  }, [messages]);

  /**
   * Which engine is behind the assistant.
   *
   * The header used to show a green "online" dot unconditionally, which was a
   * lie on a build with no Gemini route configured: every answer came from the
   * offline engine and nothing on screen said so.
   */
  useEffect(() => {
    let alive = true;
    fetchBackendStatus()
      .then((status) => {
        if (alive) setEngine(status.gemini ? 'gemini' : 'offline');
      })
      .catch(() => {
        if (alive) setEngine('offline');
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus the composer, but only on a pointer device: autofocus on a phone
  // throws the on-screen keyboard up before the greeting can be read.
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputValue).trim();
      if (!text || isLoading) return;

      sounds.playMessageSent();
      const userMsg: ChatItem = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Captured before the state update so the model sees the turns that came
      // before this one, not this one twice.
      const history = messages.map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);

      try {
        const response = await ViSGoRagEngine.queryRag(
          text,
          tours,
          hosts,
          bookings,
          activeUser,
          history,
          language,
        );

        sounds.playNotificationPing();
        // The badge now follows what actually happened. Until the first
        // question it reflects configuration, which is the best guess
        // available; from here on it reflects evidence.
        if (response.engine) setEngine(response.engine);
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: response.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionItems: response.actionItems,
          },
        ]);
      } catch (e) {
        console.error('Chat error:', e);
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: isVi
              ? 'Rất tiếc, đã có gián đoạn kết nối. Bạn thử lại hoặc chọn một gợi ý bên dưới nhé.'
              : 'Sorry, the connection dropped. Try again, or pick one of the suggestions below.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, messages, tours, hosts, bookings, activeUser, language, isVi],
  );

  const handleActionClick = (action: RagActionItem) => {
    if (action.type === 'tour' && action.payload) {
      onSelectTour(action.payload as Tour);
    } else if (action.type === 'city' && action.payload && onSelectCity) {
      onSelectCity(action.payload as string);
    }
  };

  const handleClearHistory = () => {
    sounds.playTap();
    setMessages([]);
  };

  const engineDot =
    engine === 'gemini' ? 'bg-emerald-500' : engine === 'offline' ? 'bg-amber-500' : 'bg-stone-400';

  const engineLabel =
    engine === 'gemini'
      ? isVi ? 'Gemini · trực tuyến' : 'Gemini · online'
      : engine === 'offline'
        ? isVi ? 'Chế độ ngoại tuyến' : 'Offline mode'
        : isVi ? 'Đang kiểm tra…' : 'Checking…';

  const engineHint =
    engine === 'gemini'
      ? isVi
        ? 'Câu trả lời do Gemini tổng hợp, rồi được đối chiếu lại với danh mục tour trước khi hiển thị.'
        : 'Answers are synthesised by Gemini, then checked back against the tour catalogue before they are shown.'
      : engine === 'offline'
        ? isVi
          // Deliberately does not say "chưa cấu hình". It said exactly that
          // while Gemini *was* configured and App Check was the thing
          // refusing every call — a wrong diagnosis printed with confidence
          // sends someone to re-check the setting that was already right.
          ? 'ViS-AI đang trả lời trực tiếp từ danh mục tour trên máy — ngắn gọn hơn, nhưng không thể sai số liệu. Nếu bạn đã bật Gemini, mở Console trình duyệt (F12) để xem tuyến nào bị từ chối.'
          : 'ViS-AI is answering straight from the on-device tour catalogue — terser, but it cannot get a figure wrong. If Gemini is meant to be on, open the browser console (F12) to see which route was refused.'
        : isVi
          ? 'Đang hỏi máy chủ xem tuyến Gemini có sẵn không.'
          : 'Asking the server whether the Gemini route is available.';

  /** Only the greeting is on screen — room for the starters. */
  const isFresh = messages.length <= 1;

  const starterButton = (p: string, key: React.Key) => (
    <button
      key={key}
      onClick={() => handleSendMessage(p)}
      disabled={isLoading}
      className="w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-xs leading-snug text-stone-700 shadow-2xs transition-colors hover:border-[#D4AF37]/70 hover:bg-amber-50/60 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {p}
    </button>
  );

  return (
    /*
      A route, not an overlay.

      The height is pinned to the viewport minus the sticky header (h-18 =
      4.5rem) so the composer sits at the bottom edge and only the thread
      scrolls. `dvh` rather than `vh`: on a phone the dynamic unit shrinks as
      the browser chrome and the on-screen keyboard appear, which is exactly
      when a `vh`-sized composer slides out of reach.
    */
    <div className="flex h-[calc(100dvh-4.5rem)] w-full overflow-hidden bg-stone-50">
      {/* --- Side rail: desktop only ------------------------------------ */}
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white px-4 py-5 lg:flex xl:w-80">
        <button
          onClick={() => {
            sounds.playTap();
            onBack();
          }}
          className="mb-5 flex min-h-9 cursor-pointer items-center gap-2 self-start rounded-lg px-2.5 py-2 text-xs font-bold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <i className="fa-solid fa-arrow-left text-[11px]"></i>
          <span>{isVi ? 'Về khám phá tour' : 'Back to tours'}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#D4AF37]/40 bg-[#A82323] text-[#D4AF37] shadow-sm">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold leading-tight text-stone-900">ViS-AI</h1>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
              <span className={`h-2 w-2 rounded-full ${engineDot}`}></span>
              {engineLabel}
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-xl bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-500">
          {engineHint}
        </p>

        <div className="mt-6 space-y-5">
          {starterGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                <i className={`fa-solid ${group.icon} text-[#D4AF37]`}></i>
                {group.title}
              </h2>
              <div className="space-y-1.5">{group.prompts.map((p, i) => starterButton(p, i))}</div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={handleClearHistory}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            <i className="fa-solid fa-rotate-left text-[11px]"></i>
            {isVi ? 'Cuộc trò chuyện mới' : 'New conversation'}
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-stone-400">
            {isVi
              ? 'ViS-AI chỉ trả lời trong phạm vi dữ liệu ViS-Go.'
              : 'ViS-AI only answers within the ViS-Go catalogue.'}
          </p>
        </div>
      </aside>

      {/* --- Thread ------------------------------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact bar, phones and tablets only — the rail carries all of this
            on a wide screen, so repeating it there would be a second title. */}
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-2.5 lg:hidden">
          <button
            onClick={() => {
              sounds.playTap();
              onBack();
            }}
            className="-ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label={isVi ? 'Quay lại' : 'Back'}
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>

          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#D4AF37]/40 bg-[#A82323] text-sm text-[#D4AF37]">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-extrabold leading-tight text-stone-900">ViS-AI</h1>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500" title={engineHint}>
              <span className={`h-1.5 w-1.5 rounded-full ${engineDot}`}></span>
              {engineLabel}
            </p>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800"
            aria-label={isVi ? 'Cuộc trò chuyện mới' : 'New conversation'}
            title={isVi ? 'Cuộc trò chuyện mới' : 'New conversation'}
          >
            <i className="fa-solid fa-rotate-left text-sm"></i>
          </button>
        </div>

        {/* Messages. Full-bleed panel, narrow reading measure: a 1600px line of
            prose is unreadable, so the column is capped and centred. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-7">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs sm:max-w-[80%] sm:text-sm ${
                    m.role === 'user'
                      ? 'rounded-tr-xs bg-[#A82323] text-white'
                      : 'rounded-tl-xs border border-stone-200/90 bg-white text-stone-900'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-[10px] opacity-80">
                    <span className="font-bold uppercase tracking-wider">
                      {m.role === 'user' ? activeUser?.name || (isVi ? 'Bạn' : 'You') : 'ViS-AI'}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>

                  {/* Replies arrive as Markdown. This used to print the raw
                      string, so every **bold** span showed as literal asterisks. */}
                  <ChatMarkdown text={m.text} className="font-sans" />

                  {m.actionItems && m.actionItems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                      {m.actionItems.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-amber-50 px-3 py-1.5 text-xs font-bold text-[#8C6D1F] shadow-2xs transition-all hover:scale-102 hover:bg-amber-100"
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

            {/* Starters, inline. On a wide screen the rail already has them, so
                this block is for the layouts where the rail is not rendered. */}
            {isFresh && (
              <div className="grid gap-2 pt-2 sm:grid-cols-2 lg:hidden">
                {flatStarters.map((p, i) => starterButton(p, i))}
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-2 text-xs text-stone-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-stone-200 text-xs text-stone-600">
                  <i className="fa-solid fa-wand-magic-sparkles animate-spin"></i>
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-stone-200 bg-white px-4 py-3 shadow-2xs">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A82323]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D4AF37] [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-600 [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-xs font-medium text-stone-600">
                    {isVi ? 'Đang tra cứu dữ liệu tour…' : 'Searching live tours…'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div
          className="shrink-0 border-t border-stone-200 bg-white"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 py-3 sm:px-6 sm:py-4"
          >
            {/*
              A textarea, not an input.

              Enter still sends, so nothing about the one-line case changes —
              but a long question no longer scrolls sideways inside a 40px box
              with its own beginning out of sight.
            */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isVi
                  ? 'Hỏi về tour, host bản địa, giá vé, cách đặt chỗ…'
                  : 'Ask about tours, local hosts, prices, how booking works…'
              }
              disabled={isLoading}
              className="max-h-40 min-h-[2.75rem] w-full flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-snug text-stone-900 outline-hidden transition-all hover:bg-stone-100/80 focus:border-[#A82323] focus:bg-white focus:ring-1 focus:ring-[#A82323] sm:text-sm"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              /* The word is hidden below `sm`, which leaves an icon-only button
                 with nothing a screen reader can announce. The label has to be
                 stated separately, not inferred from the glyph. */
              aria-label={isVi ? 'Gửi' : 'Send'}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#A82323] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#8C1818] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 sm:text-sm"
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
