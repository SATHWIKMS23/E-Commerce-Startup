import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MapPin, X, Check, Plus, Globe } from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { locationService, Address } from '../services/location.service';
import { colors } from '../theme/colors';

export const AddressSelectorModal: React.FC = () => {
  const {
    addressSelectorOpen,
    setAddressSelectorOpen,
    selectedAddressId,
    selectedState,
    selectedDistrict,
    setLocation,
    setComingSoon,
    activeStates,
    allStates,
  } = useLocation();

  const { isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [customState, setCustomState] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);

  useEffect(() => {
    if (addressSelectorOpen && isAuthenticated) {
      setIsLoadingAddresses(true);
      locationService
        .getAddresses()
        .then((res) => setAddresses(res))
        .catch(() => {})
        .finally(() => setIsLoadingAddresses(false));
    }
  }, [addressSelectorOpen, isAuthenticated]);

  useEffect(() => {
    if (customState) {
      setIsLoadingDistricts(true);
      locationService
        .getDistricts(customState)
        .then((res) => {
          setDistricts(res.districts.map((d) => d.name));
        })
        .catch(() => setDistricts([]))
        .finally(() => setIsLoadingDistricts(false));
    } else {
      setDistricts([]);
    }
  }, [customState]);

  const handleSelectAddress = (addr: Address) => {
    const isStateActive = activeStates.some(
      (s) => s.name.toLowerCase() === addr.state.toLowerCase()
    );

    if (!isStateActive) {
      setAddressSelectorOpen(false);
      setComingSoon(true, addr.state, addr.city);
      return;
    }

    setLocation(addr.id, addr.state, addr.city);
    setAddressSelectorOpen(false);
  };

  const handleSelectCustomState = (stateName: string) => {
    setCustomState(stateName);
    setCustomDistrict('');

    const stateObj = allStates.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
    if (stateObj && !stateObj.isEnabled) {
      setAddressSelectorOpen(false);
      setComingSoon(true, stateName);
    }
  };

  const handleConfirmCustomDistrict = (districtName: string) => {
    setLocation(null, customState, districtName);
    setAddressSelectorOpen(false);
  };

  return (
    <Modal
      visible={addressSelectorOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setAddressSelectorOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.title}>Select Delivery Location</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAddressSelectorOpen(false)}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.foregroundMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* User Saved Addresses */}
            {isAuthenticated && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Saved Addresses</Text>
                {isLoadingAddresses ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : addresses.length > 0 ? (
                  addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        onPress={() => handleSelectAddress(addr)}
                        style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.radio}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addrName}>{addr.fullName}</Text>
                          <Text style={styles.addrDetails}>
                            {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptyNotice}>No saved addresses found.</Text>
                )}
              </View>
            )}

            {/* Custom Location Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Browse by State & District</Text>
              <Text style={styles.subtext}>
                Select an operational state to view products and shops in your area.
              </Text>

              {/* State Pills */}
              <View style={styles.pillsWrap}>
                {allStates.map((st) => {
                  const isSelected = customState === st.name || (!customState && selectedState === st.name);
                  return (
                    <TouchableOpacity
                      key={st.name}
                      onPress={() => handleSelectCustomState(st.name)}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {st.name} {!st.isEnabled && '(Soon)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Districts Pills (if available) */}
              {customState !== '' && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.sectionHeader}>Select District in {customState}</Text>
                  {isLoadingDistricts ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
                  ) : districts.length > 0 ? (
                    <View style={styles.pillsWrap}>
                      {districts.map((dst) => {
                        const isSelected = selectedDistrict === dst;
                        return (
                          <TouchableOpacity
                            key={dst}
                            onPress={() => handleConfirmCustomDistrict(dst)}
                            style={[styles.pill, isSelected && styles.pillSelected]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                              {dst}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptyNotice}>No districts listed for this state.</Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  contentScroll: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtext: {
    color: colors.foregroundDim,
    fontSize: 12,
    marginBottom: 10,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  addressItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.foregroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  addrName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  addrDetails: {
    color: colors.foregroundMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.foregroundMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  emptyNotice: {
    color: colors.foregroundDim,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
