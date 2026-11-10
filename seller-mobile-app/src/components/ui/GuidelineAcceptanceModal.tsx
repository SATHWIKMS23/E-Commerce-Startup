import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Button } from '@/shared/components/Button';
import { ShieldAlert, ShieldCheck, CheckSquare, Square } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export function GuidelineAcceptanceModal() {
  const [agreed, setAgreed] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [completedProof, setCompletedProof] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['seller-guideline-pending'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/guidelines/pending');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!data?.guideline?.id || !signedName.trim()) return;
      const res = await axiosInstance.post(`/seller/api/guidelines/${data.guideline.id}/accept`, {
        signedName: signedName.trim(),
      });
      return res.data;
    },
    onSuccess: (resData) => {
      setCompletedProof(resData?.agreement);
      queryClient.invalidateQueries({ queryKey: ['seller-guideline-pending'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to record acceptance.');
    },
  });

  if (!data?.requiresAcceptance || !data?.guideline) {
    return null;
  }

  const guideline = data.guideline;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {completedProof ? (
            <View style={styles.contentCenter}>
              <View style={styles.successIcon}>
                <ShieldCheck size={32} color={Colors.emerald} />
              </View>
              <Text style={styles.title}>Guidelines Accepted</Text>
              <Text style={styles.subtitle}>
                Cryptographic agreement for Version{' '}
                <Text style={{ color: Colors.emerald, fontWeight: '700' }}>
                  {guideline.version}
                </Text>{' '}
                registered.
              </Text>

              <View style={styles.proofBox}>
                <Text style={styles.proofRow}>
                  Certificate: <Text style={styles.proofVal}>{completedProof.id}</Text>
                </Text>
                <Text style={styles.proofRow}>
                  Signer: <Text style={styles.proofVal}>{completedProof.signedName}</Text>
                </Text>
                <Text style={styles.proofRow}>
                  Digest: <Text style={styles.proofVal}>{completedProof.documentHash || guideline.contentHash}</Text>
                </Text>
              </View>

              <Button
                variant="default"
                onPress={() => setCompletedProof(null)}
                style={{ width: '100%', marginTop: 14 }}
              >
                Continue to Portal
              </Button>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <ShieldAlert size={20} color={Colors.purpleLight} />
                <Text style={styles.headerTitle}>Mandatory Guideline Review</Text>
              </View>

              <Text style={styles.guidelineTitle}>{guideline.title || 'Community Guidelines'}</Text>
              <Text style={styles.guidelineSummary}>
                Version {guideline.version} — Please read and accept before accessing portal operations.
              </Text>

              <View style={styles.guidelineBox}>
                <Text style={styles.guidelineText}>
                  {guideline.content || guideline.summary || 'By operating as a merchant, you agree to fulfill authentic items, maintain shipping timelines, and comply with platform fair-trade policies.'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAgreed(!agreed)}
                style={styles.checkboxRow}
                activeOpacity={0.8}
              >
                {agreed ? (
                  <CheckSquare size={18} color={Colors.purpleLight} />
                ) : (
                  <Square size={18} color="rgba(255, 255, 255, 0.4)" />
                )}
                <Text style={styles.checkboxLabel}>
                  I have read, understood, and agree to adhere to these terms.
                </Text>
              </TouchableOpacity>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Full Legal Name (Electronic Signature)</Text>
                <TextInput
                  placeholder="e.g. John Doe"
                  placeholderTextColor={Colors.textFaint}
                  value={signedName}
                  onChangeText={setSignedName}
                  style={styles.nameInput}
                />
              </View>

              <Button
                variant="default"
                loading={acceptMutation.isPending}
                disabled={!agreed || !signedName.trim()}
                onPress={() => acceptMutation.mutate()}
                style={{ marginTop: 16, width: '100%' }}
              >
                Sign &amp; Acknowledge Agreement
              </Button>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#0a0a10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    padding: 20,
  },
  contentCenter: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: Colors.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  proofBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginTop: 14,
  },
  proofRow: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  proofVal: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.purpleLight,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  guidelineSummary: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  guidelineBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    maxHeight: 180,
    marginBottom: 14,
  },
  guidelineText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
});
