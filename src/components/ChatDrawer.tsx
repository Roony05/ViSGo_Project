import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Language, User } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';

interface ChatDrawerProps {
  isOpen: boolean;
  activeUser: User | null;
  language: Language;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  activeUser,
  language,
  onClose,
}) => {
  const t = translations[language];

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      senderId: 'user_host_1',
      senderName: 'Tommy (Local Buddy)',
      senderRole: 'host',
      recipientId: activeUser?.id || 'customer',
      text: language === 'vi'
        ? 'Chào bạn! Mình là Tommy, người bạn đồng hành của bạn tại Hà Nội. Rất vui được đồng hành cùng bạn hôm nay!'
        : 'Xin chào! I am Tommy, your local buddy in Hanoi. Looking forward to showing you the best hidden spots!',
      timestamp: '17:30',
      read: true,
    },
    {
      id: 'msg_2',
      senderId: 'user_host_1',
      senderName: 'Tommy (Local Buddy)',
      senderRole: 'host',
      recipientId: activeUser?.id || 'customer',
      text: language === 'vi'
        ? 'Mình sẽ đợi bạn ở sảnh Nhà Hát Lớn, mình lái chiếc Vespa cổ màu đỏ và đội nón bảo hiểm vàng nhé.'
        : 'I will be waiting by the front steps of Hanoi Opera House on a classic vintage red Vespa with a yellow helmet.',
      timestamp: '17:32',
      read: true,
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: activeUser?.id || 'customer',
      senderName: activeUser?.name || 'You',
      senderRole: activeUser?.role || 'customer',
      recipientId: 'user_host_1',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    sounds.playNotificationPing();

    // Simulated Host Auto Reply
    setTimeout(() => {
      let replyText = language === 'vi'
        ? 'Dạ tuyệt vời ạ! Mình đã sẵn sàng rồi, hẹn gặp bạn lát nữa nhé!'
        : 'Awesome! I am all set and ready. See you very shortly!';

      if (text.toLowerCase().includes('arrived') || text.toLowerCase().includes('đã có mặt') || text.toLowerCase().includes('đến rồi')) {
        replyText = language === 'vi'
          ? 'Tuyệt vời, mình đang đứng ngay cạnh bậc thang chính Nhà Hát Lớn, vẫy tay chào bạn nè!'
          : 'Great, I am right at the main front steps of the Opera House waving at you!';
      } else if (text.toLowerCase().includes('15') || text.toLowerCase().includes('trễ') || text.toLowerCase().includes('muộn') || text.toLowerCase().includes('delay')) {
        replyText = language === 'vi'
          ? 'Không sao bạn cứ thong thả nhé, an toàn là trên hết. Mình chờ bạn được!'
          : 'No problem at all! Take your time, safety first. I will wait for you!';
      }

      const hostReply: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        senderId: 'user_host_1',
        senderName: 'Tommy (Local Buddy)',
        senderRole: 'host',
        recipientId: activeUser?.id || 'customer',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      };

      setMessages((prev) => [...prev, hostReply]);
      sounds.playNotificationPing();
    }, 1100);
  };

  const quickReplies = [
    t.quickReply1,
    t.quickReply2,
    t.quickReply3,
    t.quickReply4,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-stone-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-[#A82323] to-[#751111] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                alt="Host Buddy"
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm">Tommy (Local Buddy)</h3>
                <i className="fa-solid fa-circle-check text-amber-300 text-xs"></i>
              </div>
              <p className="text-[11px] text-amber-200/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{language === 'vi' ? 'Đang trực tuyến • Phản hồi 100%' : 'Online Now • 100% Response'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Message Thread */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-stone-50/50">
          <div className="text-center my-2">
            <span className="px-3 py-1 bg-stone-200 text-stone-600 rounded-full text-[10px] font-semibold">
              Today • ViS-Go Protected Chat
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderRole === (activeUser?.role || 'customer');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-[#A82323] text-white rounded-br-none'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-stone-100/90 border-t border-stone-200 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(reply)}
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
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t.chatPlaceholder}
            className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-xl bg-[#A82323] hover:bg-[#8C1818] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>

      </div>
    </div>
  );
};
