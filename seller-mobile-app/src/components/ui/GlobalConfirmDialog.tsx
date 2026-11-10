import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Button } from '@/shared/components/Button';
import { Colors } from '@/theme/colors';
import { AlertCircle } from 'lucide-react-native';

export function GlobalConfirmDialog() {
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

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    close();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    close();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <AlertCircle size={20} color={Colors.purpleLight} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!isAlertOnly && (
              <Button
                variant="outline"
                size="sm"
                onPress={handleCancel}
                style={{ flex: 1, marginRight: 8 }}
              >
                {cancelText || 'Cancel'}
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onPress={handleConfirm}
              style={{ flex: 1 }}
            >
              {confirmText || 'Confirm'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0d0d14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 8,
  },
});
