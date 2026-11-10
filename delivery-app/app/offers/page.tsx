"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeToConfirm } from "@/components/delivery/SwipeToConfirm";
import { InteractiveRouteMap } from "@/components/delivery/InteractiveRouteMap";
import {
  Radio,
  Clock,
  MapPin,
  TrendingUp,
  Store,
  User,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Package,
} from "lucide-react";

interface OfferItem {
  assignmentId: string;
  deliveryId: string;
  offeredAt: string;
  expiresAt: string;
  delivery: {
    id: string;
    trackingNumber: string;
    pickupContactName?: string;
    pickupAddress: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    dropoffContactName?: string;
    dropoffAddress: string;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    distanceKm?: number;
    durationMins?: number;
    riderPayoutAmountPaise: number;
    totalAmountPaise: number;
    packageDescription?: string;
  };
}

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every second to update countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await apiClient.get("/api/delivery/offers");
      if (res.data?.offers) {
        setOffers(res.data.offers);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
    const poll = setInterval(fetchOffers, 4000);
    return () => clearInterval(poll);
  }, []);

  const handleAccept = async (jobId: string) => {
    setActingOnId(jobId);
    setError(null);
    try {
      const res = await apiClient.post(`/api/delivery/jobs/${jobId}/accept`);
      if (res.data?.success || res.data?.delivery) {
        router.push(`/delivery/${jobId}`);
      } else {
        fetchOffers();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept offer. It may have expired.");
      fetchOffers();
    } finally {
      setActingOnId(null);
    }
  };

  const handleReject = async (jobId: string) => {
    setActingOnId(jobId);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${jobId}/reject`);
      fetchOffers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to decline offer");
      fetchOffers();
    } finally {
      setActingOnId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8 relative overflow-hidden">
      {/* Subtle monochrome ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-medium">Live Dispatch Radar</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs">Scanning for active offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" />
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white shadow-xl">
                <Radio className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Searching for jobs near you...</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Make sure you remain Online with your location enabled. When an order requires delivery in your active operational district, it will pop up here with a 30-second countdown.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-zinc-300" />
                Active Delivery Offers ({offers.length})
              </h1>
              <span className="text-xs text-zinc-400">Accept before timer expires</span>
            </div>

            {offers.map((item) => {
              const expiresTimestamp = new Date(item.expiresAt).getTime();
              const secondsLeft = Math.max(0, Math.ceil((expiresTimestamp - now) / 1000));
              const progressPct = Math.min(100, (secondsLeft / 30) * 100);
              const isExpired = secondsLeft <= 0;

              return (
                <div
                  key={item.assignmentId}
                  className={`bg-white/[0.025] border rounded-3xl p-6 space-y-5 shadow-2xl backdrop-blur-xl transition-all ${
                    isExpired
                      ? "opacity-40 border-white/[0.04]"
                      : "border-white/[0.12]"
                  }`}
                >
                  {/* Timer Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                        <Clock className="w-3.5 h-3.5" />
                        {secondsLeft}s remaining
                      </span>
                      <span className="font-mono text-zinc-500 text-[11px]">
                        Order #{item.delivery.trackingNumber || item.delivery.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Pricing & Earnings Banner */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                        Estimated Rider Payout
                      </span>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-1 mt-0.5">
                        <span>₹{(item.delivery.riderPayoutAmountPaise / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                        Est. Distance
                      </span>
                      <p className="text-base font-bold text-white">
                        {item.delivery.distanceKm ? `${item.delivery.distanceKm} km` : "3-5 km"}
                      </p>
                      <span className="text-[10px] text-zinc-500">
                        ~{item.delivery.durationMins || 15} mins
                      </span>
                    </div>
                  </div>

                  {/* Route Visual preview */}
                  <InteractiveRouteMap
                    pickupAddress={item.delivery.pickupAddress}
                    dropoffAddress={item.delivery.dropoffAddress}
                    pickupLat={item.delivery.pickupLatitude || 12.2958}
                    pickupLng={item.delivery.pickupLongitude || 76.6394}
                    dropoffLat={item.delivery.dropoffLatitude || 12.3106}
                    dropoffLng={item.delivery.dropoffLongitude || 76.6548}
                    distanceKm={item.delivery.distanceKm || 3.5}
                    durationMins={item.delivery.durationMins || 15}
                    stepName="TO_PICKUP"
                  />

                  {/* Pickup & Dropoff details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                      <Store className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                          Pickup Store / Seller
                        </span>
                        <p className="text-xs font-semibold text-white mt-0.5">
                          {item.delivery.pickupContactName || "Partner Store"}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {item.delivery.pickupAddress}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                      <User className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                          Dropoff Customer
                        </span>
                        <p className="text-xs font-semibold text-white mt-0.5">
                          {item.delivery.dropoffContactName || "Customer"}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          {item.delivery.dropoffAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Accept or Decline */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={isExpired || actingOnId === item.deliveryId}
                      onClick={() => handleAccept(item.deliveryId)}
                      className="w-full py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <span>{actingOnId === item.deliveryId ? "Accepting Job..." : "Accept Delivery Job"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isExpired || actingOnId === item.deliveryId}
                      onClick={() => handleReject(item.deliveryId)}
                      className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline Offer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav offersCount={offers.length} />
    </div>
  );
}
