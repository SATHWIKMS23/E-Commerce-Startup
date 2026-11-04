import { Button } from '@/shared/components/Button';
import { CheckCircle, ArrowRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';

interface SuccessPageProps {
  searchParams: Promise<{ orderNumber?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedParams = await searchParams;
  return (
    <main className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-zinc-950/20 p-6">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <CheckCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Order Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            Your payment was verified, and your order has been successfully placed.
          </p>
        </div>

        {resolvedParams.orderNumber && (
          <div className="bg-zinc-950/40 p-4 border border-border rounded-xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase block">Order Reference</span>
            <span className="text-base font-extrabold text-foreground tracking-wider">{resolvedParams.orderNumber}</span>
          </div>
        )}

        <div className="grid gap-3 pt-4">
          <Link href="/orders">
            <Button className="w-full flex items-center justify-center gap-2 cursor-pointer py-5">
              <ClipboardList className="h-4 w-4" />
              View Order History
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full flex items-center justify-center gap-2 cursor-pointer py-5">
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
