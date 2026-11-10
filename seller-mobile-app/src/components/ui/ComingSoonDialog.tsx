import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { Rocket, Bell, X, Check } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export function ComingSoonDialog() {
  const {
    comingSoonOpen,
    comingSoonState,
    comingSoonDistrict,
    setComingSoon,
    onChooseAnotherState,
    onClose,
  } = useLocationStore();

  const [notified, setNotified] = useState(false);

  const handleClose = (chooseAnother = false) => {
    setComingSoon(false);
    setNotified(false);
    if (chooseAnother && onChooseAnotherState) {
      onChooseAnotherState();
    } else if (!chooseAnother && onClose) {
      onClose();
    }
  };

  const handleNotifyMe = () => {
    setNotified(true);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  if (!comingSoonOpen) return null;

  return (
    <Modal
      visible={comingSoonOpen}
      transparent
      animationType="fade"
      onRequestClose={() => handleClose(false)}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleClose(false)}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => handleClose(false)}
            style={styles.closeBtn}
          >
            <X size={16} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Rocket size={32} color={Colors.purpleLight} />
          </View>

          <Text style={styles.title}>🚀 Service Not Available Yet</Text>

          <Text style={styles.description}>
            {comingSoonDistrict ? (
              <>
                We&apos;re already available in{' '}
                <Text style={styles.highlight}>{comingSoonState}</Text>, but service
                has not yet started in{' '}
                <Text style={styles.highlight}>{comingSoonDistrict}</Text>.{'\n\n'}
                We&apos;ll be launching there soon.{'\n'}
                Thank you for your patience.
              </>
            ) : (
              <>
                We haven&apos;t launched in{' '}
                <Text style={styles.highlight}>{comingSoonState}</Text> yet.{'\n\n'}
                We&apos;re actively expanding and will be available there soon.{'\n'}
                Thank you for your patience.
              </>
            )}
          </Text>

          <View style={styles.actions}>
            <Button
              variant="default"
              onPress={() => handleClose(true)}
              style={{ width: '100%', marginBottom: 10 }}
            >
              Choose Another Location
            </Button>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <Button
                variant="secondary"
                onPress={() => handleClose(false)}
                style={{ flex: 1, marginRight: 8 }}
              >
                Close
              </Button>
              <Button
                variant={notified ? 'secondary' : 'outline'}
                onPress={handleNotifyMe}
                disabled={notified}
                style={{ flex: 1 }}
                icon={
                  notified ? (
                    <Check size={14} color={Colors.emerald} />
                  ) : (
                    <Bell size={14} color="#ffffff" />
                  )
                }
              >
                {notified ? 'Registered!' : 'Notify Me'}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
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
    height: 64,
    width: 64,
    borderRadius: 20,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  highlight: {
    color: Colors.purpleLight,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
  },
});
