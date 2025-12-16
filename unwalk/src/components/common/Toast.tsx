import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

interface ToastWithClose extends ToastProps {
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastWithClose) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: '✅',
    info: '🎯',
    warning: '⚠️',
    error: '❌',
  };

  const colors = {
    success: 'from-green-500 to-emerald-600',
    info: 'from-blue-500 to-purple-600',
    warning: 'from-amber-500 to-orange-600',
    error: 'from-red-500 to-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] max-w-sm w-full mx-4"
    >
      <div className={`bg-gradient-to-r ${colors[type]} rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-white/20`}>
        <div className="text-2xl flex-shrink-0">{icons[type]}</div>
        <p className="text-white font-bold text-sm flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string } & ToastProps>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </AnimatePresence>
  );
}
