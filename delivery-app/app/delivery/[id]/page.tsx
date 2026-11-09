"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { InteractiveRouteMap } from "@/components/delivery/InteractiveRouteMap";
import { SwipeToConfirm } from "@/components/delivery/SwipeToConfirm";
import {
  MapPin,
  Store,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  KeyRound,
  ShieldCheck,
  Clock,
  ArrowLeft,
  XCircle,
  FileText,
  ExternalLink,
} from "lucide-react";

interface DeliveryDetails {
  id: string;
  trackingNumber: string;
  status: string;
  pickupAddress: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  distanceKm?: number;
  durationMins?: number;
  riderPayoutAmountPaise: number;
  totalAmountPaise: number;
  packageDescription?: string;
  navigationUrl?: string;
  arrivedAtPickupAt?: string;
  pickedUpAt?: string;
  arrivedAtDropoffAt?: string;
  deliveredAt?: string;
  pickupVerificationCode?: string;
}

export default function DeliveryExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const deliveryId = unwrappedParams.id;
  const router = useRouter();

  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verification OTP inputs
  const [pickupOtp, setPickupOtp] = useState("");
  const [dropoffOtp, setDropoffOtp] = useState("");

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState("DAMAGED_PACKAGE");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  const fetchDelivery = async () => {
    try {
      const res = await apiClient.get(`/api/delivery/jobs/${deliveryId}`);
      if (res.data?.delivery) {
        setDelivery(res.data.delivery);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load delivery details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(fetchDelivery, 5000);
    return () => clearInterval(interval);
  }, [deliveryId]);

  const loadTimeline = async () => {
    try {
      const res = await apiClient.get(`/api/delivery/jobs/${deliveryId}/timeline`);
      if (res.data?.events) {
        setTimelineEvents(res.data.events);
      }
      setShowTimelineModal(true);
    } catch (err: any) {
      alert("Failed to load delivery timeline");
    }
  };

  // State actions
  const handleStartPickup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/start-pickup`);
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrivedPickup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/arrived-pickup`);
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupOtp) {
      setError("Please enter the pickup OTP or merchant code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post(`/api/delivery/jobs/${deliveryId}/verify-pickup`, {
        pickupOtp,
      });
      setSuccessMsg("Pickup verified successfully! Package is now with you.");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid pickup verification OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDropoff = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/start-dropoff`);
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrivedDropoff = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/arrived-dropoff`);
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDropoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropoffOtp) {
      setError("Please enter the 4-digit dropoff OTP given by the customer.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post(`/api/delivery/jobs/${deliveryId}/verify-dropoff`, {
        dropoffOtp,
      });
      setSuccessMsg("Delivery completed! Payment credited to your account.");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid dropoff verification OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please enter a reason for cancellation");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/cancel`, {
        reason: cancelReason,
      });
      setShowCancelModal(false);
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel delivery");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportIncident = async () => {
    if (!incidentDesc.trim()) {
      alert("Please describe the incident");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/incident`, {
        incidentType,
        description: incidentDesc,
      });
      setShowIncidentModal(false);
      setIncidentDesc("");
      alert("Incident reported to admin for review.");
      await fetchDelivery();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to report incident");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-sm text-slate-400 mb-4">Delivery not found or not assigned to you.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isCompleted =
    delivery.status === "DELIVERED" || delivery.status === "COMPLETED";
  const isCancelled =
    delivery.status === "CANCELLED" || delivery.status === "FAILED";

  const isPickupStage = [
    "ASSIGNED",
    "ACCEPTED",
    "ARRIVING_AT_PICKUP",
    "ARRIVED_AT_PICKUP",
    "PICKUP_PENDING",
    "PICKUP_VERIFICATION",
  ].includes(delivery.status);

  const isDropoffStage = [
    "PICKED_UP",
    "PICKUP_COMPLETE",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "ARRIVED_AT_DROPOFF",
    "DELIVERY_VERIFICATION",
    "ARRIVED",
  ].includes(delivery.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-8">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTimeline}
              className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Timeline Audit
            </button>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Issue
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Status Tracker Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Delivery #{delivery.trackingNumber || delivery.id.slice(0, 8)}
              </span>
              <h1 className="text-xl font-black text-white mt-0.5">
                Status: {delivery.status.replace(/_/g, " ")}
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Payout
              </span>
              <p className="text-2xl font-black text-emerald-400">
                ₹{(delivery.riderPayoutAmountPaise / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Steps Indicator */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div
              className={`h-2 rounded-full ${
                isPickupStage || isDropoffStage || isCompleted
                  ? "bg-emerald-500"
                  : "bg-slate-800"
              }`}
            />
            <div
              className={`h-2 rounded-full ${
                delivery.status === "ARRIVED_AT_PICKUP" ||
                isDropoffStage ||
                isCompleted
                  ? "bg-emerald-500"
                  : "bg-slate-800"
              }`}
            />
            <div
              className={`h-2 rounded-full ${
                isDropoffStage || isCompleted ? "bg-emerald-500" : "bg-slate-800"
              }`}
            />
            <div
              className={`h-2 rounded-full ${
                isCompleted ? "bg-emerald-500" : "bg-slate-800"
              }`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Assigned</span>
            <span>At Pickup</span>
            <span>In Transit</span>
            <span>Delivered</span>
          </div>
        </div>

        {/* Map Visual */}
        <InteractiveRouteMap
          pickupAddress={delivery.pickupAddress}
          dropoffAddress={delivery.dropoffAddress}
          pickupLat={delivery.pickupLatitude || 12.2958}
          pickupLng={delivery.pickupLongitude || 76.6394}
          dropoffLat={delivery.dropoffLatitude || 12.3106}
          dropoffLng={delivery.dropoffLongitude || 76.6548}
          distanceKm={delivery.distanceKm || 3.5}
          durationMins={delivery.durationMins || 15}
          navigationUrl={delivery.navigationUrl}
          stepName={isPickupStage ? "TO_PICKUP" : "TO_DROPOFF"}
        />

        {/* Stage 1: Pickup Workflow */}
        {isPickupStage && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    Step 1 • Store Pickup
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {delivery.pickupContactName || "Partner Merchant"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{delivery.pickupAddress}</p>
                </div>
              </div>

              {delivery.pickupContactPhone && (
                <a
                  href={`tel:${delivery.pickupContactPhone}`}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Sub-actions for pickup */}
            {(delivery.status === "ASSIGNED" || delivery.status === "ACCEPTED") && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleStartPickup}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Start Navigation to Pickup
              </button>
            )}

            {delivery.status === "ARRIVING_AT_PICKUP" && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleArrivedPickup}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                I Have Arrived at Pickup Store
              </button>
            )}

            {(delivery.status === "ARRIVED_AT_PICKUP" ||
              delivery.status === "PICKUP_VERIFICATION") && (
              <form onSubmit={handleVerifyPickup} className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Enter Pickup Verification OTP from Store
                  </div>
                  <input
                    type="text"
                    required
                    value={pickupOtp}
                    onChange={(e) => setPickupOtp(e.target.value)}
                    placeholder="Enter 4-digit Store OTP"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 text-center">
                    Ask the store manager for the order pickup OTP before taking the package.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  Verify Pickup & Collect Package
                </button>
              </form>
            )}
          </div>
        )}

        {/* Stage 2: Dropoff Workflow */}
        {isDropoffStage && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                    Step 2 • Customer Dropoff
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {delivery.dropoffContactName || "Customer"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{delivery.dropoffAddress}</p>
                </div>
              </div>

              {delivery.dropoffContactPhone && (
                <a
                  href={`tel:${delivery.dropoffContactPhone}`}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            {delivery.status === "PICKED_UP" && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleStartDropoff}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Start Navigation to Customer
              </button>
            )}

            {delivery.status === "IN_TRANSIT" && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleArrivedDropoff}
                className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
              >
                I Have Arrived at Customer Location
              </button>
            )}

            {(delivery.status === "ARRIVED_AT_DROPOFF" ||
              delivery.status === "DELIVERY_VERIFICATION") && (
              <form onSubmit={handleVerifyDropoff} className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Enter Customer Dropoff OTP
                  </div>
                  <input
                    type="text"
                    required
                    value={dropoffOtp}
                    onChange={(e) => setDropoffOtp(e.target.value)}
                    placeholder="Enter 4-digit Customer OTP"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 text-center">
                    Ask the customer for their delivery verification code before handing over the goods.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  Verify Dropoff & Complete Order
                </button>
              </form>
            )}
          </div>
        )}

        {/* Stage 3: Completed Banner */}
        {isCompleted && (
          <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Delivery Completed!</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              ₹{(delivery.riderPayoutAmountPaise / 100).toFixed(2)} has been credited to your rider account ledger.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Cancellation trigger button if not completed */}
        {!isCompleted && !isCancelled && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Unable to complete delivery? Cancel Job
            </button>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Cancel Delivery Job
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Frequent cancellations impact your reliability rating. Please select a valid reason.
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
            >
              <option value="">Select reason...</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Store Closed / Not Answering">Store Closed / Not Answering</option>
              <option value="Customer Unreachable">Customer Unreachable</option>
              <option value="Accident / Personal Emergency">Accident / Personal Emergency</option>
              <option value="Heavy Rain / Adverse Weather">Heavy Rain / Adverse Weather</option>
            </select>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting || !cancelReason}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Report Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Report Incident / Damage
            </h3>
            <p className="text-xs text-slate-400">
              Submit details to protect your account standing during dispatch audits.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Incident Category
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              >
                <option value="DAMAGED_PACKAGE">Damaged Package on Pickup</option>
                <option value="WRONG_ITEM">Wrong Item Handed by Store</option>
                <option value="CUSTOMER_UNREACHABLE">Customer Not Answering</option>
                <option value="INCORRECT_ADDRESS">Address Incorrect or Remote</option>
                <option value="PACKAGE_LEAKAGE">Liquid Leakage / Spill</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Details & Notes
              </label>
              <textarea
                rows={3}
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                placeholder="Explain what occurred..."
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReportIncident}
                disabled={submitting || !incidentDesc.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Audit Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Delivery Audit Timeline (Second Precision)
              </h3>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No events recorded yet</p>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 font-mono">
                        {evt.status || evt.eventType}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-slate-300 text-[11px]">{evt.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowTimelineModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav hasActiveDelivery={!isCompleted && !isCancelled} />
    </div>
  );
}

function AlertCircleIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
