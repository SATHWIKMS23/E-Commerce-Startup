"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowLeft,
  Calendar,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface EarningsData {
  todayEarningsPaise: number;
  weeklyEarningsPaise: number;
  monthlyEarningsPaise: number;
  totalLifetimePaise: number;
  pendingPayoutPaise: number;
  completedCount: number;
  payoutsHistory: Array<{
    id: string;
    payoutNumber: string;
    amountPaise: number;
    status: string;
    bankReference?: string | null;
    processedAt?: string | null;
    createdAt: string;
  }>;
}

export default function EarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [rider, setRider] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [earnRes, meRes] = await Promise.all([
          apiClient.get("/api/delivery/earnings"),
          apiClient.get("/api/delivery/riders/me"),
        ]);
        if (earnRes.data?.earnings) {
          setEarnings(earnRes.data.earnings);
        }
        if (meRes.data?.rider) {
          setRider(meRes.data.rider);
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8">
      <Navbar rider={rider} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>AtlasBasket Verified Payouts</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading earnings & payout ledger...</p>
          </div>
        ) : (
          <>
            {/* Hero Earnings Banner */}
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    Pending Disbursal
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-white">
                    ₹{(((earnings?.pendingPayoutPaise ?? 0) / 100)).toFixed(2)}
                  </h1>
                  <p className="text-xs text-slate-400 mt-2">
                    Accrued earnings from completed orders, scheduled for automatic electronic bank clearance.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:min-w-[220px]">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Lifetime Total Earned
                  </span>
                  <p className="text-2xl font-black text-white mt-1">
                    ₹{(((earnings?.totalLifetimePaise ?? 0) / 100)).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    {earnings?.completedCount || 0} completed deliveries
                  </p>
                </div>
              </div>
            </div>

            {/* Timeframe Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white">
                  ₹{(((earnings?.todayEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Midnight to current time</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">This Week</span>
                  <Calendar className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-black text-white">
                  ₹{(((earnings?.weeklyEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Current cycle week</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-black text-white">
                  ₹{(((earnings?.monthlyEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Monthly cumulative</p>
              </div>
            </div>

            {/* Registered Bank Account Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Payout Destination Bank Account</h3>
                  <p className="text-xs text-slate-400">Electronic NEFT/IMPS direct settlement</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Account Holder</span>
                  <p className="font-semibold text-slate-200">
                    {rider?.bankAccountHolderName || `${rider?.firstName} ${rider?.lastName}`}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Bank Name & Branch</span>
                  <p className="font-semibold text-slate-200">{rider?.bankName || "State Bank of India"}</p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Account & IFSC</span>
                  <p className="font-mono font-semibold text-slate-200">
                    ••••{rider?.bankAccountNumber?.slice(-4) || "XXXX"} • {rider?.bankIfsc || "SBIN0001234"}
                  </p>
                </div>
              </div>
            </div>

            {/* Payout History Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Bank Disbursal History
                </h3>
                <span className="text-xs text-slate-500">Official UTR references</span>
              </div>

              {!earnings?.payoutsHistory || earnings.payoutsHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No bank transfer records yet. Once your pending balance is cleared by accounts, records will appear here with bank reference numbers.
                </div>
              ) : (
                <div className="space-y-3">
                  {earnings.payoutsHistory.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{p.payoutNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "PAID"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : p.status === "PROCESSING"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Processed:{" "}
                          {new Date(p.processedAt || p.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </p>
                        {p.bankReference && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Bank UTR: {p.bankReference}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-base font-black text-emerald-400">
                          ₹{((p.amountPaise / 100)).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-500">Direct Bank Deposit</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
