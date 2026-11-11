import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/lib/providers/SessionProvider';
import ReactQueryProvider from '@/lib/providers/ReactQueryProvider';
import { ToastContainer } from '@/shared/components/ToastContainer';
import { ComingSoonDialog } from '@/components/ui/ComingSoonDialog';
import { PremiumDialogContainer } from '@/components/ui/PremiumDialogContainer';
import { GuidelineAcceptanceModal } from '@/components/ui/GuidelineAcceptanceModal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'AtlasBasket Seller Portal',
    template: '%s | AtlasBasket Seller Portal',
  },
  description: 'Manage your shop, products, orders, and sales on AtlasBasket.',
  icons: {
    icon: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark bg-background text-foreground ${inter.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-purple-500/20 selection:text-purple-300">
        <SessionProvider>
          <ReactQueryProvider>
            {children}
            <ToastContainer />
            <ComingSoonDialog />
            <PremiumDialogContainer />
            <GuidelineAcceptanceModal />
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
