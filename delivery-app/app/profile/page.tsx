"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  User,
  Bike,
  ShieldCheck,
  Building2,
  Lock,
  LogOut,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [rider, setRider] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [appealStrikeId, setAppealStrikeId] = useState<string | null>(null);
  const [appealNotes, setAppealNotes] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("delivery_partner_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/api/delivery/riders/me");
        if (res.data?.rider) {
          setRider(res.data.rider);
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

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiClient.post("/api/delivery/auth/logout");
    } catch {}
    localStorage.removeItem("delivery_partner_token");
    localStorage.removeItem("delivery_partner_rider");
    router.push("/login");
  };

  const handleAppealStrike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealStrikeId || !appealNotes.trim()) return;

    setSubmittingAppeal(true);
    try {
      await apiClient.post(`/api/delivery/strikes/${appealStrikeId}/appeal`, {
        reason: appealNotes.trim(),
      });
      alert("Your appeal has been submitted to the operations administrator.");
      setAppealStrikeId(null);
      setAppealNotes("");
      const res = await apiClient.get("/api/delivery/riders/me");
      if (res.data?.rider) setRider(res.data.rider);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit appeal");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const isBicycle = rider?.vehicleType === "BICYCLE";

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8 relative overflow-hidden">
      {/* Subtle monochrome ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

      <Navbar rider={rider} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/10 bg-white/[0.03] text-zinc-300"
          >
            {rider?.verificationStatus || "PENDING"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Header Identity Card */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                {rider?.firstName?.[0]}
                {rider?.lastName?.[0]}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {rider?.firstName} {rider?.lastName}
                </h1>
                <p className="text-xs text-zinc-400">{rider?.email} • {rider?.phone}</p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span>AtlasBasket Mysuru Delivery Partner</span>
                </div>
              </div>
            </div>

            {/* Vehicle & Compliance Information */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
                <Bike className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-bold text-white">Vehicle & Driving Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Vehicle Type</span>
                  <p className="font-semibold text-zinc-200 capitalize">
                    {rider?.vehicleType?.replace(/_/g, " ")}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Registration / Plate No.</span>
                  <p className="font-semibold text-zinc-200">
                    {rider?.vehicleNumber || (isBicycle ? "N/A (Bicycle Exemption)" : "Pending")}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Driving Licence</span>
                  <p className="font-semibold text-zinc-200">
                    {isBicycle
                      ? "Legally Exempt"
                      : rider?.drivingLicenseNumber
                      ? `DL: ${rider.drivingLicenseNumber}`
                      : "Verified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Identity & Aadhaar Masking */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
                <ShieldCheck className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-bold text-white">Identity Protection & Aadhaar</h3>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Masked Aadhaar Number</span>
                  <p className="font-mono font-bold text-white text-sm">
                    {rider?.aadhaarNumberMasked || "XXXX-XXXX-••••"}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-md">
                    UIDAI compliant masked storage. Full 12-digit Aadhaar numbers are never permanently retained.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.02] px-3 py-2 rounded-xl border border-white/10">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>256-Bit Encrypted Vault</span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
                <Building2 className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-bold text-white">Bank Account for Payouts</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Account Holder</span>
                  <p className="font-semibold text-zinc-200">
                    {rider?.bankAccountHolderName || `${rider?.firstName} ${rider?.lastName}`}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Bank Name</span>
                  <p className="font-semibold text-zinc-200">
                    {rider?.bankName || "State Bank of India"}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Account & IFSC</span>
                  <p className="font-mono font-semibold text-zinc-200">
                    ••••{rider?.bankAccountNumber?.slice(-4) || "XXXX"} • {rider?.bankIfsc || "SBIN0001234"}
                  </p>
                </div>
              </div>
            </div>

            {/* Disciplinary & Strikes Section */}
            <div id="strikes" className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-bold text-white">Disciplinary Record & Strikes</h3>
                </div>
                <span className="text-[11px] text-zinc-500">
                  3 strikes trigger automated suspension
                </span>
              </div>

              {!rider?.strikes || rider.strikes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-zinc-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                  <span>Clean record! You have 0 active strikes on your profile. Keep up the great work.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {rider.strikes.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-rose-300">Strike Issued</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(s.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="text-zinc-300">{s.reason}</p>
                        {s.isAppealed && (
                          <span className="inline-block text-[10px] text-zinc-400 border border-white/10 px-2 py-0.5 rounded">
                            Appeal Under Admin Review
                          </span>
                        )}
                      </div>

                      {!s.isAppealed && (
                        <button
                          onClick={() => {
                            setAppealStrikeId(s.id);
                            setAppealNotes("");
                          }}
                          className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-medium text-zinc-200 transition-colors cursor-pointer shrink-0"
                        >
                          Submit Appeal
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout Action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out from Device
              </button>
            </div>
          </>
        )}
      </main>

      {/* Appeal Strike Modal */}
      {appealStrikeId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0b0e] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
              Appeal Disciplinary Strike
            </h3>
            <p className="text-xs text-zinc-400">
              Provide context or evidence explaining why this incident was not within your control.
            </p>

            <form onSubmit={handleAppealStrike} className="space-y-4">
              <textarea
                required
                rows={4}
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Explain the circumstances in detail..."
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAppealStrikeId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || !appealNotes.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 disabled:opacity-50"
                >
                  Submit Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
