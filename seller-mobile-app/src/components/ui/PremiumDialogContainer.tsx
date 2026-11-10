import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Button } from '@/shared/components/Button';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

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

  if (!isOpen) return null;

  const isSuccess =
    title.toLowerCase().includes('success') ||
    message.toLowerCase().includes('success') ||
    message.toLowerCase().includes('added') ||
    message.toLowerCase().includes('moved');

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCancel}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
            <X size={16} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            {isAlertOnly ? (
              isSuccess ? (
                <CheckCircle2 size={30} color={Colors.emerald} />
              ) : (
                <AlertCircle size={30} color="rgba(255, 255, 255, 0.85)" />
              )
            ) : (
              <HelpCircle size={30} color="rgba(255, 255, 255, 0.85)" />
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!isAlertOnly && (
              <Button
                variant="secondary"
                onPress={handleCancel}
                style={{ flex: 1, marginRight: 8 }}
              >
                {cancelText || 'Cancel'}
              </Button>
            )}
            <Button
              variant="default"
              onPress={handleConfirm}
              style={{ flex: 1 }}
            >
              {confirmText || 'OK'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0c0c10',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    height: 56,
    width: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
});
