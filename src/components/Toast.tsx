import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-l-4 border-[#A82323]';
        let bgIcon = 'bg-red-50 text-[#A82323]';
        let iconName = 'fa-circle-check';

        if (toast.type === 'success') {
          borderClass = 'border-l-4 border-emerald-600';
          bgIcon = 'bg-emerald-50 text-emerald-600';
          iconName = 'fa-circle-check';
        } else if (toast.type === 'warning') {
          borderClass = 'border-l-4 border-amber-500';
          bgIcon = 'bg-amber-50 text-amber-600';
          iconName = 'fa-triangle-exclamation';
        } else if (toast.type === 'error') {
          borderClass = 'border-l-4 border-rose-600';
          bgIcon = 'bg-rose-50 text-rose-600';
          iconName = 'fa-circle-xmark';
        } else {
          borderClass = 'border-l-4 border-blue-600';
          bgIcon = 'bg-blue-50 text-blue-600';
          iconName = 'fa-circle-info';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3.5 flex items-start gap-3 border border-stone-200 ${borderClass} transition-all duration-300 transform translate-y-0`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgIcon}`}>
              <i className={`fa-solid ${iconName} text-sm`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-stone-900 leading-snug">{toast.title}</h4>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-stone-400 hover:text-stone-600 p-1 text-xs shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};
