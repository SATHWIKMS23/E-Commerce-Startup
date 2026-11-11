'use client';

import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { ordersService } from '@/features/orders/services/ordersService';
import { productService } from '@/features/products/services/productService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  IndianRupee,
  Plus,
  Store,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSellerLayout } from '@/lib/hooks/useSellerLayout';
import { SellerAgreementBanner } from '@/features/shop/ui/SellerAgreementBanner';

export function DashboardPage() {
  const { user } = useAuth();
  const { hasShop, shop } = useShop();
  const { metrics, chartData, isLoadingMetrics } = useAnalytics();
  const { orders, isLoading: isLoadingOrders } = useOrders();
  const router = useRouter();
  const { dashboardCards, quickActions, branding } = useSellerLayout();
  const marketplaceName = branding?.marketplaceName || 'the marketplace';

  const recentOrders = orders.slice(0, 5);

  const allStatsMap: Record<string, any> = {
    'card-gross-sales': {
      id: 'card-gross-sales',
      name: "Gross Sales",
      value: productService.formatPrice(metrics?.totalSales ?? 0),
      icon: IndianRupee,
      desc: 'Cumulative sales (gross)',
      color: 'text-emerald-400',
    },
    'card-net-earnings': {
      id: 'card-net-earnings',
      name: 'Net Earnings',
      value: productService.formatPrice(metrics?.netEarnings ?? 0),
      icon: IndianRupee,
      desc: 'Your share after commission',
      color: 'text-purple-400',
    },
    'card-commission': {
      id: 'card-commission',
      name: 'Platform Commission',
      value: productService.formatPrice(metrics?.platformCommission ?? 0),
      icon: IndianRupee,
      desc: 'Platform commission collected',
      color: 'text-rose-400',
    },
    'card-packing-fee': {
      id: 'card-packing-fee',
      name: 'Packing Fee Collected',
      value: productService.formatPrice(metrics?.packingFeeCollectedLifetime ?? 0),
      icon: IndianRupee,
      desc: `Today: ${productService.formatPrice(metrics?.packingFeeCollectedToday ?? 0)} | This Month: ${productService.formatPrice(metrics?.packingFeeCollectedThisMonth ?? 0)}`,
      color: 'text-teal-400',
    },
    'card-delivered-revenue': {
      id: 'card-delivered-revenue',
      name: 'Delivered Revenue',
      value: productService.formatPrice(metrics?.revenue ?? 0),
      icon: IndianRupee,
      desc: 'Delivered order subtotal',
      color: 'text-blue-400',
    },
    'card-todays-orders': {
      id: 'card-todays-orders',
      name: "Today's Orders",
      value: `${metrics?.todaysOrders ?? 0}`,
      icon: ShoppingBag,
      desc: "Orders placed today",
      color: 'text-indigo-400',
    },
    'card-pending-orders': {
      id: 'card-pending-orders',
      name: 'Pending Orders',
      value: `${metrics?.pendingOrders ?? 0}`,
      icon: Clock,
      desc: 'Orders awaiting processing',
      color: 'text-yellow-400',
    },
    'card-completed-orders': {
      id: 'card-completed-orders',
      name: 'Completed Orders',
      value: `${metrics?.completedOrders ?? 0}`,
      icon: ShoppingBag,
      desc: 'Delivered orders count',
      color: 'text-teal-400',
    },
    'card-cancelled-orders': {
      id: 'card-cancelled-orders',
      name: 'Cancelled Orders',
      value: `${metrics?.cancelledOrders ?? 0}`,
      icon: AlertTriangle,
      desc: 'Cancelled orders count',
      color: 'text-red-400',
    },
  };

  const stats = dashboardCards.length
    ? dashboardCards
        .map((card) => allStatsMap[card.id] || { name: card.name, value: '0', icon: IndianRupee, desc: card.name, color: 'text-purple-400' })
        .filter(Boolean)
    : Object.values(allStatsMap);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-up">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white/95">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-xs text-white/45">Here is what is happening with your store today.</p>
          </div>
          <div className="flex gap-2">
            {hasShop && (
              <>
                <Button onClick={() => router.push('/products')} variant="outline" size="sm">
                  Manage Products
                </Button>
                <Button onClick={() => router.push('/orders')} size="sm">
                  Fulfill Orders
                </Button>
              </>
            )}
          </div>
        </div>

        {!hasShop ? (
          <Card className="border border-purple-500/20 bg-purple-500/5 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-[30%] -right-[10%] h-48 w-48 rounded-full bg-purple-500/10 blur-[60px] pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Create Your Store Profile</h3>
              <p className="text-xs text-white/50 max-w-xl leading-relaxed">
                Ready to start selling on {marketplaceName}? Create your storefront, configure your pick-up address, and link your settlement bank details to list items. You can choose to set up your shop now or continue exploring your profile.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10 w-full md:w-auto">
              <Button onClick={() => router.push('/profile')} variant="outline" className="text-xs font-bold w-full sm:w-auto">
                Go to Profile
              </Button>
              <Button onClick={() => router.push('/shop-setup')} className="text-xs font-bold w-full sm:w-auto">
                Create Shop Now
              </Button>
            </div>
          </Card>
        ) : shop && shop.status !== 'APPROVED' ? (
          <div className="space-y-4">
            <SellerAgreementBanner shopStatus={shop?.status} />
            <Card className="border border-yellow-500/20 bg-yellow-500/5 p-6 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-7 w-7 text-yellow-400 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-white">Your shop is {shop.status === 'PENDING' ? 'awaiting approval' : shop.status === 'REJECTED' ? 'rejected' : shop.status === 'SUSPENDED' ? 'suspended' : 'disabled'}</h3>
                  <p className="text-xs text-white/50 mt-1">
                    {shop.status === 'PENDING' && 'An administrator is reviewing your shop. You can prepare and edit your product catalog, but items will remain unlisted to customers until final approval.'}
                    {shop.status === 'REJECTED' && (shop.rejectionReason ? `Reason: ${shop.rejectionReason}` : 'Your shop application was rejected. Please contact support or update your store.')}
                    {shop.status === 'SUSPENDED' && 'Your shop has been suspended. Please contact support for more information.'}
                    {shop.status === 'DISABLED' && 'Your shop has been disabled by an administrator.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            {isLoadingMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={i} className="border border-white/5 bg-white/[0.01]">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                          {stat.name}
                        </CardTitle>
                        <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <div className="text-xl font-extrabold text-white/90 tracking-tight">{stat.value}</div>
                        <p className="text-[10px] text-white/40 font-medium leading-none">{stat.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Chart & Summary */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Sales chart */}
              <Card className="lg:col-span-2 border border-white/5">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-xs font-bold text-white/90">Revenue Summary</CardTitle>
                  <CardDescription>Daily settled store earnings this month</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-64 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              background: '#07070a',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                            }}
                            labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}
                            itemStyle={{ fontSize: '11px', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center text-center space-y-1.5">
                        <TrendingUp className="h-8 w-8 text-white/10" />
                        <span className="text-[11px] text-white/30 font-medium">No sales logs this month</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions & Overview */}
              <Card className="border border-white/5 flex flex-col justify-between">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-xs font-bold text-white/90">Quick Actions</CardTitle>
                  <CardDescription>Task shortcuts for store management</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="w-full justify-start text-[11px] h-10 border-white/5 hover:bg-white/[0.02]"
                      onClick={() => router.push(action.path || '/dashboard')}
                    >
                      <Plus className="mr-2.5 h-4 w-4 text-purple-400" />
                      <span>{action.name}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent orders */}
            <Card className="border border-white/5 overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-white/90">Recent Incoming Orders</CardTitle>
                  <CardDescription>Most recent customer orders placed on your shop</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/orders')} className="text-[11px]">
                  <span>View All</span>
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingOrders ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : recentOrders.length > 0 ? (
                  <>
                    {/* ── MOBILE VIEW: RECENT ORDER CARDS (< md) ── */}
                    <div className="block md:hidden p-4 space-y-3">
                      {recentOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.04] transition-all"
                          onClick={() => router.push(`/orders/${ord.id}`)}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white/95 text-xs">{ord.order.orderNumber}</span>
                              <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[7.5px] py-0 px-1.5 uppercase">
                                {ord.status}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-white/40 block">
                              {ordersService.formatDate(ord.createdAt)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-white/90 block">
                              {productService.formatPrice(ord.totalPrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── DESKTOP VIEW: TABLE (>= md) ── */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Placed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.map((ord) => (
                            <TableRow key={ord.id} className="cursor-pointer" onClick={() => router.push(`/orders/${ord.id}`)}>
                              <TableCell className="font-bold text-white/90 text-xs">
                                {ord.order.orderNumber}
                              </TableCell>
                              <TableCell>
                                <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[7.5px] py-0">
                                  {ord.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-white/80">
                                {productService.formatPrice(ord.totalPrice)}
                              </TableCell>
                              <TableCell className="text-xs text-white/40">
                                {ordersService.formatDate(ord.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 space-y-2.5">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] text-white/35">No orders received yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
