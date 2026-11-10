import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';
import { colors } from '../theme/colors';

export const ComingSoonModal: React.FC = () => {
  const {
    comingSoonOpen,
    comingSoonState,
    setComingSoon,
    setAddressSelectorOpen,
  } = useLocation();

  const handleChooseAnother = () => {
    setComingSoon(false);
    setAddressSelectorOpen(true);
  };

  return (
    <Modal
      visible={comingSoonOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setComingSoon(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity
            onPress={() => setComingSoon(false)}
            style={styles.closeBtn}
          >
            <X size={18} color={colors.foregroundMuted} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <MapPin size={28} color={colors.primary} />
          </View>

          {/* Content */}
          <Text style={styles.title}>
            Coming Soon to {comingSoonState || 'your area'}!
          </Text>

          <Text style={styles.description}>
            AtlasBasket is rapidly expanding. We are currently operational in select regions to ensure lightning-fast local delivery and direct support for neighborhood makers.
          </Text>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleChooseAnother}
            style={styles.actionBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Choose Another Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: colors.foregroundMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
});
