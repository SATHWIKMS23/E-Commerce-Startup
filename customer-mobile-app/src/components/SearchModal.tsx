import React, { useState } from 'react';
import {
  View,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    onClose();
    navigation.navigate('Products', { q });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.searchBarContainer}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>

          <Search size={18} color={colors.foregroundDim} style={{ marginLeft: 4 }} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, shops..."
            placeholderTextColor={colors.foregroundDim}
            style={styles.searchInput}
            autoFocus
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={16} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleSearch} style={styles.submitBtn}>
            <ArrowRight size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  submitBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
