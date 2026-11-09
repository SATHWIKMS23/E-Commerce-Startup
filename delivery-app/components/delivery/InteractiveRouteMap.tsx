"use client";

import React from "react";
import { MapPin, Navigation, Compass, Store, User } from "lucide-react";

interface InteractiveRouteMapProps {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  currentLat?: number;
  currentLng?: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  distanceKm?: number;
  durationMins?: number;
  navigationUrl?: string;
  stepName?: "TO_PICKUP" | "TO_DROPOFF" | "COMPLETED";
}

export function InteractiveRouteMap({
  pickupLat = 12.2958,
  pickupLng = 76.6394,
  dropoffLat = 12.3106,
  dropoffLng = 76.6548,
  pickupAddress = "Shop Pickup Point",
  dropoffAddress = "Customer Delivery Address",
  distanceKm = 3.5,
  durationMins = 12,
  navigationUrl,
  stepName = "TO_PICKUP",
}: InteractiveRouteMapProps) {
  const targetDestination = stepName === "TO_PICKUP" ? "Pickup Location" : "Customer Location";
  const defaultNavUrl =
    navigationUrl ||
    (stepName === "TO_PICKUP"
      ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${dropoffLat},${dropoffLng}`);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl">
      {/* Visual Stylized Map Canvas */}
      <div className="relative h-48 sm:h-56 w-full bg-slate-900/90 overflow-hidden flex items-center justify-center">
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Curved Route Visual Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <path
            d="M 60 140 Q 180 40, 320 100 T 460 70"
            fill="none"
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth="4"
            strokeDasharray="6,6"
            className="animate-pulse"
          />
        </svg>

        {/* Shop Pickup Pin */}
        <div className="absolute left-[15%] top-[55%] flex flex-col items-center animate-bounce-slow">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg backdrop-blur-md">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-amber-300 mt-1 bg-black/70 px-2 py-0.5 rounded-full border border-amber-500/30">
            Pickup
          </span>
        </div>

        {/* Customer Dropoff Pin */}
        <div className="absolute right-[15%] top-[25%] flex flex-col items-center">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg backdrop-blur-md">
            <User className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-emerald-300 mt-1 bg-black/70 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Customer
          </span>
        </div>

        {/* Floating live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-medium text-white/90">Live Route • Mysuru</span>
        </div>

        {/* Speed / ETA pill */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
          <Compass className="h-3.5 w-3.5 text-blue-400" />
          <span>
            <strong>{distanceKm} km</strong> • ~{durationMins} mins
          </span>
        </div>
      </div>

      {/* Map Action Banner */}
      <div className="p-4 bg-slate-900/95 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold uppercase tracking-wider">
            <MapPin className="h-3 w-3" />
            <span>Target: {targetDestination}</span>
          </div>
          <p className="text-xs text-white/70 line-clamp-1 font-medium">
            {stepName === "TO_PICKUP" ? pickupAddress : dropoffAddress}
          </p>
        </div>

        <a
          href={defaultNavUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Open Google Navigation</span>
        </a>
      </div>
    </div>
  );
}
