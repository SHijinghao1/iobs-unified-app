import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useStore } from '../store';

// 浮动提示容器：统一承载成功、警告和错误提示。

// Stable fallback — must not be created inside the selector or render
const EMPTY_TOASTS: never[] = [];

export const ToastContainer: React.FC = () => {
  const toasts = useStore((state) => state.toasts ?? EMPTY_TOASTS);
  const removeToast = useStore((state) => state.removeToast);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-400" size={20} />;
      case 'error':
        return <XCircle className="text-red-400" size={20} />;
      default:
        return <Info className="text-blue-400" size={20} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700';
      case 'error':
        return 'bg-red-900/90 border-red-700';
      default:
        return 'bg-blue-900/90 border-blue-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm ${getBgColor(toast.type)} animate-slide-in`}
        >
          {getIcon(toast.type)}
          <span className="text-white text-sm">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
