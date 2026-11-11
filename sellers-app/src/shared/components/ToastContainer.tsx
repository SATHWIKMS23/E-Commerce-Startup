'use client';

import { useUIStore } from '@/lib/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border glass backdrop-blur-xl shadow-2xl relative overflow-hidden"
              style={{
                borderColor: isError
                  ? 'rgba(239, 68, 68, 0.2)'
                  : isSuccess
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(255, 255, 255, 0.1)',
                background: isError
                  ? 'rgba(239, 68, 68, 0.05)'
                  : isSuccess
                  ? 'rgba(34, 197, 94, 0.05)'
                  : 'rgba(255, 255, 255, 0.03)',
              }}
            >
              {/* Left border indicator */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{
                  background: isError
                    ? '#ef4444'
                    : isSuccess
                    ? '#22c55e'
                    : '#a855f7',
                }}
              />

              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {isError ? (
                  <AlertCircle className="h-4.5 w-4.5 text-red-400" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
                ) : (
                  <Info className="h-4.5 w-4.5 text-purple-400" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-semibold text-white/90 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors p-0.5 rounded hover:bg-white/5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
