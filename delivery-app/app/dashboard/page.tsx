"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Bike,
  Power,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Star,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronRight,
  Phone,
  Package,
  Layers,
} from "lucide-react";

interface RiderData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  verificationStatus: string;
  isAvailable: boolean;
  activeDeliveryId?: string | null;
  ratingAverage: number;
  ratingCount: number;
  vehicleType: string;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
}

interface DashboardSummary {
  todayEarnings: number;
  todayCompletedCount: number;
  totalEarnings: number;
  totalCompletedCount: number;
  activeStrikesCount: number;
  pendingOffersCount: number;
  activeDelivery: any | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [rider, setRider] = useState<RiderData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationWatchId = useRef<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [meRes, dashRes] = await Promise.all([
        apiClient.get("/api/delivery/riders/me"),
        apiClient.get("/api/delivery/dashboard"),
      ]);

      if (meRes.data?.rider) {
        setRider(meRes.data.rider);
      }
      if (dashRes.data?.summary) {
        setSummary(dashRes.data.summary);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s refresh for live offers & status
    return () => clearInterval(interval);
  }, []);

  // Periodic GPS location tracker when online
  useEffect(() => {
    if (!rider?.isAvailable) {
      if (locationWatchId.current !== null) {
        navigator.geolocation?.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      return;
    }

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      const sendLocation = (lat: number, lng: number) => {
        apiClient.post("/api/delivery/location", {
          latitude: lat,
          longitude: lng,
        }).catch(() => {});
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn("GPS error:", err.message),
        { enableHighAccuracy: true }
      );

      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
          undefined,
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [rider?.isAvailable]);

  const handleToggleOnline = async () => {
    if (!rider) return;
    if (rider.verificationStatus !== "APPROVED") {
      alert("Your account must be APPROVED by Admin before going online.");
      return;
    }

    setTogglingStatus(true);
    setError(null);

    const nextState = !rider.isAvailable;

    if (nextState) {
      // Prompt for geolocation
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await apiClient.post("/api/delivery/availability", {
                isAvailable: true,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              setRider((prev) => (prev ? { ...prev, isAvailable: true } : prev));
            } catch (err: any) {
              setError(err.response?.data?.message || "Failed to go online");
            } finally {
              setTogglingStatus(false);
            }
          },
          async () => {
            // Fallback without coords
            try {
              await apiClient.post("/api/delivery/availability", { isAvailable: true });
              setRider((prev) => (prev ? { ...prev, isAvailable: true } : prev));
            } catch (err: any) {
              setError(err.response?.data?.message || "Failed to go online");
            } finally {
              setTogglingStatus(false);
            }
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        try {
          await apiClient.post("/api/delivery/availability", { isAvailable: true });
          setRider((prev) => (prev ? { ...prev, isAvailable: true } : prev));
        } catch (err: any) {
          setError(err.response?.data?.message || "Failed to go online");
        } finally {
          setTogglingStatus(false);
        }
      }
    } else {
      try {
        await apiClient.post("/api/delivery/availability", { isAvailable: false });
        setRider((prev) => (prev ? { ...prev, isAvailable: false } : prev));
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to go offline");
      } finally {
        setTogglingStatus(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading rider profile...</p>
        </div>
      </div>
    );
  }

  const isApproved = rider?.verificationStatus === "APPROVED";
  const activeDelivery = summary?.activeDelivery;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8">
      <Navbar rider={rider} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Verification Alert Banner */}
        {!isApproved && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-amber-300 shadow-lg">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Account Verification Pending</h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Status: <span className="font-bold tracking-wide uppercase">{rider?.verificationStatus}</span>.
                Our Mysuru administrative team is reviewing your vehicle details and documents. Once approved, you will be able to go online and receive instant delivery requests.
              </p>
            </div>
          </div>
        )}

        {/* Strikes Warning Banner */}
        {(summary?.activeStrikesCount ?? 0) > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-200">
                  You have {summary?.activeStrikesCount} active strike(s)
                </p>
                <p className="text-xs text-rose-400">
                  Accounts with 3 strikes are automatically suspended. You can appeal in your profile.
                </p>
              </div>
            </div>
            <Link
              href="/profile#strikes"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 transition-colors"
            >
              Review Strike
            </Link>
          </div>
        )}

        {/* Main Status & Toggle Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    rider?.isAvailable
                      ? "bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"
                      : "bg-slate-600"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Status
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {rider?.isAvailable ? (
                  <span className="text-emerald-400">Online & Ready to Deliver</span>
                ) : (
                  <span className="text-slate-400">You are currently Offline</span>
                )}
              </h1>
              <p className="text-xs text-slate-400 max-w-md">
                {rider?.isAvailable
                  ? "Your GPS is transmitting to dispatch. Delivery offers in Mysuru will appear automatically."
                  : "Go online when you're ready to receive local pickup and drop-off requests."}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleOnline}
                disabled={togglingStatus || !isApproved}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-xl cursor-pointer ${
                  rider?.isAvailable
                    ? "bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400 border border-slate-700"
                    : isApproved
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25"
                    : "bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed"
                }`}
              >
                <Power className={`w-5 h-5 ${togglingStatus ? "animate-spin" : ""}`} />
                <span>{rider?.isAvailable ? "Go Offline" : "Go Online"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Delivery Card (High Priority) */}
        {activeDelivery && (
          <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Package className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Active Delivery Job
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      #{activeDelivery.trackingNumber || activeDelivery.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Status: {activeDelivery.status.replace(/_/g, " ")}
                  </h3>
                </div>
              </div>

              <Link
                href={`/delivery/${activeDelivery.id}`}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Continue Delivery
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-400 block">Pickup:</span>
                  <span className="text-slate-200">
                    {activeDelivery.pickupContactName || "Store / Vendor"} - {activeDelivery.pickupAddress}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-400 block">Dropoff:</span>
                  <span className="text-slate-200">
                    {activeDelivery.dropoffContactName || "Customer"} - {activeDelivery.dropoffAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incoming Offers Card Notification */}
        {(summary?.pendingOffersCount ?? 0) > 0 && !activeDelivery && (
          <div className="bg-blue-950/40 border-2 border-blue-500/50 rounded-3xl p-5 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  You have {summary?.pendingOffersCount} new delivery offer(s)!
                </p>
                <p className="text-xs text-blue-300/80">
                  Review and accept before the dispatch timer expires.
                </p>
              </div>
            </div>
            <Link
              href="/offers"
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              View Offers
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today Earnings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Earnings</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">
              ₹{((summary?.todayEarnings ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Paid directly to bank</p>
          </div>

          {/* Today Deliveries */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed Today</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {summary?.todayCompletedCount ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Total lifetime: {summary?.totalCompletedCount ?? 0}
            </p>
          </div>

          {/* Rating */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Rating</span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {rider?.ratingAverage ? Number(rider.ratingAverage).toFixed(1) : "5.0"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Based on {rider?.ratingCount ?? 0} reviews
            </p>
          </div>

          {/* Vehicle Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Vehicle</span>
              <Bike className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg font-black text-white capitalize">
              {rider?.vehicleType?.replace(/_/g, " ") || "Two Wheeler"}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">Mysuru Fleet</p>
          </div>
        </div>

        {/* Quick Operations Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/offers"
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center text-center gap-2 transition-all"
          >
            <Radio className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Delivery Offers</span>
          </Link>

          <Link
            href="/earnings"
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center text-center gap-2 transition-all"
          >
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-bold text-slate-200">Payout Ledger</span>
          </Link>

          <Link
            href="/history"
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center text-center gap-2 transition-all"
          >
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold text-slate-200">Past Orders</span>
          </Link>

          <Link
            href="/support"
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex flex-col items-center text-center gap-2 transition-all"
          >
            <Phone className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Dispatch Support</span>
          </Link>
        </div>
      </main>

      <BottomNav
        hasActiveDelivery={!!activeDelivery}
        offersCount={summary?.pendingOffersCount || 0}
      />
    </div>
  );
}
