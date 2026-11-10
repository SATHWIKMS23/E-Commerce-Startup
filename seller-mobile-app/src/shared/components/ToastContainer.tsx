import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '@/lib/store/uiStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        const borderColor = isError
          ? Colors.roseBorder
          : isSuccess
          ? Colors.emeraldBorder
          : Colors.border;

        const bgColor = isError
          ? 'rgba(244, 63, 94, 0.15)'
          : isSuccess
          ? 'rgba(16, 185, 129, 0.15)'
          : 'rgba(255, 255, 255, 0.08)';

        const textColor = isError
          ? Colors.rose
          : isSuccess
          ? Colors.emerald
          : '#ffffff';

        return (
          <View
            key={toast.id}
            style={[
              styles.toast,
              { backgroundColor: bgColor, borderColor },
            ]}
          >
            <View style={styles.iconBox}>
              {isError ? (
                <AlertTriangle size={16} color={Colors.rose} />
              ) : isSuccess ? (
                <CheckCircle2 size={16} color={Colors.emerald} />
              ) : (
                <Info size={16} color={Colors.cyan} />
              )}
            </View>
            <Text style={[styles.message, { color: textColor }]}>
              {toast.message}
            </Text>
            <TouchableOpacity
              onPress={() => removeToast(toast.id)}
              style={styles.closeBtn}
            >
              <X size={14} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  iconBox: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
});
