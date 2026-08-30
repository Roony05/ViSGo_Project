/**
 * The list of threads a signed-in user actually has.
 *
 * Before this existed, the header's "Messages" button guessed: it picked the
 * user's first confirmed booking and opened that. For a traveller with one trip
 * the guess was usually right. For a host it was wrong in the way that matters
 * — a traveller may now write *before* reserving, to agree a date and a meeting
 * point, and that thread has no booking behind it at all. The host's dashboard
 * lists bookings, so the message landed in a conversation nobody could open.
 *
 * A thread here is therefore either side of two things: a real trip, or a
 * pre-booking enquiry. Both are addressed the same way — by conversation id —
 * so the picker hands back one `Booking`-shaped subject and the chat drawer
 * stays exactly as it was.
 */

import React from 'react';
import type { Booking, Conversation, Language, User } from '../types';
import { Avatar } from './Avatar';

export interface InboxThread {
  /** The chat subject. For an enquiry this is a synthetic `contact_…` row. */
  subject: Booking;
  conversation?: Conversation;
  /** True while the newest message is from the other side and is unread. */
  unread: boolean;
  isEnquiry: boolean;
}

interface Props {
  isOpen: boolean;
  threads: InboxThread[];
  activeUser: User | null;
  language: Language;
  onSelect: (subject: Booking) => void;
  onClose: () => void;
}

const when = (at: Date | null, isVi: boolean): string => {
  if (!at) return '';
  const sameDay = new Date().toDateString() === at.toDateString();
  return sameDay
    ? at.toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' });
};

export const ChatInboxModal: React.FC<Props> = ({
  isOpen,
  threads,
  activeUser,
  language,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';

  return (
    <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif font-bold text-sm">{isVi ? 'Hộp thư' : 'Messages'}</h3>
            <p className="text-[11px] text-stone-300">
              {isVi
                ? 'Trao đổi trước khi đặt chỗ và tin nhắn của từng chuyến đi.'
                : 'Pre-booking enquiries and every trip conversation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isVi ? 'Đóng' : 'Close'}
            className="w-8 h-8 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-stone-100">
          {threads.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-500">
              <i className="fa-regular fa-comments text-3xl text-stone-300 mb-3 block"></i>
              <p className="text-xs leading-relaxed">
                {isVi
                  ? 'Chưa có cuộc trò chuyện nào. Khách có thể mở trang tour rồi bấm “Nhắn host” để bắt đầu.'
                  : 'No conversations yet. A traveller starts one from a tour page with “Message host”.'}
              </p>
            </div>
          ) : (
            threads.map((thread) => {
              const iAmHost = activeUser?.id === thread.subject.hostId;
              const otherName = iAmHost ? thread.subject.customerName : thread.subject.hostName;
              return (
                <button
                  key={thread.subject.id}
                  type="button"
                  onClick={() => onSelect(thread.subject)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-stone-50 cursor-pointer"
                >
                  <Avatar
                    src={iAmHost ? '' : thread.subject.hostAvatar}
                    name={otherName}
                    className="w-10 h-10 rounded-full object-cover bg-stone-200 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 truncate">{otherName}</span>
                      {thread.isEnquiry && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black shrink-0">
                          {isVi ? 'TRƯỚC ĐẶT CHỖ' : 'ENQUIRY'}
                        </span>
                      )}
                      {thread.unread && <span className="w-2 h-2 rounded-full bg-[#A82323] shrink-0"></span>}
                    </span>
                    <span className="block text-[11px] text-stone-500 truncate">
                      {thread.conversation?.lastMessage
                        || (isVi ? 'Chưa có tin nhắn' : 'No messages yet')}
                    </span>
                    <span className="block text-[10px] text-stone-400 truncate">
                      {thread.subject.tourTitle} • {thread.subject.city}
                    </span>
                  </span>
                  <span className="text-[10px] text-stone-400 shrink-0">
                    {when(thread.conversation?.lastMessageAt ?? null, isVi)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
