"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  TrendingUp,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

interface PayoutEntry {
  id: string;
  payoutNumber: string;
  amountPaise: number;
  status: "REQUESTED" | "PROCESSING" | "PAID" | "FAILED";
  bankReference?: string;
  processedAt?: string;
  createdAt: string;
}

interface EarningsSummary {
  todayEarningsPaise: number;
  weeklyEarningsPaise: number;
  monthlyEarningsPaise: number;
  totalLifetimePaise: number;
  pendingPayoutPaise: number;
  completedCount: number;
  payoutsHistory: PayoutEntry[];
}

export default function EarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [rider, setRider] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("delivery_partner_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [earnRes, profileRes] = await Promise.all([
          apiClient.get("/api/delivery/earnings"),
          apiClient.get("/api/delivery/riders/me"),
        ]);
        if (earnRes.data?.earnings) setEarnings(earnRes.data.earnings);
        if (profileRes.data?.rider) setRider(profileRes.data.rider);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem("delivery_partner_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8 relative overflow-hidden">
      {/* Subtle monochrome ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <Navbar rider={rider} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>AtlasBasket Verified Payouts</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs">Loading earnings & payout ledger...</p>
          </div>
        ) : (
          <>
            {/* Hero Earnings Banner */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
                    Pending Disbursal
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    ₹{(((earnings?.pendingPayoutPaise ?? 0) / 100)).toFixed(2)}
                  </h1>
                  <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed">
                    Accrued earnings from completed orders, scheduled for automatic electronic bank clearance.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:min-w-[220px]">
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                    Lifetime Total Earned
                  </span>
                  <p className="text-2xl font-bold text-white mt-1">
                    ₹{(((earnings?.totalLifetimePaise ?? 0) / 100)).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {earnings?.completedCount || 0} completed deliveries
                  </p>
                </div>
              </div>
            </div>

            {/* Timeframe Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider">Today</span>
                  <Clock className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-white">
                  ₹{(((earnings?.todayEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Midnight to current time</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider">This Week</span>
                  <Calendar className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-white">
                  ₹{(((earnings?.weeklyEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Current cycle week</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider">This Month</span>
                  <TrendingUp className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-white">
                  ₹{(((earnings?.monthlyEarningsPaise ?? 0) / 100)).toFixed(2)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">Monthly cumulative</p>
              </div>
            </div>

            {/* Registered Bank Account Info */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Payout Destination Bank Account</h3>
                  <p className="text-[11px] text-zinc-400">Electronic NEFT/IMPS direct settlement</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Account Holder</span>
                  <p className="font-semibold text-zinc-200">
                    {rider?.bankAccountHolderName || `${rider?.firstName} ${rider?.lastName}`}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Bank Name & Branch</span>
                  <p className="font-semibold text-zinc-200">{rider?.bankName || "State Bank of India"}</p>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Account & IFSC</span>
                  <p className="font-mono font-semibold text-zinc-200">
                    ••••{rider?.bankAccountNumber?.slice(-4) || "XXXX"} • {rider?.bankIfsc || "SBIN0001234"}
                  </p>
                </div>
              </div>
            </div>

            {/* Payout History Ledger */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-300" />
                  Bank Disbursal History
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">Official UTR references</span>
              </div>

              {!earnings?.payoutsHistory || earnings.payoutsHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No bank transfer records yet. Once your pending balance is cleared by accounts, records will appear here with bank reference numbers.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {earnings.payoutsHistory.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono">{p.payoutNumber}</span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold border border-white/10 bg-white/[0.03] text-zinc-300"
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Processed:{" "}
                          {new Date(p.processedAt || p.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </p>
                        {p.bankReference && (
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Bank UTR: {p.bankReference}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-base font-bold text-white">
                          ₹{((p.amountPaise / 100)).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-zinc-500">Direct Bank Deposit</span>
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
