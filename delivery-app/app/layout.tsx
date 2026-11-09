import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AtlasBasket Delivery — Local Delivery Fleet",
  description:
    "Deliver with AtlasBasket in Mysuru. Flexible hours, fair payouts, and real-time navigation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-slate-100 min-h-screen antialiased flex flex-col selection:bg-blue-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
