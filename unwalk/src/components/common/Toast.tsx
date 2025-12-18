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
    success: '✓',
    info: '…',
    warning: '!',
    error: '×',
  };

  const colors = {
    success: 'bg-emerald-600/90',
    info: 'bg-slate-900/90',
    warning: 'bg-amber-600/90',
    error: 'bg-rose-600/90',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      className="fixed left-0 right-0 z-[60] px-4 top-[calc(env(safe-area-inset-top)+0.75rem)]"
    >
      <div className="mx-auto w-full max-w-md">
        <div
          className={`${colors[type]} text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3 border border-white/10 backdrop-blur-md`}
          role="status"
          aria-live="polite"
        >
          <div className="mt-0.5 h-6 w-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 text-sm font-bold">
            {icons[type]}
          </div>
          <p className="text-white/95 text-sm leading-snug flex-1 break-words">
            {message}
          </p>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0 -mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
