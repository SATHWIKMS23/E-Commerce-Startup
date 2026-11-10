import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useOrders } from '../hooks/useOrders';
import { ordersService } from '../services/ordersService';
import { productService } from '@/features/products/services/productService';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Truck,
  Package,
  Printer,
  Upload,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface OrderDetailPageProps {
  route: any;
  navigation: any;
}

export function OrderDetailPage({ route, navigation }: OrderDetailPageProps) {
  const { orderId } = route.params || {};
  const {
    order,
    isLoadingDetails,
    timeline,
    allowedDeliveryMethods,
    acceptOrder,
    isAccepting,
    rejectOrder,
    isRejecting,
    setReadyTime,
    isSettingReadyTime,
    assignDeliveryMethod,
    isAssigningDeliveryMethod,
    uploadPackingProof,
    isUploadingProof,
    markPacked,
    isMarkingPacked,
    markShipped,
    isMarkingShipped,
    markDelivered,
    isMarkingDelivered,
    markCodCollected,
    isMarkingCodCollected,
  } = useOrders(orderId);

  const showToast = useUIStore((s) => s.showToast);
  const showConfirm = useConfirmStore((s) => s.showConfirm);
  const { pickAndUpload, isUploading: isUploadingPhoto } = useFileUpload({ folder: 'packing-proof' });

  // Dialogs
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [readyTimeOpen, setReadyTimeOpen] = useState(false);
  const [readyMinutes, setReadyMinutes] = useState('60');

  if (isLoadingDetails || !order) {
    return (
      <DashboardLayout title="Order Details" navigation={navigation} currentRoute="/orders">
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={100} borderRadius={16} />
          <Skeleton height={150} borderRadius={16} />
          <Skeleton height={200} borderRadius={16} />
        </View>
      </DashboardLayout>
    );
  }

  const handleAccept = async () => {
    try {
      await acceptOrder(order.id);
      showToast('Order accepted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to accept order', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      showToast('Please provide a reason (min 5 characters)', 'error');
      return;
    }
    try {
      await rejectOrder({ id: order.id, reason: rejectReason.trim() });
      showToast('Order rejected', 'success');
      setRejectOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject order', 'error');
    }
  };

  const handleSetReadyTime = async () => {
    const mins = parseInt(readyMinutes, 10) || 60;
    const futureDate = new Date(Date.now() + mins * 60 * 1000).toISOString();
    try {
      await setReadyTime({ id: order.id, readyByAt: futureDate });
      showToast(`Ready time set for ${mins} minutes from now`, 'success');
      setReadyTimeOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to set ready time', 'error');
    }
  };

  const handleUploadProof = async () => {
    const res = await pickAndUpload();
    if (res?.url) {
      try {
        await uploadPackingProof({ id: order.id, imageUrls: [res.url], notes: 'Proof photo uploaded' });
        showToast('Packaging proof photo saved', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to save packing proof', 'error');
      }
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>INVOICE: ${order.order.orderNumber}</h2>
            <p>Date: ${ordersService.formatDate(order.createdAt)}</p>
            <p>Customer: ${order.order.shippingAddress?.fullName || 'N/A'}</p>
            <hr/>
            <table style="width: 100%; text-align: left; margin-top: 10px;">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (it) => `<tr>
                  <td>${it.product.name}</td>
                  <td>${it.quantity}</td>
                  <td>${productService.formatPrice(it.totalPrice)}</td>
                </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
            <hr/>
            <p><strong>Total: ${productService.formatPrice(order.totalPrice)}</strong></p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err: any) {
      Alert.alert('Invoice', err.message || 'Failed to print invoice');
    }
  };

  return (
    <DashboardLayout title={`Order #${order.order.orderNumber}`} navigation={navigation} currentRoute="/orders">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Row */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <ArrowLeft size={16} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.backText}>Back to Orders</Text>
        </TouchableOpacity>

        {/* Order Status Banner */}
        <Card style={styles.statusBanner}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.orderNum}>Order #{order.order.orderNumber}</Text>
              <Text style={styles.placedDate}>Placed {ordersService.formatDate(order.createdAt)}</Text>
            </View>
            <Badge variant={ordersService.getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </View>

          {/* Action Row */}
          <View style={styles.bannerActions}>
            {order.status === 'PENDING' && (
              <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                <Button
                  variant="default"
                  loading={isAccepting}
                  onPress={handleAccept}
                  style={{ flex: 1 }}
                >
                  Accept Order
                </Button>
                <Button
                  variant="destructive"
                  onPress={() => setRejectOpen(true)}
                  style={{ flex: 1 }}
                >
                  Reject
                </Button>
              </View>
            )}

            {order.status === 'ACCEPTED' && (
              <View style={{ gap: 8, width: '100%' }}>
                <Button
                  variant="outline"
                  onPress={() => setReadyTimeOpen(true)}
                  icon={<Clock size={16} color="#ffffff" />}
                >
                  Set Ready By Time
                </Button>
                {allowedDeliveryMethods.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {allowedDeliveryMethods.map((dm) => (
                      <Button
                        key={dm.id}
                        variant={order.selectedDeliveryMethod === dm.code ? 'default' : 'outline'}
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => assignDeliveryMethod({ id: order.id, deliveryMethod: dm.code })}
                      >
                        {dm.name}
                      </Button>
                    ))}
                  </View>
                )}
              </View>
            )}

            {(order.status === 'ACCEPTED' || order.status === 'PROCESSING') && (
              <View style={{ gap: 8, width: '100%', marginTop: 8 }}>
                <Button
                  variant="outline"
                  loading={isUploadingPhoto || isUploadingProof}
                  onPress={handleUploadProof}
                  icon={<Upload size={16} color="#ffffff" />}
                >
                  Upload Packing Proof
                </Button>
                <Button
                  variant="default"
                  loading={isMarkingPacked}
                  onPress={() => markPacked(order.id)}
                >
                  Mark as Packed
                </Button>
              </View>
            )}

            {order.status === 'PACKED' && (
              <Button
                variant="default"
                loading={isMarkingShipped}
                onPress={() => markShipped(order.id)}
                style={{ width: '100%' }}
                icon={<Truck size={16} color="#000000" />}
              >
                Mark as Shipped / Dispatched
              </Button>
            )}

            {order.status === 'SHIPPED' && (
              <Button
                variant="default"
                loading={isMarkingDelivered}
                onPress={() => markDelivered(order.id)}
                style={{ width: '100%' }}
                icon={<CheckCircle size={16} color="#000000" />}
              >
                Confirm Customer Delivery
              </Button>
            )}

            {order.order.paymentMethod === 'COD' && !order.order.codCollected && (
              <Button
                variant="outline"
                loading={isMarkingCodCollected}
                onPress={() => markCodCollected(order.id)}
                style={{ width: '100%', marginTop: 8 }}
              >
                Mark Cash-On-Delivery Collected
              </Button>
            )}
          </View>
        </Card>

        {/* Customer & Shipping */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery &amp; Customer</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={16} color={Colors.purpleLight} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                {order.order.shippingAddress?.fullName || 'Customer'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.65)' }}>
              {order.order.shippingAddress?.addressLine1 || ''}
              {order.order.shippingAddress?.addressLine2 ? `, ${order.order.shippingAddress.addressLine2}` : ''}
              {order.order.shippingAddress?.city ? `, ${order.order.shippingAddress.city}` : ''}
              {order.order.shippingAddress?.state ? `, ${order.order.shippingAddress.state}` : ''}
              {order.order.shippingAddress?.postalCode ? ` - ${order.order.shippingAddress.postalCode}` : ''}
            </Text>
            {order.order.shippingAddress?.phone ? (
              <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 }}>
                Phone: {order.order.shippingAddress.phone}
              </Text>
            ) : null}
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle>Ordered Items ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemImgBox}>
                  {item.product.imageUrl ? (
                    <Image source={{ uri: item.product.imageUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Package size={20} color="rgba(255, 255, 255, 0.3)" />
                  )}
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.itemSub}>
                    Qty: {item.quantity} × {productService.formatPrice(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {productService.formatPrice(item.totalPrice)}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(order.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Packaging Fee</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(order.packingFee)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Amount</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(order.shippingAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Commission</Text>
              <Text style={[styles.summaryVal, { color: Colors.rose }]}>
                -{productService.formatPrice(order.platformCommission)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.totalLabel}>Seller Payout</Text>
              <Text style={styles.totalVal}>{productService.formatPrice(order.sellerEarnings)}</Text>
            </View>
          </CardContent>
        </Card>

        {/* Print Invoice Button */}
        <Button
          variant="outline"
          onPress={handlePrintInvoice}
          icon={<Printer size={16} color="#ffffff" />}
          style={{ marginBottom: 20 }}
        >
          Print / Share Invoice
        </Button>

        {/* Reject Dialog */}
        <Dialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          title="Reject Order"
          description="Provide a reason for rejecting this customer order"
        >
          <Input
            label="Rejection Reason"
            placeholder="Item damaged, out of stock, or cannot fulfill in time"
            multiline
            numberOfLines={3}
            value={rejectReason}
            onChangeText={setRejectReason}
          />
          <Button
            variant="destructive"
            loading={isRejecting}
            onPress={handleReject}
            style={{ marginTop: 10 }}
          >
            Confirm Rejection
          </Button>
        </Dialog>

        {/* Ready Time Dialog */}
        <Dialog
          open={readyTimeOpen}
          onClose={() => setReadyTimeOpen(false)}
          title="Set Estimated Ready Time"
          description="Enter lead preparation duration in minutes"
        >
          <Input
            label="Preparation Time (Minutes)"
            placeholder="60"
            keyboardType="number-pad"
            value={readyMinutes}
            onChangeText={setReadyMinutes}
          />
          <Button
            variant="default"
            loading={isSettingReadyTime}
            onPress={handleSetReadyTime}
            style={{ marginTop: 10 }}
          >
            Confirm Ready Time
          </Button>
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
  statusBanner: {
    padding: 16,
    marginBottom: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  placedDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  bannerActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemImgBox: {
    height: 44,
    width: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.emerald,
  },
});
