import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { FileText, Search, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface PoliciesPageProps {
  navigation: any;
}

export function PoliciesPage({ navigation }: PoliciesPageProps) {
  const [search, setSearch] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-policy-notices'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/policy-notices');
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/seller/api/policy-notices/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-policy-notices'] });
    },
  });

  const notices = data?.notices ?? [];
  const filteredNotices = notices.filter((n: any) =>
    search
      ? n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const handleOpenNotice = (notice: any) => {
    setSelectedNotice(notice);
    if (!notice.hasRead) {
      markAsReadMutation.mutate(notice.id);
    }
  };

  return (
    <DashboardLayout title="Policy Bulletins" navigation={navigation} currentRoute="/policies">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Policies &amp; Bulletins</Text>
          <Text style={styles.subtitle}>Official marketplace operating policies and packaging rules</Text>
        </View>

        <View style={styles.searchBar}>
          <Input
            placeholder="Search policy notices…"
            value={search}
            onChangeText={setSearch}
            containerStyle={{ marginBottom: 0 }}
            icon={<Search size={16} color={Colors.textMuted} />}
          />
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={80} borderRadius={14} />
              <Skeleton height={80} borderRadius={14} />
            </View>
          ) : filteredNotices.length > 0 ? (
            filteredNotices.map((n: any) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleOpenNotice(n)}
                activeOpacity={0.75}
              >
                <Card style={styles.noticeCard}>
                  <View style={styles.noticeHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <FileText size={16} color={Colors.purpleLight} />
                      <Text style={styles.noticeTitle} numberOfLines={1}>
                        {n.title}
                      </Text>
                    </View>
                    <Badge variant={n.hasRead ? 'secondary' : 'default'} style={{ paddingVertical: 1 }}>
                      {n.hasRead ? 'Read' : 'New'}
                    </Badge>
                  </View>
                  <Text style={styles.noticePreview} numberOfLines={2}>
                    {n.content || n.summary}
                  </Text>
                  <Text style={styles.noticeDate}>
                    Published {ordersService.formatDate(n.createdAt)}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No operational policy bulletins found.</Text>
            </View>
          )}
        </ScrollView>

        {/* Notice Reader Dialog */}
        <Dialog
          open={!!selectedNotice}
          onClose={() => setSelectedNotice(null)}
          title={selectedNotice?.title || 'Policy Notice'}
          description={`Published ${ordersService.formatDate(selectedNotice?.createdAt)}`}
        >
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={styles.dialogNoticeContent}>
              {selectedNotice?.content || selectedNotice?.summary}
            </Text>
          </ScrollView>
        </Dialog>
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 4,
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
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  noticeCard: {
    padding: 14,
    marginBottom: 10,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  noticePreview: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 16,
    marginBottom: 6,
  },
  noticeDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
  dialogNoticeContent: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
});
