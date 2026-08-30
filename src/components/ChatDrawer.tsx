import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Booking, ChatMessage, Conversation, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { Avatar } from './Avatar';
import { CallModal } from './CallModal';
import { CALL_ENABLED } from '../config/env';
import { checkAllowance } from '../utils/callBudget';
import {
  MAX_MESSAGE_LENGTH,
  loadOlderMessages,
  markThreadRead,
  openConversation,
  sendMessage,
  subscribeToThread,
} from '../utils/chatDb';

interface ChatDrawerProps {
  isOpen: boolean;
  activeUser: User | null;
  /**
   * The trip this conversation belongs to. Everything about the other party —
   * who they are, their photo, where you are meeting — is read from here, and
   * the booking id doubles as the conversation id in Firestore.
   *
   * It used to be hard-coded: every user, on every trip, in every city, opened
   * a chat with "Tommy (Local Buddy)" waiting at the Hanoi Opera House, and the
   * replies were generated on the device. Nothing was ever delivered or stored.
   */
  booking: Booking | null;
  language: Language;
  onClose: () => void;
  /** Opens the existing in-app call immediately when the user chose “Call host”. */
  startWithCall?: boolean;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  activeUser,
  booking,
  language,
  onClose,
  startWithCall = false,
}) => {
  const t = translations[language];
  const isVi = language === 'vi';

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  /**
   * Everything this session has seen, keyed by message id.
   *
   * Accumulating rather than replacing, because the live listener watches a
   * sliding window of the newest 30. Two earlier attempts got this wrong:
   * replacing the whole array wiped history the reader had scrolled back to,
   * and keeping "loaded history" and "live window" as two separate lists lost
   * the message in between — send a 46th and the 16th belongs to neither list
   * any more, so it silently disappeared from the middle of the thread.
   *
   * The cost of accumulating is that a message an admin deletes stays on screen
   * until the drawer is reopened: Firestore reports a document leaving the
   * window and a document being deleted the same way, and of the two mistakes,
   * briefly showing a deleted message beats permanently hiding a live one.
   */
  const [byId, setById] = useState<Record<string, ChatMessage>>({});

  const messages = React.useMemo(() => {
    const at = (m: ChatMessage): number => (m.createdAt ? m.createdAt.getTime() : Number.MAX_SAFE_INTEGER);
    // A message still in the local write queue has no server time yet, so it
    // sorts last — which is where the sender expects to see it.
    return (Object.values(byId) as ChatMessage[]).sort((a, b) => at(a) - at(b));
  }, [byId]);

  const absorb = useCallback((incoming: ChatMessage[]) => {
    setById((prev) => {
      const next = { ...prev };
      for (const m of incoming) next[m.id] = m;
      return next;
    });
  }, []);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'failed'>('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sendError, setSendError] = useState('');
  /*
    The call, when there is one.

    It lives here rather than in App because the two people who may call
    each other are exactly the two people in this thread, and the booking
    that defines them is already on hand. Nothing about a call is stored —
    see callBudget.ts — so there is no state to keep once it closes.
  */
  const [callOpen, setCallOpen] = useState(false);

  useEffect(() => {
    if (isOpen && startWithCall && booking && activeUser) setCallOpen(true);
  }, [isOpen, startWithCall, booking, activeUser]);

  /**
   * Who you are talking to. A traveller sees their host and a host sees their
   * traveller, so this cannot be read off one fixed field.
   */
  const iAmHost = activeUser?.id === booking?.hostId;
  const iAmParticipant =
    !!activeUser && !!booking && (activeUser.id === booking.customerId || activeUser.id === booking.hostId);

  // An admin is not one of the two, so "the other person" is meaningless to
  // them — they are looking at a conversation between two people, and the
  // header should say so rather than pick one side at random.
  const otherName = !booking
    ? ''
    : iAmParticipant
      ? (iAmHost ? booking.customerName : booking.hostName)
      : `${booking.customerName} ↔ ${booking.hostName}`;
  const otherAvatar = booking && iAmParticipant && !iAmHost ? booking.hostAvatar : '';

  /**
   * An admin can read a thread to settle a dispute but is not part of it, and
   * the security rules refuse a message whose sender is not a participant. So
   * the composer is hidden rather than shown and then rejected.
   */
  const canWrite = iAmParticipant;

  /*
    How much free calling is left, re-read whenever a call closes.

    Cheap enough to do on render — it is three integers in localStorage —
    and reading it here rather than inside the modal is what lets the
    button explain itself before anyone taps it.
  */
  const callAllowance = React.useMemo(() => checkAllowance(), [callOpen]);

  /* Open the conversation, then keep the newest page live. */
  useEffect(() => {
    if (!isOpen || !booking || !activeUser) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    setStatus('loading');
    setById({});

    (async () => {
      try {
        const convo = await openConversation(booking, canWrite);
        if (cancelled) return;
        setConversation(convo);

        const unsub = await subscribeToThread(
          booking.id,
          (update) => {
            if (cancelled) return;
            absorb(update.messages);
            // Only the first page decides this; later snapshots are the same
            // window sliding, and history already pulled stays pulled.
            setHasMore((prev) => prev || update.hasMore);
            setStatus('ready');
          },
          (err) => {
            if (cancelled) return;
            // Denial here means the rules did not recognise this account as a
            // participant — worth saying plainly rather than showing an empty
            // thread that looks like nobody has written anything.
            const denied = (err as { code?: string })?.code === 'permission-denied';
            setStatus(denied ? 'denied' : 'failed');
          },
        );

        // Closing the drawer before this resolved used to leave the listener
        // attached: cleanup had already run and found `unsubscribe` still null.
        // Every open/close cycle then leaked a live query, and each one keeps
        // charging a read per message that arrives.
        if (cancelled) {
          unsub();
          return;
        }
        unsubscribe = unsub;

        if (canWrite) void markThreadRead(booking.id, activeUser.id, convo);
      } catch (err) {
        if (cancelled) return;
        const denied = (err as { code?: string })?.code === 'permission-denied';
        setStatus(denied ? 'denied' : 'failed');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isOpen, booking, activeUser, canWrite, absorb]);

  useEffect(() => {
    if (isOpen && status === 'ready') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, status]);

  const handleLoadOlder = useCallback(async () => {
    if (!booking || loadingOlder) return;
    setLoadingOlder(true);
    const page = await loadOlderMessages(booking.id, messages[0]);
    setLoadingOlder(false);
    if (page.messages.length === 0) {
      setHasMore(false);
      return;
    }
    absorb(page.messages);
    setHasMore(page.hasMore);
  }, [booking, messages, loadingOlder, absorb]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !booking || !activeUser || !canWrite) return;

    setSendError('');
    // Cleared immediately: Firestore renders the message from its local write
    // queue straight away, so the box emptying is honest even offline.
    setInputMessage('');

    const result = await sendMessage(booking, activeUser, text);
    if (result === 'sent') {
      sounds.playNotificationPing();
      return;
    }

    setInputMessage(text);
    setSendError(
      result === 'too-long'
        ? isVi
          ? `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).`
          : `That message is too long (max ${MAX_MESSAGE_LENGTH} characters).`
        : result === 'not-allowed'
          ? isVi
            ? 'Bạn không thuộc cuộc trò chuyện này.'
            : 'You are not part of this conversation.'
          : isVi
            ? 'Chưa gửi được. Kiểm tra kết nối rồi thử lại.'
            : 'Could not send. Check your connection and try again.',
    );
  };

  /**
   * Opens the call, and says so in the thread.
   *
   * The message is the whole signalling mechanism. Both sides derive the same
   * room name from the booking id, so the only thing missing is knowing that
   * the other person is waiting in it — and the thread they already have open
   * is a better place to learn that than any notification system, because it
   * needs nothing stored and nothing new to go wrong.
   */
  const handleStartCall = async () => {
    if (!booking || !activeUser || !canWrite) return;
    sounds.playTap();
    setCallOpen(true);
    await sendMessage(
      booking,
      activeUser,
      isVi
        ? '📞 Mình vừa mở cuộc gọi — bạn bấm nút gọi ở đầu khung chat để vào cùng nhé.'
        : '📞 I have started a call — tap the call button at the top of this chat to join.',
    );
  };

  const quickReplies = [t.quickReply1, t.quickReply2, t.quickReply3, t.quickReply4];

  const clock = (msg: ChatMessage): string =>
    msg.createdAt
      ? msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : isVi
        ? 'đang gửi…'
        : 'sending…';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-stone-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">

        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-[#A82323] to-[#751111] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {/* <Avatar> draws the initials itself when there is no picture,
                  which is also the case here when the other party is the host
                  and the booking carries no avatar for them. */}
              <Avatar
                src={otherAvatar}
                name={otherName}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 bg-stone-200"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm truncate">
                  {otherName || (isVi ? 'Trò chuyện' : 'Messages')}
                </h3>
                <i className="fa-solid fa-circle-check text-amber-300 text-xs shrink-0"></i>
              </div>
              <p className="text-[11px] text-amber-200/90 truncate">
                {booking
                  ? isVi
                    ? `${booking.id.startsWith('contact_') ? 'Trao đổi trước khi đặt' : `Chuyến ${booking.id}`} • ${booking.city}`
                    : `${booking.id.startsWith('contact_') ? 'Pre-booking conversation' : `Trip ${booking.id}`} • ${booking.city}`
                  : isVi
                    ? 'Chưa có chuyến đi nào'
                    : 'No trip yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Calling is offered only to the two people on the trip. An admin
                reading the thread to settle a dispute is not one of them, and
                the allowance check runs before the button is drawn so a spent
                budget reads as a disabled button with a reason rather than a
                modal that opens and immediately refuses. */}
            {CALL_ENABLED && canWrite && booking && (
              <button
                onClick={handleStartCall}
                disabled={!callAllowance.allowed}
                aria-label={isVi ? 'Gọi miễn phí' : 'Free call'}
                title={
                  callAllowance.allowed
                    ? isVi
                      ? `Gọi miễn phí — tối đa ${callAllowance.minutesThisCall} phút mỗi cuộc`
                      : `Free call — up to ${callAllowance.minutesThisCall} minutes`
                    : callAllowance.reason === 'DAILY_CAP'
                      ? isVi
                        ? 'Hôm nay đã hết lượt gọi miễn phí.'
                        : 'Today’s free calls are used up.'
                      : isVi
                        ? 'Tháng này đã hết phút gọi miễn phí.'
                        : 'This month’s free minutes are used up.'
                }
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-phone text-sm"></i>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label={isVi ? 'Đóng' : 'Close'}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-stone-50/50">
          {!booking && (
            <div className="text-center py-16 px-6">
              <i className="fa-regular fa-comments text-stone-300 text-3xl mb-3"></i>
              <p className="text-sm font-bold text-stone-700">
                {isVi ? 'Chưa có cuộc trò chuyện nào' : 'No conversation yet'}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {isVi
                  ? 'Đặt một tour trước — kênh chat sẽ mở với chính người bạn bản địa của chuyến đi đó.'
                  : 'Book a tour first — the chat opens with the local buddy for that trip.'}
              </p>
            </div>
          )}

          {booking && status === 'loading' && (
            <div className="text-center py-16 text-stone-400">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl"></i>
              <p className="text-xs mt-3">{isVi ? 'Đang tải tin nhắn…' : 'Loading messages…'}</p>
            </div>
          )}

          {booking && (status === 'denied' || status === 'failed') && (
            <div className="text-center py-16 px-6">
              <i className="fa-solid fa-triangle-exclamation text-amber-400 text-2xl mb-3"></i>
              <p className="text-sm font-bold text-stone-700">
                {status === 'denied'
                  ? isVi
                    ? 'Bạn không có quyền xem cuộc trò chuyện này'
                    : 'You cannot open this conversation'
                  : isVi
                    ? 'Không tải được tin nhắn'
                    : 'Messages could not be loaded'}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {status === 'denied'
                  ? isVi
                    ? 'Chỉ khách và host của chuyến đi — cùng quản trị viên — mới đọc được.'
                    : 'Only the traveller, the host and an administrator can read it.'
                  : isVi
                    ? 'Kiểm tra kết nối mạng rồi mở lại.'
                    : 'Check your connection and reopen.'}
              </p>
            </div>
          )}

          {booking && status === 'ready' && (
            <>
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadOlder}
                    disabled={loadingOlder}
                    className="px-3 py-1 bg-white border border-stone-300 text-stone-600 rounded-full text-[10px] font-semibold hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {loadingOlder
                      ? isVi ? 'Đang tải…' : 'Loading…'
                      : isVi ? 'Xem tin nhắn cũ hơn' : 'Load older messages'}
                  </button>
                </div>
              )}

              <div className="text-center my-2">
                <span className="px-3 py-1 bg-stone-200 text-stone-600 rounded-full text-[10px] font-semibold">
                  {booking.id.startsWith('contact_')
                    ? (isVi ? 'Trao đổi lịch trình trước khi đặt chỗ' : 'Discuss the itinerary before reserving')
                    : booking.bookingDate} • ViS-Go Chat
                </span>
              </div>

              {messages.length === 0 && (
                <p className="text-center text-xs text-stone-400 py-10">
                  {canWrite
                    ? isVi
                      ? 'Chưa có tin nhắn nào. Gửi lời chào đầu tiên nhé!'
                      : 'No messages yet. Say hello!'
                    : isVi
                      ? 'Hai bên chưa trao đổi tin nhắn nào cho chuyến này.'
                      : 'Nobody has written anything on this trip yet.'}
                </p>
              )}

              {messages.map((msg) => {
                // Compared by id, not by role: an admin reading the thread is
                // neither party, and both of them must still appear on their
                // own side of the conversation.
                const isMe = !!activeUser && msg.senderId === activeUser.id;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-[9px] text-stone-400 mb-0.5 px-1">{msg.senderName}</span>
                    )}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-[#A82323] text-white rounded-br-none'
                          : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                      } ${msg.pending ? 'opacity-70' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    <span className="text-[9px] text-stone-400 mt-1 px-1">{clock(msg)}</span>
                  </div>
                );
              })}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {sendError && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-[11px] text-red-700">
            {sendError}
          </div>
        )}

        {/*
          An admin opens this to settle a dispute, so they read but do not
          write — the rules refuse a message from a non-participant, and a send
          box that always fails is worse than no send box.
        */}
        {booking && status === 'ready' && !canWrite && (
          <div className="p-3 bg-stone-100 border-t border-stone-200 text-[11px] text-stone-600 text-center">
            <i className="fa-solid fa-eye mr-1.5"></i>
            {isVi ? 'Chế độ chỉ đọc — bạn không thuộc cuộc trò chuyện này.' : 'Read-only — you are not part of this conversation.'}
          </div>
        )}

        {booking && status === 'ready' && canWrite && (
          <>
            {/* Quick Suggestion Chips */}
            <div className="p-2.5 bg-stone-100/90 border-t border-stone-200 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => void handleSendMessage(reply)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-stone-700 hover:text-[#A82323] border border-stone-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.chatPlaceholder}
                className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                aria-label={isVi ? 'Gửi' : 'Send'}
                className="w-10 h-10 rounded-xl bg-[#A82323] hover:bg-[#8C1818] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
              </button>
            </form>
          </>
        )}

      </div>

      {callOpen && booking && activeUser && (
        <CallModal
          booking={booking}
          activeUser={activeUser}
          language={language}
          onClose={() => setCallOpen(false)}
        />
      )}
    </div>
  );
};
