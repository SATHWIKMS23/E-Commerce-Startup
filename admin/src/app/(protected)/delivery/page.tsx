import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliveryPage } from "@/features/delivery/ui/DeliveryPage";

export const metadata: Metadata = { title: "Delivery Management — Admin" };

export default function DeliveryRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-white/40">Loading Delivery Operations...</div>}>
      <DeliveryPage />
    </Suspense>
  );
}
