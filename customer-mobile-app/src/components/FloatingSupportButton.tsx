import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageSquare, AlertTriangle } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { ReportIssueModal } from './ReportIssueModal';

export const FloatingSupportButton: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <View style={styles.floatingContainer} pointerEvents="box-none">
        {/* Amber Report Issue Button */}
        <TouchableOpacity
          onPress={() => setShowReportModal(true)}
          style={styles.reportBtn}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AlertTriangle size={15} color="#fbbf24" />
        </TouchableOpacity>

        {/* Indigo Support Desk Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('SupportChat')}
          style={styles.chatBtn}
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color="#ffffff" />
          <Text style={styles.chatText}>Support Desk</Text>
        </TouchableOpacity>
      </View>

      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4f46e5', // indigo-600
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  chatText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
