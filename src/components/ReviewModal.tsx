import React, { useState } from 'react';
import { Tour, Language, User, TourReview } from '../types';
import { translations } from '../i18n/translations';
import { sounds } from '../utils/audio';
import { newId } from '../utils/ids';

interface ReviewModalProps {
  isOpen: boolean;
  tour: Tour | null;
  activeUser: User | null;
  language: Language;
  onClose: () => void;
  onSubmitReview: (review: TourReview) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  tour,
  activeUser,
  language,
  onClose,
  onSubmitReview,
}) => {
  const t = translations[language];

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Friendly Host', 'Great Food']);

  // No signed-out path. `activeUser` used to fall back to a 'guest' id below,
  // which produced a review the security rules refuse — written to local state,
  // announced as sent, and gone on the next reload. App.tsx now sends visitors
  // to sign in before this opens; this is the second lock on the same door.
  if (!isOpen || !tour || !activeUser) return null;

  const availableTags = [
    'Friendly Host',
    'Safe Driver',
    'Great Food',
    'Authentic Secrets',
    'Fluent English',
    'Photographer',
    'Must Do in Vietnam',
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newReview: TourReview = {
      id: newId('rev'),
      tourId: tour.id,
      userId: activeUser.id,
      userName: activeUser.name,
      userAvatar: activeUser.avatar,
      userCountry: 'Traveler',
      rating,
      date: new Date().toISOString().split('T')[0],
      comment,
      tags: selectedTags,
    };

    onSubmitReview(newReview);
    sounds.playSuccessChime();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A82323] to-[#751111] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <i className="fa-regular fa-star text-lg"></i>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg">{t.reviewModalTitle} {tour.hostName}</h3>
              <p className="text-xs text-stone-200/90">{tour.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Star Picker */}
          <div className="text-center space-y-1">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t.rateYourBuddy}
            </label>
            <div className="flex justify-center gap-2 text-2xl text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="hover:scale-120 transition-transform cursor-pointer focus:outline-hidden"
                >
                  <i className={star <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star text-stone-300'}></i>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              {language === 'vi' ? 'Chọn thẻ nổi bật' : 'Highlight Tags'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag, idx) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                        : 'bg-stone-100 text-stone-600 border border-transparent hover:bg-stone-200'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {language === 'vi' ? 'Nội dung đánh giá của bạn' : 'Your Review'}
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.reviewCommentPlaceholder}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#A82323]"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#A82323] hover:bg-[#8C1818] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            {t.submitReview}
          </button>
        </form>

      </div>
    </div>
  );
};
