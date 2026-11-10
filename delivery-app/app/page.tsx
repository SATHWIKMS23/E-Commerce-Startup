"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { apiClient } from "@/lib/apiClient";
import {
  ShieldCheck,
  Clock,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Bike,
  Sparkles,
  MapPin,
  ChevronRight,
  Truck,
  Building2,
} from "lucide-react";

interface PublicSettings {
  brandName: string;
  brandLogoUrl: string | null;
  brandTagline: string;
  activeCity: string;
  activeCities: string[];
  hero: {
    badge: string;
    line1: string;
    line2: string;
    description: string;
  };
  cards: {
    payout: { show: boolean; value: string; label: string; desc: string };
    city: { show: boolean; value: string; label: string; desc: string };
    fee: { show: boolean; value: string; label: string; desc: string };
    vehicles: { show: boolean; value: string; label: string; desc: string };
  };
}

export default function LandingPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/delivery/settings/public")
      .then((res) => {
        if (isMounted && res.data?.settings) {
          setSettings(res.data.settings);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const heroBadge = settings?.hero?.badge || "Now Launching Across Mysuru City";
  const heroHeading1 = settings?.hero?.line1 || "Deliver locally.";
  const heroHeading2 = settings?.hero?.line2 || "Earn directly with every trip.";
  const heroDesc =
    settings?.hero?.description ||
    "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.";

  const activeCitiesList = settings?.activeCities?.length
    ? settings.activeCities
    : [settings?.activeCity || "Mysuru"];

  // Configured Stat Cards (controlled by Admin with Toggle On/Off)
  const cardsConfig = settings?.cards;
  const cardsToDisplay = [
    cardsConfig?.payout?.show !== false && {
      key: "payout",
      value: cardsConfig?.payout?.value || "~90%",
      label: cardsConfig?.payout?.label || "Rider Payout",
      desc: cardsConfig?.payout?.desc || "Direct earnings share",
    },
    cardsConfig?.city?.show !== false && {
      key: "city",
      value: cardsConfig?.city?.value || settings?.activeCity || "Mysuru",
      label: cardsConfig?.city?.label || "Active City",
      desc: cardsConfig?.city?.desc || `${activeCitiesList.join(", ")} zones`,
    },
    cardsConfig?.fee?.show !== false && {
      key: "fee",
      value: cardsConfig?.fee?.value || "₹0 Free",
      label: cardsConfig?.fee?.label || "Registration Fee",
      desc: cardsConfig?.fee?.desc || "No upfront fees",
    },
    cardsConfig?.vehicles?.show !== false && {
      key: "vehicles",
      value: cardsConfig?.vehicles?.value || "Bikes & EVs",
      label: cardsConfig?.vehicles?.label || "Vehicles",
      desc: cardsConfig?.vehicles?.desc || "Bicycles welcome",
    },
  ].filter(Boolean) as Array<{ key: string; value: string; label: string; desc: string }>;

  return (
    <div className="flex flex-col min-h-screen bg-[#07070a] text-zinc-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 pb-14 sm:pt-20 sm:pb-24">
          {/* Single clean subtle monochrome gradient */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-5 sm:space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] sm:text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate max-w-[280px] sm:max-w-none">{heroBadge}</span>
            </div>

            {/* Hero Heading */}
            <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.14]">
              {heroHeading1} <br className="hidden xs:inline" />
              <span className="text-zinc-400 font-medium">
                {" "}{heroHeading2}
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-zinc-400 leading-relaxed font-normal px-2">
              {heroDesc}
            </p>

            {/* Action Buttons (Strictly Shadcn Style: responsive on all screens) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 max-w-xs sm:max-w-none mx-auto w-full">
              <Link
                href="/register"
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Register as a Rider</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center whitespace-nowrap"
              >
                Rider Sign In
              </Link>
            </div>

            {/* Quick Stat Cards (Controlled by Admin with Toggle On/Off) */}
            {cardsToDisplay.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 pt-8 sm:pt-12 max-w-4xl mx-auto w-full">
                {cardsToDisplay.map((stat) => (
                  <div
                    key={stat.key}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl transition-all"
                  >
                    <div className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
                      {stat.value}
                    </div>
                    <div className="text-[11px] sm:text-xs font-medium text-zinc-300 mt-0.5 truncate">
                      {stat.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                      {stat.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Operational Overview & Requirements (Strictly shadcn glassmorphic layout) */}
        <section className="py-16 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Why Deliver with AtlasBasket?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                Built specifically for local riders and neighborhood merchants in {activeCitiesList.join(", ")}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Direct Weekly Payouts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Earn the majority share on every delivery with zero hidden platform cut. Earnings are disbursed automatically to your registered bank account.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Flexible Shifts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Toggle Online when you want to deliver, and Go Offline when you are done. No minimum mandatory hours or penalty for logging off.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Secure OTP Verification</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every pickup and drop-off is cryptographically validated with merchant QR and customer OTPs, ensuring accurate delivery credit.
                </p>
              </div>
            </div>

            {/* Active Coverage Zones */}
            <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Active Operational Zones
                </span>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeCitiesList.map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-medium text-white"
                    >
                      <MapPin className="h-3 w-3 text-zinc-400" />
                      {city}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shrink-0 text-center"
              >
                Apply in {activeCitiesList[0] || "Mysuru"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 bg-[#07070a] text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">
              {settings?.brandName || "AtlasBasket Delivery"}
            </span>
            <span>•</span>
            <span>{activeCitiesList.join(", ")} Fleet</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Rider Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
