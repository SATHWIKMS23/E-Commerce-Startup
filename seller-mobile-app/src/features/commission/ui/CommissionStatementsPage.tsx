import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  FileSpreadsheet,
  Download,
  Eye,
  X,
  HelpCircle,
  Calendar,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface CommissionStatementsPageProps {
  navigation: any;
}

export function CommissionStatementsPage({ navigation }: CommissionStatementsPageProps) {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  // Load published commission statements for this seller
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['seller-commission-statements'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/commission-statements');
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  // Load detail for selected statement
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['seller-commission-statement-detail', selectedStatementId],
    queryFn: async () => {
      if (!selectedStatementId) return null;
      const res = await axiosInstance.get(`/seller/api/commission-statements/${selectedStatementId}`);
      return res.data;
    },
    enabled: !!selectedStatementId,
  });

  const statements = data?.statements ?? [];
  const currentStatement = detailData?.statement;

  const handleDownloadProof = async () => {
    if (!currentStatement) return;
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Commission Statement - ${currentStatement.statementNumber}</title>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
              .header { border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
              h1 { margin: 0 0 6px 0; color: #7c3aed; font-size: 20px; }
              .meta { font-size: 12px; color: #666; }
              .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .table th, .table td { border: 1px solid #ddd; padding: 10px; font-size: 12px; text-align: left; }
              .table th { background: #f8f9fa; }
              .total { font-weight: bold; }
              .highlight { color: #059669; }
              .due { color: #d97706; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>COMMISSION STATEMENT & SETTLEMENT</h1>
              <div class="meta">Statement Number: <strong>${currentStatement.statementNumber}</strong></div>
              <div class="meta">Period: ${new Date(currentStatement.startDate).toLocaleDateString()} &ndash; ${new Date(currentStatement.endDate).toLocaleDateString()}</div>
              <div class="meta">Status: <strong>${currentStatement.status}</strong></div>
            </div>

            <table class="table">
              <tr>
                <td>Commissionable Base:</td>
                <td>INR ${Number(currentStatement.commissionableBase || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Applicable Rate:</td>
                <td>${currentStatement.applicableRate}%</td>
              </tr>
              <tr class="total">
                <td>Total Accrued Commission:</td>
                <td>INR ${Number(currentStatement.commissionAccrued || 0).toFixed(2)}</td>
              </tr>
              <tr class="total highlight">
                <td>Confirmed Remittances:</td>
                <td>INR ${Number(currentStatement.paymentsReceived || 0).toFixed(2)}</td>
              </tr>
              <tr class="total due">
                <td>Outstanding Balance Due:</td>
                <td>INR ${Number(currentStatement.outstandingBalance || 0).toFixed(2)}</td>
              </tr>
            </table>

            <div style="margin-top: 30px; font-size: 10px; color: #999; text-align: center;">
              Official merchant statement issued by AtlasBasket Marketplace.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Statement ${currentStatement.statementNumber}`,
        });
      } else {
        Alert.alert('Statement Generated', `Saved to ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Failed to download statement');
    }
  };

  return (
    <DashboardLayout title="Commission Statements" navigation={navigation} currentRoute="/commission-statements">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor={Colors.purpleLight}
            colors={[Colors.purpleLight]}
          />
        }
      >
        {/* Header Banner */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.headerIcon}>
              <FileSpreadsheet size={20} color={Colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Monthly Commission Statements</Text>
              <Text style={styles.subtitle}>
                Audited monthly commission settlement invoices, order summaries, and payment receipts.
              </Text>
            </View>
          </View>

          <Button
            size="sm"
            variant="outline"
            onPress={() => navigation.navigate('SupportChat')}
            icon={<HelpCircle size={14} color="rgba(255, 255, 255, 0.8)" />}
            style={styles.disputeBtn}
          >
            Dispute / Clarify Statement
          </Button>
        </View>

        {/* Statements List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Records ({statements.length})</Text>

          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={110} />
              <Skeleton height={110} />
            </View>
          ) : statements.length === 0 ? (
            <Card style={styles.emptyCard}>
              <FileSpreadsheet size={32} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No published commission statements available yet.</Text>
            </Card>
          ) : (
            statements.map((s: any) => {
              const balance = Number(s.outstandingBalance || 0);
              return (
                <Card key={s.id} style={styles.statementCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statementNumber}>{s.statementNumber}</Text>
                      <View style={styles.monthBadge}>
                        <Calendar size={12} color={Colors.emerald} />
                        <Text style={styles.monthText}>{s.periodMonth}</Text>
                      </View>
                    </View>
                    <Badge variant={s.status === 'PAID' ? 'emerald' : 'yellow'}>
                      {s.status}
                    </Badge>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <Text style={styles.label}>Eligible Orders</Text>
                      <Text style={styles.val}>{s.eligibleOrdersCount} orders</Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.label}>Accrued Commission</Text>
                      <Text style={styles.val}>INR {Number(s.commissionAccrued).toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <Text style={styles.label}>Payments Received</Text>
                      <Text style={[styles.val, { color: Colors.emerald }]}>
                        INR {Number(s.paymentsReceived).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.label}>Outstanding Balance</Text>
                      <Text
                        style={[
                          styles.val,
                          { color: balance > 0 ? Colors.yellow : Colors.emerald, fontWeight: '800' },
                        ]}
                      >
                        INR {balance.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => setSelectedStatementId(s.id)}
                      icon={<Eye size={13} color="#ffffff" />}
                      style={styles.viewBtn}
                    >
                      View Details
                    </Button>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Statement Detail Modal */}
      {selectedStatementId && (
        <Modal
          visible={!!selectedStatementId}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedStatementId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Commission Statement Details</Text>
                  <Text style={styles.modalSubtitle}>
                    {currentStatement?.statementNumber || 'Loading...'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedStatementId(null)}
                  style={styles.closeBtn}
                >
                  <X size={18} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>

              {isDetailLoading ? (
                <View style={{ padding: 20 }}>
                  <Skeleton height={180} />
                </View>
              ) : currentStatement ? (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Summary Box */}
                  <View style={styles.summaryBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Statement Period:</Text>
                      <Text style={styles.detailVal}>
                        {new Date(currentStatement.startDate).toLocaleDateString()} –{' '}
                        {new Date(currentStatement.endDate).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Commissionable Base:</Text>
                      <Text style={styles.detailVal}>
                        INR {Number(currentStatement.commissionableBase).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Applicable Commission Rate:</Text>
                      <Text style={styles.detailVal}>{currentStatement.applicableRate}%</Text>
                    </View>

                    <View style={[styles.detailRow, styles.borderTop]}>
                      <Text style={[styles.detailLabel, { fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)' }]}>
                        Total Accrued Commission:
                      </Text>
                      <Text style={[styles.detailVal, { fontWeight: '800' }]}>
                        INR {Number(currentStatement.commissionAccrued).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)' }]}>
                        Confirmed Remittances:
                      </Text>
                      <Text style={[styles.detailVal, { color: Colors.emerald, fontWeight: '800' }]}>
                        INR {Number(currentStatement.paymentsReceived).toFixed(2)}
                      </Text>
                    </View>

                    <View style={[styles.detailRow, styles.borderTop]}>
                      <Text style={[styles.detailLabel, { fontWeight: '800', color: '#ffffff' }]}>
                        Outstanding Balance Due:
                      </Text>
                      <Text style={[styles.detailVal, { color: Colors.yellow, fontWeight: '800', fontSize: 14 }]}>
                        INR {Number(currentStatement.outstandingBalance).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment history */}
                  <View style={styles.paymentsSection}>
                    <Text style={styles.paymentsHeading}>
                      RECORDED PAYMENT REMITTANCES ({currentStatement.payments?.length ?? 0})
                    </Text>

                    {currentStatement.payments?.length === 0 ? (
                      <View style={styles.noPaymentsBox}>
                        <Text style={styles.noPaymentsText}>
                          No payment remittances recorded yet for this period.
                        </Text>
                      </View>
                    ) : (
                      currentStatement.payments?.map((pmt: any) => (
                        <View key={pmt.id} style={styles.pmtItem}>
                          <View>
                            <Text style={styles.pmtAmount}>
                              INR {Number(pmt.amount).toFixed(2)}
                            </Text>
                            <Text style={styles.pmtSub}>
                              {pmt.paymentMethod} • Ref: {pmt.transactionReference || 'N/A'}
                            </Text>
                          </View>
                          <Text style={styles.pmtDate}>
                            {new Date(pmt.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              ) : null}

              {/* Modal Actions */}
              <View style={styles.modalFooter}>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={handleDownloadProof}
                  icon={<Download size={14} color="#ffffff" />}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Download Proof
                </Button>
                <Button
                  size="sm"
                  onPress={() => setSelectedStatementId(null)}
                  style={{ minWidth: 80 }}
                >
                  Close
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
    lineHeight: 15,
  },
  disputeBtn: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  statementCard: {
    padding: 14,
    gap: 10,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statementNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  monthText: {
    fontSize: 11,
    color: Colors.emerald,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridCol: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
  },
  val: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  viewBtn: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#0d0d14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 11,
    color: Colors.emerald,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 16,
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  detailVal: {
    fontSize: 11,
    color: '#ffffff',
  },
  paymentsSection: {
    marginTop: 16,
    gap: 8,
  },
  paymentsHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },
  noPaymentsBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  noPaymentsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  pmtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pmtAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.emerald,
  },
  pmtSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  pmtDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
