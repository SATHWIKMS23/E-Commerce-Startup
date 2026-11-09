"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Clock,
  ArrowLeft,
  Store,
  User,
  Star,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  FileText,
} from "lucide-react";

interface DeliveryHistoryItem {
  id: string;
  trackingNumber: string;
  status: string;
  pickupAddress: string;
  pickupContactName?: string;
  dropoffAddress: string;
  dropoffContactName?: string;
  riderPayoutAmountPaise: number;
  totalAmountPaise: number;
  distanceKm?: number;
  createdAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  ratings?: Array<{
    rating: number;
    feedback?: string;
  }>;
  externalShop?: {
    name: string;
    category: string;
  } | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryHistoryItem | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get("/api/delivery/history?limit=50");
      if (res.data?.deliveries) {
        setDeliveries(res.data.deliveries);
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
    fetchHistory();
  }, []);

  const openDetails = async (item: DeliveryHistoryItem) => {
    setSelectedDelivery(item);
    setLoadingTimeline(true);
    try {
      const res = await apiClient.get(`/api/delivery/jobs/${item.id}/timeline`);
      if (res.data?.events) {
        setTimelineEvents(res.data.events);
      }
    } catch {
      setTimelineEvents([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const filteredDeliveries = deliveries.filter((item) => {
    if (filter === "COMPLETED") return item.status === "COMPLETED" || item.status === "DELIVERED";
    if (filter === "CANCELLED") return item.status === "CANCELLED" || item.status === "FAILED";
    return true;
  });

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

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("COMPLETED")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filter === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter("CANCELLED")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filter === "CANCELLED" ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Delivery History
          </h1>
          <p className="text-xs text-slate-400">
            Records of completed and past deliveries in Mysuru
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading past deliveries...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No delivery records found</p>
            <p className="text-xs text-slate-500">
              Orders you deliver will be permanently archived here with second-precision audit timestamps.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeliveries.map((d) => {
              const isDone = d.status === "COMPLETED" || d.status === "DELIVERED";
              const rating = d.ratings?.[0]?.rating;

              return (
                <div
                  key={d.id}
                  onClick={() => openDetails(d)}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-white">
                        #{d.trackingNumber || d.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                      {d.externalShop && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                          Local Shop: {d.externalShop.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <Store className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{d.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{d.dropoffAddress}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                      <span>
                        {new Date(d.completedAt || d.createdAt).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {d.distanceKm && <span>{d.distanceKm} km</span>}
                      {rating && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {rating}.0
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Payout Earned
                      </span>
                      <p className="text-lg font-black text-emerald-400">
                        ₹{((d.riderPayoutAmountPaise / 100)).toFixed(2)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Details & Timeline Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Delivery Details
                </span>
                <h3 className="text-base font-bold text-white font-mono">
                  #{selectedDelivery.trackingNumber || selectedDelivery.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                    Pickup Store / Vendor
                  </span>
                  <p className="font-semibold text-slate-200 mt-0.5">
                    {selectedDelivery.pickupContactName || "Partner Store"}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {selectedDelivery.pickupAddress}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                    Dropoff Recipient
                  </span>
                  <p className="font-semibold text-slate-200 mt-0.5">
                    {selectedDelivery.dropoffContactName || "Customer"}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {selectedDelivery.dropoffAddress}
                  </p>
                </div>
              </div>

              {/* Second Precision Audit Log */}
              <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Second-Level Timestamp Audit Log
                </h4>
                {loadingTimeline ? (
                  <p className="text-slate-500 text-[11px]">Loading events...</p>
                ) : timelineEvents.length === 0 ? (
                  <p className="text-slate-500 text-[11px]">No timeline events recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {timelineEvents.map((e, idx) => (
                      <div
                        key={e.id || idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                      >
                        <span className="font-mono text-emerald-400 text-[11px]">
                          {e.status || e.eventType}
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">
                          {new Date(e.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedDelivery(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
