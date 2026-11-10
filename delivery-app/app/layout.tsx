import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AtlasBasket Delivery — Partner Network",
  description:
    "Deliver with AtlasBasket. Flexible hours, fair payouts, and real-time navigation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07070a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07070a] text-zinc-100 min-h-screen antialiased flex flex-col selection:bg-white/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
