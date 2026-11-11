'use client';

import { useAnalytics } from '../hooks/useAnalytics';
import { useProducts } from '@/features/products/hooks/useProducts';
import { productService } from '@/features/products/services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Skeleton } from '@/shared/components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';

export function AnalyticsPage() {
  const { chartData, topSelling, isLoadingTop, isLoadingRevenue } = useAnalytics();
  const { lowStockProducts, isLoadingLowStock } = useProducts();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Deep Store Analytics</h1>
          <p className="text-xs text-white/45">Review sales trends, top product performance, and catalog alerts.</p>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Revenue Bar Chart */}
          <Card className="md:col-span-2 border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Revenue Performance</CardTitle>
              <CardDescription>Daily gross earnings bar chart representation</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-64 w-full">
                {isLoadingRevenue ? (
                  <Skeleton className="h-full w-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center space-y-1.5">
                    <TrendingUp className="h-8 w-8 text-white/10" />
                    <span className="text-[11px] text-white/30 font-medium">No sales record found</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card className="border border-white/5 flex flex-col justify-between">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Top Products</CardTitle>
              <CardDescription>Most popular items sold by quantity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto flex-1 max-h-[260px]">
              {isLoadingTop ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : topSelling.length > 0 ? (
                <div className="space-y-4">
                  {topSelling.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 border border-white/10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-white/20" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-white/90 truncate">
                            {item.product?.name || 'Unknown Product'}
                          </span>
                          <span className="block text-[10px] text-white/40 mt-0.5">
                            {item.quantitySold} units sold
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white/80 shrink-0">
                        {productService.formatPrice(item.product?.price * item.quantitySold)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-white/35">No products sold yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-yellow-500/80" />
              <span>Low Stock Alerts</span>
            </CardTitle>
            <CardDescription>Verify quantities and adjust inventories immediately to keep listings active</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingLowStock ? (
              <div className="p-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : lowStockProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell>
                        <div className="h-9 w-9 border border-white/10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4.5 w-4.5 text-white/30" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-white/90 text-xs">{prod.name}</TableCell>
                      <TableCell className="text-xs font-bold text-yellow-500">{prod.stockQuantity} units</TableCell>
                      <TableCell className="text-xs text-white/80">{productService.formatPrice(prod.price)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-[8px] py-0">
                          {prod.stockQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 space-y-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-[10px] text-white/35">All product inventory quantities are healthy.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
