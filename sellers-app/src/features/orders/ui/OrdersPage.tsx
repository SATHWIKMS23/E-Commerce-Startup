'use client';

import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { ordersService } from '../services/ordersService';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, ShoppingBag, Eye, AlertTriangle, RefreshCw, Download, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SellerOrder } from '../api/ordersApi';

export function OrdersPage() {
  const { orders, isLoading, isError, refetch, downloadInvoice, isDownloadingInvoice, downloadShippingLabel, isDownloadingShippingLabel } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);

  const handleRowClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadInvoice = async (ord: SellerOrder) => {
    try {
      const blob = await downloadInvoice(ord.id);
      downloadBlob(blob, `invoice-${ord.order.orderNumber}.pdf`);
    } catch (err: any) {
      showToast(err.message || 'Failed to download invoice.', 'error');
    }
  };

  const handleDownloadShippingLabel = async (ord: SellerOrder) => {
    try {
      const blob = await downloadShippingLabel(ord.id);
      downloadBlob(blob, `shipping-label-${ord.order.orderNumber}.pdf`);
    } catch (err: any) {
      showToast(err.message || 'Failed to download shipping label.', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order.customerEmail && o.order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.order.shippingAddress?.fullName &&
        o.order.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Order Management</h1>
          <p className="text-xs text-white/45">Fulfill custom and catalog orders, verify packaging proofs, and update transit status.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          {/* Search */}
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search by order number or customer email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 pl-0 md:pl-4">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`h-8 px-3 rounded-lg text-[10px] uppercase font-extrabold tracking-wide transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    : 'text-white/45 hover:text-white/80 hover:bg-white/[0.02]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List Container */}
        <Card className="border border-white/5 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-400/60" />
                <p className="text-sm font-semibold text-red-400">Failed to load order records.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mx-auto">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Retry Load
                </Button>
              </div>
            ) : filteredOrders.length > 0 ? (
              <>
                {/* ── MOBILE VIEW: ORDER CARDS (< md) ── */}
                <div className="block md:hidden p-4 space-y-4">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => handleRowClick(ord.id)}
                      className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer space-y-3"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <span className="font-extrabold text-white/95 text-xs tracking-wide">
                          {ord.order.orderNumber}
                        </span>
                        <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[9px] py-0.5 px-2 font-bold uppercase">
                          {ord.status}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Customer */}
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-bold uppercase text-white/40 block">Customer</span>
                          <span className="font-semibold text-white/90 block truncate">
                            {ord.order.shippingAddress?.fullName || 'Customer'}
                          </span>
                          {ord.order.customerEmail && (
                            <span className="text-[10px] text-white/40 block truncate">
                              {ord.order.customerEmail}
                            </span>
                          )}
                        </div>

                        {/* Purchase Date */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-white/40 block">Purchase Date</span>
                          <span className="text-white/70 block">
                            {ordersService.formatDate(ord.createdAt)}
                          </span>
                        </div>

                        {/* Payment & Delivery Badges */}
                        <div className="col-span-2 flex flex-wrap items-center gap-1.5 pt-1">
                          <Badge variant="outline" className="text-[9px] font-bold">
                            {ord.paymentMethod === 'COD' || ord.order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Razorpay Online'}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] font-semibold">
                            {ord.selectedDeliveryMethod === 'SELF_DELIVERY' ? 'Seller Delivery' : 'Portal Delivery'}
                          </Badge>
                        </div>

                        {/* Items */}
                        <div className="col-span-2 space-y-0.5 border-t border-white/5 pt-2">
                          <span className="text-[10px] font-bold uppercase text-white/40 block">Items Ordered</span>
                          <span className="text-white/80 font-medium block">
                            {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}:{' '}
                            <span className="text-white/50 text-[11px]">
                              {ord.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                            </span>
                          </span>
                        </div>

                        {/* Amount */}
                        <div className="col-span-2 flex items-center justify-between border-t border-white/5 pt-3">
                          <span className="text-xs font-bold text-white/45">Grand Total</span>
                          <span className="text-sm font-extrabold text-white/95">
                            {productService.formatPrice(ord.totalPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-h-[36px] text-xs font-semibold"
                          onClick={() => handleDownloadInvoice(ord)}
                          disabled={isDownloadingInvoice}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                          <span>Invoice</span>
                        </Button>
                        {ord.status !== 'PENDING' && ord.status !== 'CANCELLED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-h-[36px] text-xs font-semibold"
                            onClick={() => handleDownloadShippingLabel(ord)}
                            disabled={isDownloadingShippingLabel}
                          >
                            <Truck className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                            <span>Label</span>
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full sm:flex-1 min-h-[36px] text-xs font-bold"
                          onClick={() => handleRowClick(ord.id)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          <span>View Detail →</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── DESKTOP VIEW: TABLE (>= md) ── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Purchased Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Delivery Method</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Grand Total</TableHead>
                        <TableHead>Fulfillment Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((ord) => (
                        <TableRow
                          key={ord.id}
                          className="cursor-pointer"
                          onClick={() => handleRowClick(ord.id)}
                        >
                          <TableCell className="font-bold text-white/95 text-xs">
                            {ord.order.orderNumber}
                          </TableCell>
                          <TableCell className="text-xs text-white/70 min-w-0">
                            <span className="block font-semibold text-white/85 break-words">
                              {ord.order.shippingAddress?.fullName || 'Customer'}
                            </span>
                            {ord.order.customerEmail && (
                              <span className="block text-[10px] text-white/40 break-words">
                                {ord.order.customerEmail}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-white/50">
                            {ordersService.formatDate(ord.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] font-bold">
                              {ord.paymentMethod === 'COD' || ord.order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Razorpay'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[8px] font-semibold">
                              {ord.selectedDeliveryMethod === 'SELF_DELIVERY' ? 'Seller Delivery' : 'Portal Delivery'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-white/70">
                            {ord.items.length} {ord.items.length === 1 ? 'item' : 'items'}:{' '}
                            <span className="text-[11px] text-white/40 block mt-0.5 line-clamp-1">
                              {ord.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-white/95">
                            {productService.formatPrice(ord.totalPrice)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[8px] py-0 px-2 font-bold">
                              {ord.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px]"
                                onClick={() => handleDownloadInvoice(ord)}
                                disabled={isDownloadingInvoice}
                              >
                                <Download className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                                <span>Invoice</span>
                              </Button>
                              {ord.status !== 'PENDING' && ord.status !== 'CANCELLED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-[11px]"
                                  onClick={() => handleDownloadShippingLabel(ord)}
                                  disabled={isDownloadingShippingLabel}
                                >
                                  <Truck className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                                  <span>Label</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-[11px]"
                                onClick={() => handleRowClick(ord.id)}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5 text-white/60" />
                                <span>View Detail</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white/60">No orders found</h4>
                <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  No order entries match your selected status filter or search parameters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
