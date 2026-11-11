'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '../hooks/useOrders';
import { useFileUpload } from '../../storage/hooks/useFileUpload';
import { ordersService } from '../services/ordersService';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { DateTimePicker } from '@/shared/components/DateTimePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { SellerInvoice } from './SellerInvoice';
import {
  ArrowLeft,
  AlertTriangle,
  User,
  MapPin,
  CheckCircle,
  Clock,
  Upload,
  FileCheck,
  Truck,
  Package,
  Download,
  Printer,
} from 'lucide-react';

export function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();

  const {
    order,
    isLoadingDetails,
    isErrorDetails,
    errorDetails,
    timeline,
    allowedDeliveryMethods,
    acceptOrder,
    isAccepting,
    rejectOrder,
    isRejecting,
    setReadyTime: submitReadyTime,
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
    downloadShippingLabel,
    isDownloadingShippingLabel,
    downloadInvoice,
    isDownloadingInvoice,
  } = useOrders(orderId);

  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const handleMarkCodCollected = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      await markCodCollected(order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark COD as collected.');
    }
  };

  const handleDownloadShippingLabel = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      const blob = await downloadShippingLabel(order.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `shipping-label-${order?.order?.orderNumber || order.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download shipping label.');
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      const blob = await downloadInvoice(order.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${order?.order?.orderNumber || order.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download invoice.');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const { upload: uploadProofImage, isUploading, progress: uploadProgress } = useFileUpload({ folder: 'packing-proof' });

  // Modals / States
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [readyOpen, setReadyOpen] = useState(false);
  const [readyTime, setReadyTime] = useState<Date | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofNote, setProofNote] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const showToast = useUIStore((state) => state.showToast);

  if (isLoadingDetails) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (isErrorDetails) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500/50" />
          <h3 className="text-base font-bold text-white/80">Error Loading Order</h3>
          <p className="text-xs text-white/40">{errorDetails?.message || 'An unexpected error occurred'}</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
            Back to Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-3">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500/50" />
          <h3 className="text-base font-bold text-white/80">Order Not Found</h3>
          <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
            Back to Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Handle Actions
  const handleAccept = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      await acceptOrder(order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept order.');
    }
  };

  const handleReject = async () => {
    if (!order || !rejectReason.trim()) return;
    setErrorMsg(null);
    try {
      await rejectOrder({ id: order.id, reason: rejectReason });
      setRejectOpen(false);
      setRejectReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject order.');
    }
  };

  const handleReadyTimeSubmit = async () => {
    if (!order || !readyTime) return;
    setErrorMsg(null);
    try {
      await submitReadyTime({ id: order.id, readyByAt: readyTime.toISOString() });
      setReadyOpen(false);
      setReadyTime(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update preparation time.');
    }
  };

  const handleProofImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadProofImage(file);
      if (result) setProofImages((prev) => [...prev, result.url]);
    } catch (err: any) {
      showToast(err.message || 'Packing proof upload failed');
    }
  };

  const handleProofSubmit = async () => {
    if (!order || proofImages.length === 0) return;
    setErrorMsg(null);
    try {
      await uploadPackingProof({ id: order.id, imageUrls: proofImages, notes: proofNote });
      setProofOpen(false);
      setProofNote('');
      setProofImages([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit packing proof details.');
    }
  };

  const handleMarkPacked = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      await markPacked(order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark order as packed.');
    }
  };

  const handleMarkShipped = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      await markShipped(order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark order as shipped.');
    }
  };

  const handleMarkDelivered = async () => {
    if (!order) return;
    setErrorMsg(null);
    try {
      await markDelivered(order.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark order as delivered.');
    }
  };

  const handleAssignDeliveryMethod = async () => {
    if (!order || !selectedDeliveryMethod) return;
    setDeliveryError(null);
    try {
      await assignDeliveryMethod({ id: order.id, deliveryMethod: selectedDeliveryMethod });
      setSelectedDeliveryMethod('');
    } catch (err: any) {
      setDeliveryError(err.message || 'Failed to assign delivery method.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl animate-fade-up">
        {/* Back Link */}
        <button
          onClick={() => router.push('/orders')}
          className="inline-flex items-center text-xs font-semibold text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          <span>Back to Order Records</span>
        </button>

        {/* Title and Badge */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white/95">
                Order {order?.order?.orderNumber}
              </h1>
              <Badge variant={ordersService.getStatusColor(order.status)} className="text-[9px]">
                {order.status}
              </Badge>
            </div>
            <p className="text-[11px] text-white/35">
              Placed on {ordersService.formatDate(order.createdAt)}
            </p>
          </div>

          {/* Core Status Transitions Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {errorMsg && (
              <span className="text-[10px] text-red-400 font-bold max-w-xs">{errorMsg}</span>
            )}

            {order.status === 'PENDING' && (
              <>
                <Button onClick={handleAccept} isLoading={isAccepting} size="sm">
                  Accept Order
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={isAccepting}
                >
                  Reject Order
                </Button>
              </>
            )}

            {(order.status === 'PROCESSING' || order.status === 'ACCEPTED') && (
              <>
                <Button variant="outline" size="sm" onClick={() => setReadyOpen(true)}>
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  <span>Set Preparation Time</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setProofOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  <span>Upload Proof</span>
                </Button>
                <Button
                  onClick={handleMarkPacked}
                  isLoading={isMarkingPacked}
                  disabled={!order.packingProof}
                  size="sm"
                >
                  Mark as Packed
                </Button>
              </>
            )}

            {order.status === 'PACKED' && (
              <Button onClick={handleMarkShipped} isLoading={isMarkingShipped} size="sm">
                <Truck className="mr-1.5 h-3.5 w-3.5" />
                <span>Mark as Shipped</span>
              </Button>
            )}

            {order.status === 'SHIPPED' && (
              <Button onClick={handleMarkDelivered} isLoading={isMarkingDelivered} size="sm">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>Mark as Delivered</span>
              </Button>
            )}

            {order.status === 'DELIVERED' &&
              (order.paymentMethod === 'COD' || order?.order?.paymentMethod === 'COD') &&
              !(order?.order?.codCollected || order?.order?.payments?.[0]?.status === 'PAID' || order?.order?.payments?.[0]?.status === 'COMPLETED') && (
                <Button
                  onClick={handleMarkCodCollected}
                  isLoading={isMarkingCodCollected}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  <span>Mark COD Collected</span>
                </Button>
              )}

            {order.status === 'DELIVERED' &&
              (order.paymentMethod === 'COD' || order?.order?.paymentMethod === 'COD') &&
              (order?.order?.codCollected || order?.order?.payments?.[0]?.status === 'PAID' || order?.order?.payments?.[0]?.status === 'COMPLETED') && (
                <Badge variant="success" className="text-[10px] px-3 py-1">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  COD Collected
                </Badge>
              )}

            {order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadInvoice}
                  isLoading={isDownloadingInvoice}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  <span>Download Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadShippingLabel}
                  isLoading={isDownloadingShippingLabel}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  <span>Download Shipping Label</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Details columns */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Products Table Card */}
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-xs font-bold text-white/90">Ordered Products</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="h-10 w-10 border border-white/10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                            {item?.product?.imageUrl ? (
                              <img src={item.product.imageUrl} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4.5 w-4.5 text-white/30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-white/90 text-xs">
                          {item?.product?.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {productService.formatPrice(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-xs text-white/70">{item.quantity}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-white/90">
                          {productService.formatPrice(Number(item.totalPrice))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Invoice Preview */}
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xs font-bold text-white/90">Invoice Preview</CardTitle>
                  <CardDescription>Printable tax invoice for this order</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </Button>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <SellerInvoice order={order} />
              </CardContent>
            </Card>

            {/* Packaging Proof Display */}
            {order.packingProof && (
              <Card className="border border-white/5">
                <CardHeader>
                  <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-purple-400" />
                    <span>Packing Proof & Notes</span>
                  </CardTitle>
                  <CardDescription>Visual packing confirmation uploaded before transit</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {order.packingProof.imageUrls.map((url, idx) => (
                      <div key={idx} className="aspect-video border border-white/10 rounded-lg overflow-hidden bg-white/5">
                        <img src={url} alt={`Proof asset ${idx + 1}`} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                  {order.packingProof.notes && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
                      <span className="font-bold text-[10px] text-white/40 block mb-0.5 uppercase">Seller Notes</span>
                      {order.packingProof.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Panel */}
          <div className="space-y-6">
            {/* Delivery Method Assignment */}
            {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'PROCESSING') && (
              <Card className="border border-white/5">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-400" />
                    <span>Delivery Method</span>
                  </CardTitle>
                  <CardDescription>Assign a delivery method for this order</CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  {order.selectedDeliveryMethod ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">
                          {order.selectedDeliveryMethod === 'PORTAL_DELIVERY' ? 'Portal Delivery' : 'Seller Delivery'}
                        </span>
                      </div>
                      {order.deliveryAssignedAt && (
                        <p className="text-[10px] text-white/40 mt-1.5 ml-6">
                          Assigned on {ordersService.formatDate(order.deliveryAssignedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedDeliveryMethod}
                        onChange={(e) => setSelectedDeliveryMethod(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
                      >
                        <option value="" disabled className="bg-[#0b0b0f] text-white">Select delivery method...</option>
                        {allowedDeliveryMethods
                          .filter((m) => m.enabled)
                          .map((m) => (
                            <option key={m.code} value={m.code} className="bg-[#0b0b0f] text-white">
                              {m.name}
                            </option>
                          ))}
                      </select>
                      {deliveryError && (
                        <p className="text-[10px] text-red-400 font-bold">{deliveryError}</p>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleAssignDeliveryMethod}
                        disabled={!selectedDeliveryMethod || isAssigningDeliveryMethod}
                        isLoading={isAssigningDeliveryMethod}
                      >
                        <Truck className="mr-1.5 h-3.5 w-3.5" />
                        <span>Assign Delivery Method</span>
                      </Button>
                      <p className="text-[9px] text-white/30 text-center">Choose before processing the order</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer & Address Details */}
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  <span>Buyer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <span className="text-[10px] text-white/45 uppercase font-bold block">Contact Email</span>
                  <span className="text-xs font-medium text-white/90 block mt-0.5">
                    {order?.order?.customerEmail || 'No email shared'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/45 uppercase font-bold block">Contact Phone</span>
                  <span className="text-xs font-medium text-white/90 block mt-0.5">
                    {order?.order?.customerPhone || 'No phone shared'}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-3.5">
                  <span className="text-[10px] text-white/45 uppercase font-bold block flex items-center gap-1.5 mb-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Shipping Address</span>
                  </span>
                  {order?.order?.shippingAddress ? (
                    <div className="text-xs text-white/70 leading-relaxed font-medium">
                      <p className="font-bold text-white">{order.order.shippingAddress.fullName}</p>
                      <p>{order.order.shippingAddress.addressLine1}</p>
                      {order.order.shippingAddress.addressLine2 && <p>{order.order.shippingAddress.addressLine2}</p>}
                      <p>
                        {order.order.shippingAddress.city}, {order.order.shippingAddress.state} {order.order.shippingAddress.postalCode}
                      </p>
                      <p className="text-white/40 mt-1 uppercase text-[10px]">{order.order.shippingAddress.country}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-white/35">No shipping address recorded.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preparation details */}
            {order.readyByAt && (
              <Card className="border border-white/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 uppercase font-bold block">Estimated Ready By</span>
                    <span className="text-xs font-bold text-white/90 mt-0.5 block">
                      {ordersService.formatDate(order.readyByAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Timeline events */}
            <Card className="border border-white/5">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold text-white/90">Preparation Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {timeline.length > 0 ? (
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-[1px] before:bg-white/5">
                    {timeline.map((event: any, index: number) => (
                      <div key={index} className="flex gap-4 relative">
                        <div className="h-6 w-6 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center shrink-0 z-10 text-[9px] font-bold text-white/60">
                          {index + 1}
                        </div>
                        <div className="space-y-0.5">
                          <h6 className="text-xs font-bold text-white/90">{event.title}</h6>
                          <p className="text-[10px] text-white/40 leading-relaxed">{event.description}</p>
                          <span className="text-[9px] text-white/30 block font-medium">
                            {ordersService.formatDate(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-white/30 text-center py-4">No timeline logged yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog
          isOpen={rejectOpen}
          onClose={() => {
            setRejectOpen(false);
            setRejectReason('');
          }}
          title="Reject Order Request"
          description="Enter a reason explaining why you must decline this custom order request"
        >
          <div className="space-y-4">
            <textarea
              placeholder="e.g. Requested shipping address is too remote or item specification exceeds craft limits..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[90px] border border-white/10"
            />
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectReason.trim().length < 5 || isRejecting}
              isLoading={isRejecting}
            >
              Confirm Decline Order
            </Button>
          </div>
        </Dialog>

        {/* Set Ready Time Dialog */}
        <Dialog
          isOpen={readyOpen}
          onClose={() => {
            setReadyOpen(false);
            setReadyTime(null);
          }}
          title="Est. Prep & Readiness Time"
          description="Confirm when this order will be packaged and ready for carrier pickup"
        >
          <div className="space-y-4">
            <DateTimePicker value={readyTime} onChange={setReadyTime} />
            <Button
              className="w-full"
              onClick={handleReadyTimeSubmit}
              disabled={!readyTime || isSettingReadyTime}
              isLoading={isSettingReadyTime}
            >
              Save Preparation Time
            </Button>
          </div>
        </Dialog>

        {/* Upload Packing Proof Dialog */}
        <Dialog
          isOpen={proofOpen}
          onClose={() => {
            setProofOpen(false);
            setProofImages([]);
            setProofNote('');
          }}
          title="Fulfillment Packing Proof"
          description="Upload visual verification matching items with labels before courier pickup"
        >
          <div className="space-y-4">
            {/* Previews */}
            {proofImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {proofImages.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <img src={img} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 border border-white/5 bg-white/[0.01] rounded-xl p-4">
              <label className="relative flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold glass text-white/80 hover:text-white hover:border-white/20 transition-all cursor-pointer w-full">
                <Upload className="h-4 w-4" />
                <span>Upload packing proof image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {isUploading && (
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-purple-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-white/60 ml-1">Fulfillment Notes</label>
              <textarea
                placeholder="Include box dimensions, serial tracking labels, fragile material warnings..."
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                rows={2}
                className="glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[60px] border border-white/10"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleProofSubmit}
              disabled={proofImages.length === 0 || isUploadingProof}
              isLoading={isUploadingProof}
            >
              Save Packing Proof
            </Button>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
