'use client';

import { Footer } from '@/shared/components/Footer';
import { HomePage } from '@/features/home/ui/HomePage';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import Loading from '@/app/loading';

export default function Home() {
  const { isLoading: isBrandingLoading } = useSiteLayout();

  if (isBrandingLoading) {
    return <Loading />;
  }

  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between animate-fade-in">
      <div className="flex-1">
        <HomePage />
      </div>
      <Footer />
    </main>
  );
}

