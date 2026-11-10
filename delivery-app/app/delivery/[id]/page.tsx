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
  AlertCircle,
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
    const interval = setInterval(fetchDelivery, 8000);
    return () => clearInterval(interval);
  }, [deliveryId]);

  const handleStartPickup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/start-pickup`);
      setSuccessMsg("Navigation started. Head towards the store.");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start pickup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrivedPickup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/arrived-pickup`);
      setSuccessMsg("Status updated: Arrived at store.");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update arrival");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupOtp) {
      setError("Please enter the store pickup OTP");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/verify-pickup`, {
        code: pickupOtp.trim(),
      });
      setSuccessMsg("Pickup verified! Collect package and start delivery.");
      setPickupOtp("");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid pickup OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDropoff = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/start-dropoff`);
      setSuccessMsg("On your way to customer!");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start dropoff navigation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrivedDropoff = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/arrived-dropoff`);
      setSuccessMsg("Status updated: Arrived at customer location.");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update dropoff arrival");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDropoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropoffOtp) {
      setError("Please enter customer dropoff OTP");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/verify-dropoff`, {
        code: dropoffOtp.trim(),
      });
      setSuccessMsg("Delivery completed successfully! Payout credited.");
      setDropoffOtp("");
      await fetchDelivery();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid dropoff OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/api/delivery/jobs/${deliveryId}/cancel`, {
        reason: cancelReason,
      });
      setShowCancelModal(false);
      alert("Delivery assignment cancelled.");
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const loadTimeline = async () => {
    setShowTimelineModal(true);
    try {
      const res = await apiClient.get(`/api/delivery/jobs/${deliveryId}/timeline`);
      if (res.data?.events) {
        setTimelineEvents(res.data.events);
      }
    } catch (err) {
      console.error(err);
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
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-[#07070a] text-white flex flex-col items-center justify-center p-4">
        <p className="text-sm text-zinc-400 mb-4">Delivery not found or not assigned to you.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition-colors">
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
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pb-24 md:pb-8">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTimeline}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Timeline Audit
            </button>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Issue
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/15 flex items-center gap-2.5 text-white text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Status Tracker Bar */}
        <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Delivery #{delivery.trackingNumber || delivery.id.slice(0, 8)}
              </span>
              <h1 className="text-xl font-bold text-white mt-0.5">
                {delivery.status.replace(/_/g, " ")}
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Payout
              </span>
              <p className="text-2xl font-bold text-white">
                ₹{(delivery.riderPayoutAmountPaise / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Steps Indicator */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div
              className={`h-1.5 rounded-full ${
                isPickupStage || isDropoffStage || isCompleted
                  ? "bg-white"
                  : "bg-white/10"
              }`}
            />
            <div
              className={`h-1.5 rounded-full ${
                delivery.status === "ARRIVED_AT_PICKUP" ||
                isDropoffStage ||
                isCompleted
                  ? "bg-white"
                  : "bg-white/10"
              }`}
            />
            <div
              className={`h-1.5 rounded-full ${
                isDropoffStage || isCompleted ? "bg-white" : "bg-white/10"
              }`}
            />
            <div
              className={`h-1.5 rounded-full ${
                isCompleted ? "bg-white" : "bg-white/10"
              }`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
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
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white flex-shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Step 1 • Store Pickup
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {delivery.pickupContactName || "Partner Merchant"}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{delivery.pickupAddress}</p>
                </div>
              </div>

              {delivery.pickupContactPhone && (
                <a
                  href={`tel:${delivery.pickupContactPhone}`}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 transition-colors"
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
                className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                Start Navigation to Pickup
              </button>
            )}

            {delivery.status === "ARRIVING_AT_PICKUP" && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleArrivedPickup}
                className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                I Have Arrived at Pickup Store
              </button>
            )}

            {(delivery.status === "ARRIVED_AT_PICKUP" ||
              delivery.status === "PICKUP_VERIFICATION") && (
              <form onSubmit={handleVerifyPickup} className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <KeyRound className="w-4 h-4 text-zinc-400" />
                    Enter Pickup Verification OTP from Store
                  </div>
                  <input
                    type="text"
                    required
                    value={pickupOtp}
                    onChange={(e) => setPickupOtp(e.target.value)}
                    placeholder="Enter 4-digit Store OTP"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <p className="text-[11px] text-zinc-500 text-center">
                    Ask the store manager for the order pickup OTP before taking the package.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Verify Pickup & Collect Package
                </button>
              </form>
            )}
          </div>
        )}

        {/* Stage 2: Dropoff Workflow */}
        {isDropoffStage && (
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Step 2 • Customer Dropoff
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {delivery.dropoffContactName || "Customer"}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{delivery.dropoffAddress}</p>
                </div>
              </div>

              {delivery.dropoffContactPhone && (
                <a
                  href={`tel:${delivery.dropoffContactPhone}`}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 transition-colors"
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
                className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                Start Navigation to Customer
              </button>
            )}

            {delivery.status === "IN_TRANSIT" && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleArrivedDropoff}
                className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                I Have Arrived at Customer Location
              </button>
            )}

            {(delivery.status === "ARRIVED_AT_DROPOFF" ||
              delivery.status === "DELIVERY_VERIFICATION") && (
              <form onSubmit={handleVerifyDropoff} className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                    <KeyRound className="w-4 h-4 text-zinc-400" />
                    Enter Customer Dropoff OTP
                  </div>
                  <input
                    type="text"
                    required
                    value={dropoffOtp}
                    onChange={(e) => setDropoffOtp(e.target.value)}
                    placeholder="Enter 4-digit Customer OTP"
                    className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <p className="text-[11px] text-zinc-500 text-center">
                    Ask the customer for their delivery verification code before handing over the goods.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Verify Dropoff & Complete Order
                </button>
              </form>
            )}
          </div>
        )}

        {/* Stage 3: Completed Banner */}
        {isCompleted && (
          <div className="bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Delivery Completed!</h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              ₹{(delivery.riderPayoutAmountPaise / 100).toFixed(2)} has been credited to your rider account ledger.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
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
              className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
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
          <div className="bg-[#0c0c10] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Cancel Delivery Job
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Frequent cancellations impact your reliability rating. Please select a valid reason.
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full py-2.5 px-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="" className="bg-[#0c0c10] text-zinc-400">Select reason...</option>
              <option value="Vehicle Breakdown" className="bg-[#0c0c10]">Vehicle Breakdown</option>
              <option value="Store Closed / Not Answering" className="bg-[#0c0c10]">Store Closed / Not Answering</option>
              <option value="Customer Unreachable" className="bg-[#0c0c10]">Customer Unreachable</option>
              <option value="Accident / Personal Emergency" className="bg-[#0c0c10]">Accident / Personal Emergency</option>
              <option value="Heavy Rain / Adverse Weather" className="bg-[#0c0c10]">Heavy Rain / Adverse Weather</option>
            </select>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 text-xs font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting || !cancelReason}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
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
          <div className="bg-[#0c0c10] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Report Incident / Damage
            </h3>
            <p className="text-xs text-zinc-400">
              Submit details to protect your account standing during dispatch audits.
            </p>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Incident Category
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full py-2.5 px-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="DAMAGED_PACKAGE" className="bg-[#0c0c10]">Damaged Package on Pickup</option>
                <option value="WRONG_ITEM" className="bg-[#0c0c10]">Wrong Item Handed by Store</option>
                <option value="CUSTOMER_UNREACHABLE" className="bg-[#0c0c10]">Customer Not Answering</option>
                <option value="INCORRECT_ADDRESS" className="bg-[#0c0c10]">Address Incorrect or Remote</option>
                <option value="PACKAGE_LEAKAGE" className="bg-[#0c0c10]">Liquid Leakage / Spill</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Details & Notes
              </label>
              <textarea
                rows={3}
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                placeholder="Explain what occurred..."
                className="w-full py-2.5 px-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReportIncident}
                disabled={submitting || !incidentDesc.trim()}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold disabled:opacity-50 transition-colors"
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
          <div className="bg-[#0c0c10] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Delivery Audit Timeline (Second Precision)
              </h3>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No events recorded yet</p>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono text-[11px]">
                        {evt.status || evt.eventType}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(evt.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-zinc-400 text-[11px]">{evt.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowTimelineModal(false)}
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 text-xs font-semibold transition-colors"
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
