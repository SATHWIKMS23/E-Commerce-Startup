import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { ordersService } from '@/features/orders/services/ordersService';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Gavel,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Plus,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface EnforcementPageProps {
  navigation: any;
}

export function EnforcementPage({ navigation }: EnforcementPageProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'WARNING' | 'STRIKE' | 'APPEALS'>('ALL');
  const [appealModalRecord, setAppealModalRecord] = useState<any | null>(null);
  const [appealStatement, setAppealStatement] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');

  const queryClient = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);

  const { data: enforcementData, isLoading } = useQuery({
    queryKey: ['seller-enforcement-history'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/enforcement');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const { data: appealsData } = useQuery({
    queryKey: ['seller-appeals-history'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/appeals');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const submitAppealMutation = useMutation({
    mutationFn: async () => {
      if (!appealModalRecord) return;
      const res = await axiosInstance.post('/seller/api/appeals', {
        strikeId: appealModalRecord.id,
        statement: appealStatement.trim(),
        evidenceUrls: appealEvidence ? [appealEvidence.trim()] : [],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-enforcement-history'] });
      queryClient.invalidateQueries({ queryKey: ['seller-appeals-history'] });
      setAppealModalRecord(null);
      setAppealStatement('');
      setAppealEvidence('');
      showToast('Appeal registered successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to submit appeal', 'error');
    },
  });

  const validStrikesCount = enforcementData?.validStrikesCount ?? 0;
  const isSuspended = enforcementData?.isSuspended ?? false;
  const history = enforcementData?.history ?? [];
  const appeals = appealsData?.appeals ?? [];

  const warnings = history.filter((r: any) => r.type === 'WARNING');
  const strikes = history.filter((r: any) => r.type === 'STRIKE');

  const filteredHistory =
    activeTab === 'ALL'
      ? history
      : activeTab === 'WARNING'
      ? warnings
      : activeTab === 'STRIKE'
      ? strikes
      : [];

  return (
    <DashboardLayout title="Compliance & Strikes" navigation={navigation} currentRoute="/enforcement">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance &amp; Enforcement</Text>
          <Text style={styles.subtitle}>
            Merchant account standing under marketplace Community Guidelines and Terms of Service.
          </Text>
        </View>

        {/* Account Standing Banner */}
        <Card style={isSuspended ? styles.suspendedCard : styles.standingCard}>
          <View style={styles.standingRow}>
            {validStrikesCount === 0 && !isSuspended ? (
              <ShieldCheck size={28} color={Colors.emerald} />
            ) : (
              <AlertTriangle size={28} color={isSuspended ? Colors.rose : Colors.yellow} />
            )}
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.standingTitle}>
                {isSuspended
                  ? 'Store Suspended for Policy Violations'
                  : validStrikesCount > 0
                  ? `Warning: ${validStrikesCount} Active Strike(s)`
                  : 'Account in Good Standing'}
              </Text>
              <Text style={styles.standingDesc}>
                {validStrikesCount === 0
                  ? 'Zero active community strikes. Full marketplace operations enabled.'
                  : `${validStrikesCount} strike(s) logged. Reaching 3 strikes will trigger automated store suspension.`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          {(['ALL', 'WARNING', 'STRIKE', 'APPEALS'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.tab, activeTab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List Content */}
        {isLoading ? (
          <Skeleton height={100} borderRadius={14} />
        ) : activeTab === 'APPEALS' ? (
          appeals.length > 0 ? (
            appeals.map((app: any) => (
              <Card key={app.id} style={{ padding: 14, marginBottom: 10 }}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Appeal #{app.id.slice(-6).toUpperCase()}</Text>
                  <Badge variant={app.status === 'APPROVED' ? 'success' : app.status === 'REJECTED' ? 'destructive' : 'default'}>
                    {app.status}
                  </Badge>
                </View>
                <Text style={styles.itemBody}>&quot;{app.statement}&quot;</Text>
                <Text style={styles.itemTime}>Submitted {ordersService.formatDate(app.createdAt)}</Text>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>No submitted appeals recorded.</Text>
          )
        ) : filteredHistory.length > 0 ? (
          filteredHistory.map((rec: any) => (
            <Card key={rec.id} style={{ padding: 14, marginBottom: 10 }}>
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Gavel size={16} color={rec.type === 'STRIKE' ? Colors.rose : Colors.yellow} />
                  <Text style={styles.itemTitle}>{rec.title || rec.type}</Text>
                </View>
                <Badge variant={rec.type === 'STRIKE' ? 'destructive' : 'warning'}>
                  {rec.type}
                </Badge>
              </View>
              <Text style={styles.itemBody}>{rec.reason || rec.description || 'Violation logged by compliance system.'}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemTime}>{ordersService.formatDate(rec.createdAt)}</Text>
                {rec.type === 'STRIKE' && !rec.hasAppealed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setAppealModalRecord(rec)}
                  >
                    File Appeal
                  </Button>
                )}
              </View>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No violations or strikes logged on your account.</Text>
        )}

        {/* Appeal Dialog */}
        <Dialog
          open={!!appealModalRecord}
          onClose={() => setAppealModalRecord(null)}
          title="Submit Formal Strike Appeal"
          description="Explain why this strike or warning was issued erroneously"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Appeal Statement"
              placeholder="Detailed explanation and context…"
              multiline
              numberOfLines={4}
              value={appealStatement}
              onChangeText={setAppealStatement}
            />
            <Input
              label="Supporting Evidence URL (Optional)"
              placeholder="https://drive.google.com/… or proof photo URL"
              value={appealEvidence}
              onChangeText={setAppealEvidence}
            />
            <Button
              variant="default"
              loading={submitAppealMutation.isPending}
              onPress={() => submitAppealMutation.mutate()}
              style={{ marginTop: 10 }}
            >
              Submit Appeal Request
            </Button>
          </View>
        </Dialog>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  standingCard: {
    padding: 16,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginBottom: 14,
  },
  suspendedCard: {
    padding: 16,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    marginBottom: 14,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  standingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  standingDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    lineHeight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  tabActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  tabTextActive: {
    color: Colors.purpleLight,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemBody: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  itemTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
