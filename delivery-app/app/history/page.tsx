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

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "ALL" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("COMPLETED")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "COMPLETED" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter("CANCELLED")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === "CANCELLED" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400 hover:text-white"
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-300" />
            Delivery History
          </h1>
          <p className="text-xs text-zinc-400">
            Immutable log of all trips fulfilled across Mysuru with full audit trails
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs">Loading delivery history...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-12 text-center space-y-4">
            <Clock className="w-12 h-12 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No delivery trips found</h3>
              <p className="text-xs text-zinc-400">
                Completed orders will automatically be cataloged here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeliveries.map((item) => {
              const isDone = item.status === "COMPLETED" || item.status === "DELIVERED";
              const isCancelled = item.status === "CANCELLED" || item.status === "FAILED";

              return (
                <div
                  key={item.id}
                  onClick={() => openDetails(item)}
                  className="p-5 rounded-3xl bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl transition-all cursor-pointer space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isDone
                            ? "bg-white/[0.05] text-zinc-200 border border-white/10"
                            : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            #{item.trackingNumber || item.id.slice(0, 8)}
                          </span>
                          {item.externalShop && (
                            <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] text-zinc-300 font-medium">
                              Local Shop: {item.externalShop.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          {new Date(item.completedAt || item.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                      <span className="text-base font-bold text-white">
                        ₹{(item.riderPayoutAmountPaise / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {item.distanceKm ? `${item.distanceKm} km` : "Delivered"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Store className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-400 block text-[11px]">Pickup</span>
                        <p className="text-zinc-200 text-xs">
                          {item.pickupContactName || "Vendor"} - {item.pickupAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <User className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-zinc-400 block text-[11px]">Dropoff</span>
                        <p className="text-zinc-200 text-xs">
                          {item.dropoffContactName || "Customer"} - {item.dropoffAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0b0e] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Trip Details & Audit Timeline</h3>
                <span className="font-mono text-xs text-zinc-400">
                  #{selectedDelivery.trackingNumber || selectedDelivery.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Rider Earnings</span>
                  <span className="text-xl font-bold text-white">
                    ₹{(selectedDelivery.riderPayoutAmountPaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[11px]">Trip Distance</span>
                  <span className="text-base font-bold text-white">
                    {selectedDelivery.distanceKm || "—"} km
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] mb-3">
                  Trip Event Timeline
                </h4>
                {loadingTimeline ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">Loading event audit log...</div>
                ) : timelineEvents.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">No audit events recorded for this trip.</div>
                ) : (
                  <div className="space-y-3 relative pl-6 border-l border-white/10">
                    {timelineEvents.map((ev, idx) => (
                      <div key={idx} className="relative space-y-0.5">
                        <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-white" />
                        <p className="font-semibold text-white text-xs">
                          {ev.action || ev.status || "Event"}
                        </p>
                        <p className="text-[11px] text-zinc-400">{ev.details || ev.message}</p>
                        <span className="text-[10px] text-zinc-500 block font-mono">
                          {new Date(ev.timestamp || ev.createdAt).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
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
              className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
