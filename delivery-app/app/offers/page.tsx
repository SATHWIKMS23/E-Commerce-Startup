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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-300">Live Dispatch Radar</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Scanning for active offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-teal-500/30 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
                <Radio className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Searching for jobs near you...</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Make sure you remain Online with your location enabled. When a seller confirms an order in Mysuru, it will pop up here with a 30-second countdown.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                Active Delivery Offers ({offers.length})
              </h1>
              <span className="text-xs text-slate-400">Accept before timer expires</span>
            </div>

            {offers.map((item) => {
              const expiresTimestamp = new Date(item.expiresAt).getTime();
              const secondsLeft = Math.max(0, Math.ceil((expiresTimestamp - now) / 1000));
              const progressPct = Math.min(100, (secondsLeft / 30) * 100);
              const isExpired = secondsLeft <= 0;

              return (
                <div
                  key={item.assignmentId}
                  className={`bg-slate-900 border rounded-3xl p-6 space-y-6 shadow-2xl transition-all ${
                    isExpired
                      ? "opacity-40 border-slate-800"
                      : "border-emerald-500/40 shadow-emerald-500/10"
                  }`}
                >
                  {/* Timer Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Clock className="w-4 h-4" />
                        {secondsLeft}s remaining
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Order #{item.delivery.trackingNumber || item.delivery.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          secondsLeft > 10 ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Pricing & Earnings Banner */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Estimated Rider Payout
                      </span>
                      <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-1">
                        <span>₹{(item.delivery.riderPayoutAmountPaise / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Est. Distance
                      </span>
                      <p className="text-lg font-bold text-white">
                        {item.delivery.distanceKm ? `${item.delivery.distanceKm} km` : "3-5 km"}
                      </p>
                      <span className="text-[10px] text-slate-500">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                      <Store className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                          Pickup Store / Seller
                        </span>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {item.delivery.pickupContactName || "Partner Store"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {item.delivery.pickupAddress}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                      <User className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                          Dropoff Customer
                        </span>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {item.delivery.dropoffContactName || "Customer"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {item.delivery.dropoffAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Swipe to Accept or Decline */}
                  <div className="space-y-3 pt-2">
                    <SwipeToConfirm
                      label="Swipe to Accept Delivery"
                      confirmedLabel="Accepting Job..."
                      colorScheme="emerald"
                      disabled={isExpired || actingOnId === item.deliveryId}
                      onConfirm={() => handleAccept(item.deliveryId)}
                    />

                    <button
                      type="button"
                      disabled={isExpired || actingOnId === item.deliveryId}
                      onClick={() => handleReject(item.deliveryId)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700 text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <XCircle className="w-4 h-4" />
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
