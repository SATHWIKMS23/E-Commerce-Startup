import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isAlertOnly: boolean;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  showConfirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  showAlert: (options: {
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  }) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  isAlertOnly: false,
  onConfirm: null,
  onCancel: null,
  showConfirm: ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) =>
    set({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isAlertOnly: false,
      onConfirm,
      onCancel: onCancel || null,
    }),
  showAlert: ({ title, message, confirmText = 'OK', onConfirm }) =>
    set({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: '',
      isAlertOnly: true,
      onConfirm: onConfirm || null,
      onCancel: null,
    }),
  close: () => set({ isOpen: false, onConfirm: null, onCancel: null }),
}));
