import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useCustomOrders } from '../hooks/useCustomOrders';
import { customOrderService } from '../services/customOrderService';
import { ordersService } from '@/features/orders/services/ordersService';
import { productService } from '@/features/products/services/productService';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  ArrowLeft,
  FileCode,
  CheckCircle,
  XCircle,
  Send,
  Trash2,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface CustomOrderDetailPageProps {
  route: any;
  navigation: any;
}

export function CustomOrderDetailPage({ route, navigation }: CustomOrderDetailPageProps) {
  const { id } = route.params || {};
  const {
    order,
    isLoadingDetail,
    acceptOrder,
    isAccepting,
    rejectOrder,
    isRejecting,
    sendQuotation,
    isSendingQuote,
    deleteQuotation,
  } = useCustomOrders(id);

  const showToast = useUIStore((s) => s.showToast);

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('3');
  const [notes, setNotes] = useState('');

  if (isLoadingDetail || !order) {
    return (
      <DashboardLayout title="Request Details" navigation={navigation} currentRoute="/custom-orders">
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={120} borderRadius={16} />
          <Skeleton height={160} borderRadius={16} />
        </View>
      </DashboardLayout>
    );
  }

  const handleSendQuote = async () => {
    const priceNum = parseFloat(quotedPrice);
    const daysNum = parseInt(estimatedDays, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid positive quoted price', 'error');
      return;
    }
    if (isNaN(daysNum) || daysNum < 1) {
      showToast('Lead time must be at least 1 day', 'error');
      return;
    }

    const validity = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await sendQuotation({
        id: order.id,
        payload: {
          quotedPrice: priceNum,
          estimatedDays: daysNum,
          notes: notes.trim() || undefined,
          validUntil: validity,
        },
      });
      showToast('Quotation sent to buyer successfully', 'success');
      setQuoteOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quote', 'error');
    }
  };

  return (
    <DashboardLayout title={`Custom #${order.orderNumber}`} navigation={navigation} currentRoute="/custom-orders">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <ArrowLeft size={16} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.backText}>Back to Requests</Text>
        </TouchableOpacity>

        {/* Top Status Card */}
        <Card style={styles.headerCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>{order.title}</Text>
              <Text style={styles.orderNum}>Request #{order.orderNumber}</Text>
            </View>
            <Badge variant={customOrderService.getStatusBadgeVariant(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </View>

          <Text style={styles.desc}>{order.description}</Text>

          <View style={styles.metaBox}>
            <Text style={styles.metaText}>
              Quantity: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{order.quantity}</Text>
            </Text>
            {order.material ? (
              <Text style={styles.metaText}>
                Material: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{order.material}</Text>
              </Text>
            ) : null}
            <Text style={styles.metaText}>
              Submitted: {ordersService.formatDate(order.submittedAt)}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Button
              variant="default"
              onPress={() => setQuoteOpen(true)}
              style={{ flex: 1 }}
              icon={<Send size={14} color="#000000" />}
            >
              Submit Quote
            </Button>
            {order.status !== 'ACCEPTED' && (
              <Button
                variant="outline"
                loading={isAccepting}
                onPress={() => acceptOrder(order.id)}
                style={{ flex: 1 }}
                icon={<CheckCircle size={14} color="#ffffff" />}
              >
                Accept Order
              </Button>
            )}
          </View>
        </Card>

        {/* Uploaded CAD / 3D Files */}
        <Card>
          <CardHeader>
            <CardTitle>CAD &amp; 3D Design Files ({order.files.length})</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {order.files.length > 0 ? (
              order.files.map((file) => (
                <View key={file.id} style={styles.fileRow}>
                  <View style={styles.fileIconBox}>
                    <FileCode size={20} color={Colors.purpleLight} />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.fileName}
                    </Text>
                    <Text style={styles.fileSub}>
                      {file.fileType} • {customOrderService.formatSize(file.fileSizeBytes)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No files attached to this custom request.</Text>
            )}
          </CardContent>
        </Card>

        {/* Quotes Received */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation History ({order.quotes.length})</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {order.quotes.length > 0 ? (
              order.quotes.map((q) => (
                <View key={q.id} style={styles.quoteItem}>
                  <View style={styles.quoteTop}>
                    <Text style={styles.quotePrice}>{productService.formatPrice(q.quotedPrice)}</Text>
                    <Badge variant={q.isAccepted ? 'success' : 'secondary'} style={{ paddingVertical: 1 }}>
                      {q.isAccepted ? 'Accepted by Buyer' : 'Sent'}
                    </Badge>
                  </View>
                  <Text style={styles.quoteDays}>Lead time: {q.estimatedDays} business day(s)</Text>
                  {q.notes ? <Text style={styles.quoteNotes}>&quot;{q.notes}&quot;</Text> : null}
                  <TouchableOpacity
                    onPress={() => deleteQuotation(order.id)}
                    style={styles.deleteQuoteBtn}
                  >
                    <Trash2 size={13} color={Colors.rose} />
                    <Text style={styles.deleteQuoteText}>Withdraw Quote</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No quotations submitted yet.</Text>
            )}
          </CardContent>
        </Card>

        {/* Quote Dialog */}
        <Dialog
          open={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          title="Submit Custom Order Quotation"
          description="Send formal manufacturing lead-time and price proposal to customer"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Quoted Price (₹ Total)"
              placeholder="1200.00"
              keyboardType="decimal-pad"
              value={quotedPrice}
              onChangeText={setQuotedPrice}
            />
            <Input
              label="Estimated Lead Time (Days)"
              placeholder="3"
              keyboardType="number-pad"
              value={estimatedDays}
              onChangeText={setEstimatedDays}
            />
            <Input
              label="Manufacturing &amp; Material Notes"
              placeholder="0.2mm layer height, PLA material, infill 20%"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
            <Button
              variant="default"
              loading={isSendingQuote}
              onPress={handleSendQuote}
              style={{ marginTop: 10 }}
            >
              Submit Quote
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 6,
  },
  headerCard: {
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderNum: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  desc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 14,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  fileIconBox: {
    height: 38,
    width: 38,
    borderRadius: 8,
    backgroundColor: Colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  fileSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  quoteItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  quoteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quotePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.emerald,
  },
  quoteDays: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  quoteNotes: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  deleteQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  deleteQuoteText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.rose,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
