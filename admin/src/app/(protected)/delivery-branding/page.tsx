import type { Metadata } from "next";
import { DeliveryBrandingPage } from "@/features/branding/ui/DeliveryBrandingPage";

export const metadata: Metadata = {
  title: "Delivery Branding — Admin",
  description: "Configure AtlasBasket Delivery brand identity, navbar title & logo, landing stat cards, and active cities.",
};

export default function DeliveryBrandingRoute() {
  return <DeliveryBrandingPage />;
}
