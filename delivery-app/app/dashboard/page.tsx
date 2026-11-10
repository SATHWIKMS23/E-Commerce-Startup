"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { apiClient } from "@/lib/apiClient";
import {
  Power,
  TrendingUp,
  Package,
  Clock,
  Star,
  MapPin,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Bike,
  ArrowRight,
  Phone,
} from "lucide-react";

interface RiderData {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city?: string;
  vehicleType: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BANNED";
  isAvailable: boolean;
  ratingAverage: number;
  ratingCount: number;
}

interface DashboardSummary {
  todayEarnings: number;
  pendingEarnings: number;
  todayCompletedCount: number;
  totalCompletedCount: number;
  pendingOffersCount: number;
  activeStrikesCount: number;
  activeDelivery: any | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [rider, setRider] = useState<RiderData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("delivery_partner_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000); // Polling every 15s for new jobs
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const [profileRes, dashRes] = await Promise.all([
        apiClient.get("/api/delivery/riders/me"),
        apiClient.get("/api/delivery/dashboard"),
      ]);

      if (profileRes.data?.rider) {
        setRider(profileRes.data.rider);
        localStorage.setItem("delivery_partner_rider", JSON.stringify(profileRes.data.rider));
      }
      if (dashRes.data?.summary) {
        setSummary(dashRes.data.summary);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("delivery_partner_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!rider || togglingStatus) return;

    if (rider.verificationStatus !== "APPROVED") {
      alert("Only approved riders can activate availability. Your verification is currently pending review.");
      return;
    }

    setTogglingStatus(true);
    const nextState = !rider.isAvailable;

    if (nextState) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await apiClient.post("/api/delivery/availability", {
                isAvailable: true,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                batteryLevel: 95,
              });
              setRider((prev) => (prev ? { ...prev, isAvailable: true } : prev));
            } catch (err: any) {
              setError(err.response?.data?.message || "Failed to go online");
            } finally {
              setTogglingStatus(false);
            }
          },
          async () => {
            try {
              await apiClient.post("/api/delivery/availability", {
                isAvailable: true,
                latitude: 12.2958, // Default Mysuru Center
                longitude: 76.6394,
              });
              setRider((prev) => (prev ? { ...prev, isAvailable: true } : prev));
            } catch (err: any) {
              setError(err.response?.data?.message || "Failed to go online");
            } finally {
              setTogglingStatus(false);
            }
          },
          { enableHighAccuracy: true }
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
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading rider profile...</p>
        </div>
      </div>
    );
  }

  const isApproved = rider?.verificationStatus === "APPROVED";
  const activeDelivery = summary?.activeDelivery;

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <Navbar rider={rider} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6 relative z-10">
        {/* Profile Incomplete Action Banner */}
        {(!rider?.vehicleType || rider?.phone?.startsWith("G_")) && (
          <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sky-300">
            <div className="flex items-start gap-3.5">
              <Bike className="w-5 h-5 flex-shrink-0 text-sky-400 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="font-semibold text-white text-xs sm:text-sm">Action Required: Submit Verification Details</h3>
                <p className="text-[11px] sm:text-xs text-sky-200/80 leading-relaxed">
                  Your Google account is connected. Please submit your phone number, vehicle type, and identity documents to complete verification.
                </p>
              </div>
            </div>
            <Link
              href="/register?step=details"
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shrink-0 text-center flex items-center justify-center gap-1.5"
            >
              <span>Complete Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Verification Alert Banner */}
        {!isApproved && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4 text-amber-300">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-white text-sm">Account Verification Pending</h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Status: <span className="font-bold tracking-wide uppercase">{rider?.verificationStatus}</span>.
                Our operations team is reviewing your vehicle details and documents for {rider?.city ? `${rider.city} district` : "your district"}. Once approved, you will be able to go online and receive instant delivery requests.
              </p>
            </div>
          </div>
        )}

        {/* Strikes Warning Banner */}
        {(summary?.activeStrikesCount ?? 0) > 0 && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-xs font-semibold text-rose-200">
                  You have {summary?.activeStrikesCount} active strike(s)
                </p>
                <p className="text-[11px] text-rose-400">
                  Accounts with 3 strikes are automatically suspended. You can appeal in your profile.
                </p>
              </div>
            </div>
            <Link
              href="/profile#strikes"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 transition-colors"
            >
              Review Strike
            </Link>
          </div>
        )}

        {/* Main Status & Toggle Card */}
        <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    rider?.isAvailable
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-zinc-600"
                  }`}
                />
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Current Status
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                {rider?.isAvailable ? (
                  <span>Online & Ready to Deliver</span>
                ) : (
                  <span className="text-zinc-400">You are currently Offline</span>
                )}
              </h1>
              <p className="text-xs text-zinc-400 max-w-md">
                {rider?.isAvailable
                  ? `Your GPS is transmitting to dispatch. Delivery offers in ${rider?.city || "your district"} will appear automatically.`
                  : "Go online when you're ready to receive local pickup and drop-off requests."}
              </p>
            </div>

            <div className="flex items-center w-full sm:w-auto">
              <button
                onClick={handleToggleOnline}
                disabled={togglingStatus || !isApproved}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  rider?.isAvailable
                    ? "bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10"
                    : isApproved
                    ? "bg-white text-zinc-950 hover:bg-zinc-200 font-bold shadow-sm"
                    : "bg-white/[0.02] text-zinc-600 border border-white/5 cursor-not-allowed"
                }`}
              >
                <Power className={`w-4 h-4 ${togglingStatus ? "animate-spin" : ""}`} />
                <span>{rider?.isAvailable ? "Go Offline" : "Go Online"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Delivery Card (High Priority) */}
        {activeDelivery && (
          <div className="bg-white/[0.03] border border-white/[0.12] rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Active Delivery Job
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] text-zinc-300 font-mono">
                      #{activeDelivery.trackingNumber || activeDelivery.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Status: {activeDelivery.status.replace(/_/g, " ")}
                  </h3>
                </div>
              </div>

              <Link
                href={`/delivery/${activeDelivery.id}`}
                className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
              >
                Continue Delivery
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-400 block text-[11px]">Pickup:</span>
                  <span className="text-zinc-200 text-xs">
                    {activeDelivery.pickupContactName || "Store / Vendor"} - {activeDelivery.pickupAddress}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-zinc-400 block text-[11px]">Dropoff:</span>
                  <span className="text-zinc-200 text-xs">
                    {activeDelivery.dropoffContactName || "Customer"} - {activeDelivery.dropoffAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incoming Offers Card Notification */}
        {(summary?.pendingOffersCount ?? 0) > 0 && !activeDelivery && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  You have {summary?.pendingOffersCount} new delivery offer(s)!
                </p>
                <p className="text-[11px] text-zinc-400">
                  Review and accept before the dispatch timer expires.
                </p>
              </div>
            </div>
            <Link
              href="/offers"
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              View Offers
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Today Earnings */}
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider truncate">Today&apos;s Earnings</span>
              <TrendingUp className="w-4 h-4 text-zinc-300 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              ₹{((summary?.todayEarnings ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 truncate">Paid directly to bank</p>
          </div>

          {/* Today Deliveries */}
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider truncate">Completed Today</span>
              <CheckCircle2 className="w-4 h-4 text-zinc-300 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              {summary?.todayCompletedCount ?? 0}
            </p>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 truncate">
              Total lifetime: {summary?.totalCompletedCount ?? 0}
            </p>
          </div>

          {/* Rating */}
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider truncate">Rating</span>
              <Star className="w-4 h-4 text-zinc-300 fill-zinc-300 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              {rider?.ratingAverage ? Number(rider.ratingAverage).toFixed(1) : "5.0"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 truncate">
              Based on {rider?.ratingCount ?? 0} reviews
            </p>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider truncate">Vehicle</span>
              <Bike className="w-4 h-4 text-zinc-300 shrink-0" />
            </div>
            <p className="text-base sm:text-lg font-bold text-white capitalize truncate">
              {rider?.vehicleType?.replace(/_/g, " ") || "Two Wheeler"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 sm:mt-1 truncate">
              {rider?.city ? `${rider.city} Fleet` : "Operational Fleet"}
            </p>
          </div>
        </div>

        {/* Quick Operations Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/offers"
            className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col items-center text-center gap-2 transition-colors"
          >
            <Radio className="w-5 h-5 text-zinc-300" />
            <span className="text-xs font-medium text-zinc-200">Delivery Offers</span>
          </Link>

          <Link
            href="/earnings"
            className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col items-center text-center gap-2 transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-zinc-300" />
            <span className="text-xs font-medium text-zinc-200">Payout Ledger</span>
          </Link>

          <Link
            href="/history"
            className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col items-center text-center gap-2 transition-colors"
          >
            <Clock className="w-5 h-5 text-zinc-300" />
            <span className="text-xs font-medium text-zinc-200">Past Orders</span>
          </Link>

          <Link
            href="/support"
            className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col items-center text-center gap-2 transition-colors"
          >
            <Phone className="w-5 h-5 text-zinc-300" />
            <span className="text-xs font-medium text-zinc-200">Dispatch Support</span>
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
