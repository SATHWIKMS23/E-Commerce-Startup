'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Button } from '@/shared/components/Button';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

export function PremiumDialogContainer() {
  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    isAlertOnly,
    onConfirm,
    onCancel,
    close,
  } = useConfirmStore();

  const handleConfirm = () => {
    close();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    close();
    if (onCancel) onCancel();
  };

  const getIcon = () => {
    if (isAlertOnly) {
      if (title.toLowerCase().includes('success') || message.toLowerCase().includes('success') || message.toLowerCase().includes('added') || message.toLowerCase().includes('moved')) {
        return <CheckCircle2 className="h-8 w-8 text-emerald-400" />;
      }
      return <AlertCircle className="h-8 w-8 text-white/80" />;
    }
    return <HelpCircle className="h-8 w-8 text-white/80" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                  className="relative overflow-hidden w-full max-w-[440px] rounded-3xl border border-white/10 bg-zinc-950/80 p-6 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none"
                >
                  {/* Subtle Monochrome Glow */}
                  <div className="absolute -top-[30%] -right-[30%] h-48 w-48 rounded-full bg-white/5 blur-[50px] pointer-events-none" />
                  
                  {/* Close icon */}
                  <Dialog.Close asChild>
                    <button
                      onClick={handleCancel}
                      className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  <div className="flex flex-col items-center text-center mt-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-5 shadow-sm">
                      {getIcon()}
                    </div>

                    <Dialog.Title className="text-xl font-bold tracking-tight text-white mb-2">
                      {title}
                    </Dialog.Title>

                    <Dialog.Description asChild>
                      <div className="text-xs text-white/60 leading-relaxed mb-6 px-1 whitespace-pre-wrap">
                        {message}
                      </div>
                    </Dialog.Description>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                      {!isAlertOnly && (
                        <Button
                          variant="secondary"
                          onClick={handleCancel}
                          className="w-full justify-center text-xs h-10 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-white/80 cursor-pointer font-bold rounded-xl"
                        >
                          {cancelText || 'Cancel'}
                        </Button>
                      )}
                      <Button
                        variant="default"
                        onClick={handleConfirm}
                        className="w-full justify-center text-xs h-10 bg-white hover:bg-zinc-200 text-black cursor-pointer font-bold rounded-xl"
                      >
                        {confirmText || 'OK'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
