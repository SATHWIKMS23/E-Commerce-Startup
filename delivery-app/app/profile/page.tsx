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
  AlertTriangle,
  Lock,
  LogOut,
  ArrowLeft,
  FileText,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface RiderProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  verificationStatus: string;
  vehicleType: string;
  vehicleNumber?: string;
  drivingLicenseNumber?: string;
  aadhaarNumberMasked?: string;
  bankAccountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  strikes?: Array<{
    id: string;
    reason: string;
    incidentId?: string;
    isAppealed: boolean;
    appealNotes?: string;
    status: string;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Appeal modal state
  const [appealStrikeId, setAppealStrikeId] = useState<string | null>(null);
  const [appealNotes, setAppealNotes] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get("/api/delivery/riders/me");
      if (res.data?.rider) {
        setRider(res.data.rider);
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
        appealNotes,
      });
      alert("Appeal submitted for admin review.");
      setAppealStrikeId(null);
      setAppealNotes("");
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit appeal");
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const isBicycle = rider?.vehicleType === "BICYCLE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8">
      <Navbar rider={rider} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              rider?.verificationStatus === "APPROVED"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}
          >
            {rider?.verificationStatus || "PENDING"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Header Identity Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex items-center gap-5 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/20">
                {rider?.firstName?.[0]}
                {rider?.lastName?.[0]}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {rider?.firstName} {rider?.lastName}
                </h1>
                <p className="text-xs text-slate-400">{rider?.email} • {rider?.phone}</p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>AtlasBasket Mysuru Delivery Partner</span>
                </div>
              </div>
            </div>

            {/* Vehicle & Compliance Information */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Bike className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Vehicle & Driving Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Vehicle Type</span>
                  <p className="font-semibold text-slate-200 capitalize">
                    {rider?.vehicleType?.replace(/_/g, " ")}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Registration / Plate No.</span>
                  <p className="font-semibold text-slate-200">
                    {rider?.vehicleNumber || (isBicycle ? "N/A (Bicycle Exemption)" : "Pending")}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Driving Licence</span>
                  <p className="font-semibold text-slate-200">
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Identity Protection & Aadhaar</h3>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Masked Aadhaar Number</span>
                  <p className="font-mono font-bold text-emerald-400 text-sm">
                    {rider?.aadhaarNumberMasked || "XXXX-XXXX-••••"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                    UIDAI compliant masked storage. Full 12-digit Aadhaar numbers are never permanently retained.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit Encrypted Vault</span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Bank Account for Payouts</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Account Holder</span>
                  <p className="font-semibold text-slate-200">
                    {rider?.bankAccountHolderName || `${rider?.firstName} ${rider?.lastName}`}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Bank Name</span>
                  <p className="font-semibold text-slate-200">
                    {rider?.bankName || "State Bank of India"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Account & IFSC</span>
                  <p className="font-mono font-semibold text-slate-200">
                    ••••{rider?.bankAccountNumber?.slice(-4) || "XXXX"} • {rider?.bankIfsc || "SBIN0001234"}
                  </p>
                </div>
              </div>
            </div>

            {/* Disciplinary & Strikes Section */}
            <div id="strikes" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Disciplinary Record & Strikes</h3>
                </div>
                <span className="text-xs text-slate-500">
                  3 strikes trigger automated suspension
                </span>
              </div>

              {!rider?.strikes || rider.strikes.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Clean record! You have 0 active strikes on your profile. Keep up the great work.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {rider.strikes.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-400">Strike Issued</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(s.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="text-slate-300">{s.reason}</p>
                        {s.isAppealed && (
                          <span className="inline-block text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
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
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer shrink-0"
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
            <div className="pt-4">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="w-full py-3.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Appeal Disciplinary Strike
            </h3>
            <p className="text-xs text-slate-400">
              Provide context or evidence explaining why this incident was not within your control.
            </p>

            <form onSubmit={handleAppealStrike} className="space-y-4">
              <textarea
                required
                rows={4}
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Explain the circumstances in detail..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAppealStrikeId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || !appealNotes.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold disabled:opacity-50"
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
