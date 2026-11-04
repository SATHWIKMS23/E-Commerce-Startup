import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";
import SessionProvider from "@/lib/providers/SessionProvider";
import { BrandingProvider } from "@/lib/providers/BrandingProvider";
import { ChatSocketProvider } from "@/features/chat/context/ChatSocketContext";
import { AppShell } from "@/shared/components/AppShell";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { ComingSoonDialog } from "@/components/ui/ComingSoonDialog";
import { PremiumDialogContainer } from "@/components/ui/PremiumDialogContainer";
import { AddressSelectorDialog } from "@/components/ui/AddressSelectorDialog";
import { FloatingSupportWidget } from "@/components/ui/FloatingSupportWidget";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, "");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const FALLBACK_METADATA: Metadata = {
  title: {
    default: "AtlasBasket",
    template: "%s | AtlasBasket",
  },
  description: "Discover local artisans, handcrafted items, and custom products on AtlasBasket.",
};

export async function generateMetadata(): Promise<Metadata> {
  if (!BACKEND_URL) return FALLBACK_METADATA;
  try {
    const res = await fetch(`${BACKEND_URL}/api/branding/public?app=customer`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return FALLBACK_METADATA;
    const b = await res.json();
    const seoTitle = typeof b?.seoTitle === "string" && b.seoTitle.trim() !== ""
      ? b.seoTitle.trim()
      : "AtlasBasket";
    const seoDescription = typeof b?.seoDescription === "string" && b.seoDescription.trim() !== ""
      ? b.seoDescription.trim()
      : "Discover local artisans, handcrafted items, and custom products on AtlasBasket.";
    const brandName = typeof b?.name === "string" && b.name.trim() !== "" ? b.name.trim() : "AtlasBasket";
    const browserTitle = typeof b?.browserTitle === "string" && b.browserTitle.trim() !== ""
      ? b.browserTitle.trim()
      : brandName;
    return {
      title: {
        default: browserTitle || seoTitle,
        template: `%s | ${browserTitle || seoTitle}`,
      },
      description: seoDescription,
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <SessionProvider>
          <ReactQueryProvider>
            <BrandingProvider>
              <ChatSocketProvider>
                <AppShell>
                  {children}
                </AppShell>
                <CartDrawer />
                <ComingSoonDialog />
                <AddressSelectorDialog />
                <PremiumDialogContainer />
                <FloatingSupportWidget />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#18181b',
                      color: '#f4f4f5',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      zIndex: 99999,
                    },
                  }}
                  containerStyle={{
                    top: 24,
                    right: 24,
                    zIndex: 99999,
                  }}
                />
              </ChatSocketProvider>
            </BrandingProvider>
          </ReactQueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
