import { Footer } from '@/shared/components/Footer';
import { HomePage } from '@/features/home/ui/HomePage';

export default function Home() {
  return (
    <main className="bg-zinc-950/20 min-h-[calc(100dvh-64px)] flex flex-col justify-between animate-fade-in">
      <div className="flex-1">
        <HomePage />
      </div>
      <Footer />
    </main>
  );
}

