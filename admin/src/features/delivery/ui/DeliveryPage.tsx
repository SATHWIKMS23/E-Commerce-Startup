"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliveryApi } from "../api/deliveryApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/Card";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/Table";
import { Dialog } from "@/shared/components/Dialog";
import { useUIStore } from "@/lib/store/uiStore";
import {
  Truck,
  Activity,
  Clock,
  CheckCircle,
  Users,
  Store,
  DollarSign,
  Settings,
  AlertTriangle,
  MessageSquare,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Ban,
  Building2,
  MapPin,
  RefreshCw,
  Send,
  Eye,
  FileText,
  FileCheck,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  CreditCard,
  Phone,
  Mail,
  AlertOctagon,
  Calendar,
  Award,
  PlayCircle,
  PauseCircle,
} from "lucide-react";

type DeliveryTab =
  | "overview"
  | "riders"
  | "jobs"
  | "pricing"
  | "shops"
  | "payouts"
  | "incidents"
  | "support";

export function DeliveryPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as DeliveryTab) || "overview";
  const [tab, setTab] = useState<DeliveryTab>(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab") as DeliveryTab;
    if (t) setTab(t);
  }, [searchParams]);

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  // Filters & State
  const [riderFilter, setRiderFilter] = useState("ALL");
  const [riderSearch, setRiderSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [riderModalTab, setRiderModalTab] = useState<"profile" | "documents" | "strikes" | "deliveries" | "payouts">("profile");

  // General action modal (Suspend, Ban, Reactivate, Reject, Request Docs)
  const [actionPromptModal, setActionPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "REJECT" | "REQUEST_DOCS" | "SUSPEND" | "BAN" | "REACTIVATE";
    riderId: string;
    riderName: string;
    requireReason?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionType: "SUSPEND",
    riderId: "",
    riderName: "",
    requireReason: true,
    confirmText: "Confirm",
  });
  const [actionModalReason, setActionModalReason] = useState("");

  // Issue Strike modal
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [strikeRiderId, setStrikeRiderId] = useState("");
  const [strikeRiderName, setStrikeRiderName] = useState("");
  const [strikeCurrentCount, setStrikeCurrentCount] = useState(0);
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeSeverity, setStrikeSeverity] = useState("MAJOR");

  // Document reject modal
  const [docRejectModal, setDocRejectModal] = useState<{
    isOpen: boolean;
    docId: string;
    docName: string;
  }>({
    isOpen: false,
    docId: "",
    docName: "",
  });
  const [docRejectReason, setDocRejectReason] = useState("");

  const [jobFilter, setJobFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRiderIdForJob, setSelectedRiderIdForJob] = useState("");

  const [showShopModal, setShowShopModal] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopCategory, setShopCategory] = useState("GROCERY");
  const [shopOwner, setShopOwner] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutRiderId, setPayoutRiderId] = useState("");
  const [payoutAmountPaise, setPayoutAmountPaise] = useState(0);
  const [payoutUtr, setPayoutUtr] = useState("");

  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentPenaltyPaise, setIncidentPenaltyPaise] = useState(0);
  const [incidentResolutionNotes, setIncidentResolutionNotes] = useState("");

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [supportReplyText, setSupportReplyText] = useState("");

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["delivery-stats"],
    queryFn: deliveryApi.getOverviewStats,
    enabled: tab === "overview",
  });

  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ["delivery-riders", riderFilter, riderSearch],
    queryFn: () =>
      deliveryApi.getRiders({
        status: riderFilter === "ALL" ? undefined : riderFilter,
        search: riderSearch || undefined,
      }),
    enabled: tab === "riders" || tab === "jobs",
  });

  const { data: riderDetailData, isLoading: riderDetailLoading } = useQuery({
    queryKey: ["delivery-rider-detail", selectedRider?.id],
    queryFn: () => deliveryApi.getRiderDetail(selectedRider.id),
    enabled: !!selectedRider?.id && showRiderModal,
  });
  const activeRider = riderDetailData?.rider || selectedRider;

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["delivery-jobs", jobFilter],
    queryFn: () =>
      deliveryApi.getJobs({
        status: jobFilter === "ALL" ? undefined : jobFilter,
      }),
    enabled: tab === "jobs" || tab === "overview",
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: deliveryApi.getSettings,
    enabled: tab === "pricing",
  });

  const { data: settingsLogsData } = useQuery({
    queryKey: ["delivery-settings-logs"],
    queryFn: deliveryApi.getSettingsLogs,
    enabled: tab === "pricing",
  });

  const { data: shopsData, isLoading: shopsLoading } = useQuery({
    queryKey: ["delivery-shops"],
    queryFn: deliveryApi.getExternalShops,
    enabled: tab === "shops",
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["delivery-payouts"],
    queryFn: deliveryApi.getPayoutOverview,
    enabled: tab === "payouts",
  });

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ["delivery-incidents"],
    queryFn: deliveryApi.getIncidents,
    enabled: tab === "incidents",
  });

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ["delivery-conversations"],
    queryFn: deliveryApi.getConversations,
    enabled: tab === "support",
  });

  // Settings form state (SSOT)
  const [payoutPercentage, setPayoutPercentage] = useState("90.00");
  const [baseChargePaise, setBaseChargePaise] = useState(3000);
  const [perKmChargePaise, setPerKmChargePaise] = useState(1000);
  const [minDeliveryChargePaise, setMinDeliveryChargePaise] = useState(4000);
  const [dispatchTimeoutSecs, setDispatchTimeoutSecs] = useState(30);
  const [searchRadiusKm, setSearchRadiusKm] = useState(5.0);
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true);

  React.useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setPayoutPercentage(String(s.riderPayoutPercentage || "90.00"));
      setBaseChargePaise(s.baseChargePaise || 3000);
      setPerKmChargePaise(s.perKmChargePaise || 1000);
      setMinDeliveryChargePaise(s.minDeliveryChargePaise || 4000);
      setDispatchTimeoutSecs(s.dispatchTimeoutSecs || 30);
      setSearchRadiusKm(Number(s.searchRadiusKm) || 5.0);
      setIsDeliveryEnabled(s.isDeliveryServiceEnabled ?? true);
    }
  }, [settingsData]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const verifyRiderMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      rejectionReason,
    }: {
      id: string;
      decision: string;
      rejectionReason?: string;
    }) => deliveryApi.verifyRider(id, { decision, rejectionReason }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      setActionPromptModal((prev) => ({ ...prev, isOpen: false }));
      showToast(data?.message || "Rider verification updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const updateRiderStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      deliveryApi.updateRiderStatus(id, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      setActionPromptModal((prev) => ({ ...prev, isOpen: false }));
      showToast("Rider account status updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const issueStrikeMutation = useMutation({
    mutationFn: ({
      riderId,
      reason,
      severity,
    }: {
      riderId: string;
      reason: string;
      severity?: string;
    }) => deliveryApi.issueStrike(riderId, { reason, severity }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      setShowStrikeModal(false);
      setStrikeReason("");
      showToast(data?.message || "Disciplinary strike issued to rider.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const revokeStrikeMutation = useMutation({
    mutationFn: ({ strikeId, reason }: { strikeId: string; reason?: string }) =>
      deliveryApi.revokeStrike(strikeId, { reason }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      showToast(data?.message || "Strike revoked successfully.", "success");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({
      documentId,
      status,
      rejectionReason,
    }: {
      documentId: string;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    }) => deliveryApi.verifyDocument(documentId, { status, rejectionReason }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      setDocRejectModal({ isOpen: false, docId: "", docName: "" });
      setDocRejectReason("");
      showToast(data?.message || "Document verification updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const deleteAadhaarMutation = useMutation({
    mutationFn: (id: string) => deliveryApi.deleteRiderAadhaar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-rider-detail"] });
      showToast("Aadhaar permanently deleted with zero trace.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  // Action helpers
  const openApproveRider = (rider: any) => {
    verifyRiderMutation.mutate({
      id: rider.id,
      decision: "APPROVED",
    });
  };

  const openRejectRider = (rider: any) => {
    setActionPromptModal({
      isOpen: true,
      title: `Reject Application: ${rider.firstName} ${rider.lastName}`,
      description: "Specify the exact reason for rejecting this rider's application. The rider will be notified.",
      actionType: "REJECT",
      riderId: rider.id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      requireReason: true,
      confirmText: "Confirm Rejection",
    });
    setActionModalReason("");
  };

  const openRequestDocs = (rider: any) => {
    setActionPromptModal({
      isOpen: true,
      title: `Request Additional Documents: ${rider.firstName} ${rider.lastName}`,
      description: "Specify which documents or corrections are required (e.g. upload clear driving licence photo, valid vehicle insurance certificate).",
      actionType: "REQUEST_DOCS",
      riderId: rider.id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      requireReason: true,
      confirmText: "Request Resubmission",
    });
    setActionModalReason("");
  };

  const openSuspendRider = (rider: any) => {
    setActionPromptModal({
      isOpen: true,
      title: `Suspend Delivery Agent: ${rider.firstName} ${rider.lastName}`,
      description: "Suspending this rider immediately sets their account offline and revokes their dispatch assignment capability. Enter the suspension reason.",
      actionType: "SUSPEND",
      riderId: rider.id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      requireReason: true,
      confirmText: "Suspend Agent",
    });
    setActionModalReason("");
  };

  const openReactivateRider = (rider: any) => {
    setActionPromptModal({
      isOpen: true,
      title: `Reactivate Delivery Agent: ${rider.firstName} ${rider.lastName}`,
      description: "This will restore the delivery agent's account to ACTIVE status and allow them to take delivery assignments.",
      actionType: "REACTIVATE",
      riderId: rider.id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      requireReason: false,
      confirmText: "Reactivate Agent",
    });
    setActionModalReason("");
  };

  const openBanRider = (rider: any) => {
    setActionPromptModal({
      isOpen: true,
      title: `Permanently Ban Delivery Agent: ${rider.firstName} ${rider.lastName}`,
      description: "Are you sure? This permanently bans the delivery agent from the AtlasBasket delivery platform.",
      actionType: "BAN",
      riderId: rider.id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      requireReason: true,
      confirmText: "Ban Permanently",
    });
    setActionModalReason("");
  };

  const openIssueStrike = (rider: any) => {
    setStrikeRiderId(rider.id);
    setStrikeRiderName(`${rider.firstName} ${rider.lastName}`);
    setStrikeCurrentCount(rider.strikeCount || 0);
    setStrikeReason("");
    setStrikeSeverity("MAJOR");
    setShowStrikeModal(true);
  };

  const handleConfirmActionModal = () => {
    const { actionType, riderId } = actionPromptModal;
    if (actionType === "REJECT") {
      verifyRiderMutation.mutate({
        id: riderId,
        decision: "REJECTED",
        rejectionReason: actionModalReason || "Application criteria not met",
      });
    } else if (actionType === "REQUEST_DOCS") {
      verifyRiderMutation.mutate({
        id: riderId,
        decision: "ACTION_REQUIRED",
        rejectionReason: actionModalReason || "Please re-upload required documents",
      });
    } else if (actionType === "SUSPEND") {
      updateRiderStatusMutation.mutate({
        id: riderId,
        status: "SUSPENDED",
        reason: actionModalReason || "Suspended by administrator",
      });
    } else if (actionType === "BAN") {
      updateRiderStatusMutation.mutate({
        id: riderId,
        status: "BANNED",
        reason: actionModalReason || "Banned by administrator",
      });
    } else if (actionType === "REACTIVATE") {
      updateRiderStatusMutation.mutate({
        id: riderId,
        status: "ACTIVE",
        reason: actionModalReason || "Reactivated by administrator",
      });
    }
  };

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-settings-logs"] });
      showToast("Delivery pricing & dispatch configuration updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const assignRiderMutation = useMutation({
    mutationFn: ({
      jobId,
      riderId,
    }: {
      jobId: string;
      riderId: string;
    }) => deliveryApi.manualAssignRider(jobId, riderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-jobs"] });
      setShowAssignModal(false);
      showToast("Rider manually assigned to job.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const createShopMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.createExternalShop(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-shops"] });
      setShowShopModal(false);
      showToast("External shop registered successfully.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const processPayoutMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.processPayout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-payouts"] });
      setShowPayoutModal(false);
      showToast("Payout recorded and marked as paid.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: any;
    }) => deliveryApi.resolveIncident(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-incidents"] });
      setShowIncidentModal(false);
      showToast("Incident resolved and penalty/ledger updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const stats = statsData?.stats;
  const riders = ridersData?.riders || [];
  const jobs = jobsData?.jobs || [];
  const shops = shopsData?.shops || [];
  const payouts = payoutsData?.payouts || [];
  const pendingRidersPayout = payoutsData?.pendingRiders || [];
  const incidents = incidentsData?.incidents || [];
  const strikeAppeals = incidentsData?.strikeAppeals || [];
  const conversations = convsData?.conversations || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white/95">
              AtlasBasket Delivery Platform
            </h1>
            <p className="text-xs text-white/45 mt-0.5">
              Central dispatch operations, rider fleet, pricing rules & local merchant logistics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-mono text-xs">
            Mysuru Fleet Active
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "riders", label: "Rider Fleet", icon: Users },
          { id: "jobs", label: "Live Jobs", icon: Truck },
          { id: "pricing", label: "Pricing & Dispatch Rules", icon: Settings },
          { id: "shops", label: "External Shops", icon: Store },
          { id: "payouts", label: "Rider Payouts", icon: DollarSign },
          { id: "incidents", label: "Damage & Disputes", icon: AlertTriangle },
          { id: "support", label: "Rider Support Chat", icon: MessageSquare },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as DeliveryTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Approved Riders",
                value: stats?.totalApprovedRiders ?? 0,
                desc: `${stats?.onlineRidersCount ?? 0} currently Online`,
                icon: Users,
                color: "text-emerald-400",
              },
              {
                label: "Active Deliveries",
                value: stats?.activeDeliveriesCount ?? 0,
                desc: `${stats?.inTransitCount ?? 0} in transit`,
                icon: Activity,
                color: "text-blue-400",
              },
              {
                label: "Completed Today",
                value: stats?.completedTodayCount ?? 0,
                desc: "100% OTP / QR verified",
                icon: CheckCircle,
                color: "text-teal-400",
              },
              {
                label: "Today's Delivery GMV",
                value: `₹${(((stats?.todayGmvPaise ?? 0) / 100)).toFixed(2)}`,
                desc: "Total delivery charges billed",
                icon: DollarSign,
                color: "text-amber-400",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="border border-white/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      {m.label}
                    </span>
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-black text-white/95">{m.value}</p>
                    <p className="text-[11px] text-white/40 mt-1">{m.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Active Deliveries Snapshot */}
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Recent Active Dispatches
              </CardTitle>
              <CardDescription>Real-time delivery status in Mysuru zone</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {jobs.slice(0, 5).length === 0 ? (
                <div className="text-center py-12 text-white/30 text-xs">
                  No active delivery jobs at the moment
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Pickup Store</TableHead>
                      <TableHead>Customer Dropoff</TableHead>
                      <TableHead>Assigned Rider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.slice(0, 5).map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-mono text-xs text-emerald-400">
                          #{j.trackingNumber || j.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs text-white/70">
                          {j.pickupContactName || "Store"} - {j.pickupAddress}
                        </TableCell>
                        <TableCell className="text-xs text-white/70">
                          {j.dropoffContactName || "Customer"} - {j.dropoffAddress}
                        </TableCell>
                        <TableCell className="text-xs text-white/60">
                          {j.deliveryPartner
                            ? `${j.deliveryPartner.firstName} ${j.deliveryPartner.lastName}`
                            : "Searching eligible rider..."}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">
                            {j.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-white/90">
                          ₹{(j.riderPayoutAmountPaise / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: RIDER FLEET ──────────────────────────────────────────────── */}
      {tab === "riders" && (
        <Card className="border border-white/5 space-y-4">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xs font-bold text-white/90">
                  Rider Fleet Operations & Disciplinary Enforcement
                </CardTitle>
                <CardDescription>
                  Verify credentials, manage agent lifecycle (approve, suspend, ban), enforce 3-strike policy, and review compliance documents
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={riderSearch}
                    onChange={(e) => setRiderSearch(e.target.value)}
                    placeholder="Search name, phone, email, plate..."
                    className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                <select
                  value={riderFilter}
                  onChange={(e) => setRiderFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 py-1.5 px-2.5"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses ({riders.length})</option>
                  <option value="PENDING" className="bg-slate-900">Pending Review</option>
                  <option value="ACTION_REQUIRED" className="bg-slate-900">Action / Docs Required</option>
                  <option value="APPROVED" className="bg-slate-900">Approved Fleet</option>
                  <option value="SUSPENDED" className="bg-slate-900">Suspended / Strikes</option>
                  <option value="BANNED" className="bg-slate-900">Banned Agents</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {ridersLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : riders.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-xs">
                No delivery agents match the selected filter
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery Agent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle & DL</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Status & Strikes</TableHead>
                    <TableHead>Rating & Deliveries</TableHead>
                    <TableHead className="text-right">Admin Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.map((r: any) => {
                    const isPending = r.verificationStatus === "PENDING" || r.verificationStatus === "ACTION_REQUIRED";
                    const isApproved = r.verificationStatus === "APPROVED";
                    const isActive = r.status === "ACTIVE";
                    const isSuspended = r.status === "SUSPENDED" || r.verificationStatus === "SUSPENDED";
                    const isBanned = r.status === "BANNED" || r.verificationStatus === "BANNED";
                    const strikeCount = r.strikeCount || 0;

                    return (
                      <TableRow key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                              {r.firstName?.[0] || "R"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-white/95">
                                  {r.firstName} {r.lastName}
                                </span>
                                {r.isAvailable ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-white/30 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    Offline
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40 font-mono">
                                ID: #{r.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-white/70">
                          <div className="flex items-center gap-1 text-white/80">
                            <Phone className="w-3 h-3 text-white/40" />
                            <span>{r.phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-white/40 mt-0.5">
                            <Mail className="w-3 h-3 text-white/30" />
                            <span className="truncate max-w-[140px]">{r.email}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-white/70">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-white/80">
                            {r.vehicleType?.replace(/_/g, " ") || "Bicycle"}
                          </span>
                          <span className="block text-[10px] text-white/40 font-mono mt-0.5">
                            Plate: {r.vehicleNumber || "Exempt"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              r.verificationStatus === "APPROVED"
                                ? "default"
                                : r.verificationStatus === "PENDING"
                                ? "warning"
                                : r.verificationStatus === "ACTION_REQUIRED"
                                ? "outline"
                                : "destructive"
                            }
                            className="text-[9px] font-bold"
                          >
                            {r.verificationStatus}
                          </Badge>
                          {r.rejectionReason && (
                            <span className="block text-[9px] text-rose-400/80 truncate max-w-[120px] mt-0.5">
                              {r.rejectionReason}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant={
                                isActive ? "default" : isSuspended ? "warning" : "destructive"
                              }
                              className="text-[9px]"
                            >
                              {isBanned ? "BANNED" : isSuspended ? "SUSPENDED" : "ACTIVE"}
                            </Badge>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                strikeCount === 0
                                  ? "text-white/40 border-white/5 bg-white/[0.02]"
                                  : strikeCount === 1
                                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10 font-bold"
                                  : strikeCount === 2
                                  ? "text-orange-400 border-orange-500/30 bg-orange-500/10 font-bold"
                                  : "text-rose-400 border-rose-500/40 bg-rose-500/10 font-black animate-pulse"
                              }`}
                            >
                              {strikeCount === 0 ? "0/3 Strikes" : strikeCount >= 3 ? "🚨 3/3 STRIKES (BANNED)" : `⚠️ ${strikeCount}/3 Strikes`}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          <span className="text-amber-400 font-mono font-bold">
                            ★ {r.rating ? Number(r.rating).toFixed(1) : "5.0"}
                          </span>
                          <span className="block text-[10px] text-white/40 font-mono mt-0.5">
                            {r.completedDeliveriesCount || r._count?.deliveries || 0} completed
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Primary Profile Review Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-white/90 border-white/10 hover:bg-white/10"
                              onClick={() => {
                                setSelectedRider(r);
                                setRiderModalTab("profile");
                                setShowRiderModal(true);
                              }}
                              title="View full agent details and actions"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                              Review
                            </Button>

                            {/* Inline Quick Actions */}
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  onClick={() => openApproveRider(r)}
                                  title="Quick Approve for Fleet"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                  onClick={() => openRequestDocs(r)}
                                  title="Request Additional Documents"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                  onClick={() => openRejectRider(r)}
                                  title="Reject Application"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                {isActive && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                      onClick={() => openSuspendRider(r)}
                                      title="Suspend Delivery Agent"
                                    >
                                      <ShieldOff className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                      onClick={() => openIssueStrike(r)}
                                      title="Issue Disciplinary Strike"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}

                                {isSuspended && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                      onClick={() => openReactivateRider(r)}
                                      title="Reactivate / Lift Suspension"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                      onClick={() => openBanRider(r)}
                                      title="Permanent Ban"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}

                                {isBanned && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    onClick={() => openReactivateRider(r)}
                                    title="Unban and Reinstate"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Jump to Chat with this Rider */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              onClick={() => {
                                setTab("support");
                              }}
                              title="Message Rider in Support Inbox"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 3: LIVE JOBS & DISPATCH ─────────────────────────────────────── */}
      {tab === "jobs" && (
        <Card className="border border-white/5 space-y-4">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xs font-bold text-white/90">
                  Delivery Dispatch Management
                </CardTitle>
                <CardDescription>
                  Monitor assignment timeouts, reroute unassigned orders, and review audit events
                </CardDescription>
              </div>

              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 py-1.5 px-2.5"
              >
                <option value="ALL" className="bg-slate-900">All Delivery Jobs</option>
                <option value="SEARCHING_FOR_RIDER" className="bg-slate-900">Searching Dispatch</option>
                <option value="ASSIGNED" className="bg-slate-900">Assigned</option>
                <option value="IN_TRANSIT" className="bg-slate-900">In Transit</option>
                <option value="DELIVERED" className="bg-slate-900">Delivered</option>
                <option value="CANCELLED" className="bg-slate-900">Cancelled</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {jobsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-xs">
                No jobs match the selected filter
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Store / Origin</TableHead>
                    <TableHead>Customer Dropoff</TableHead>
                    <TableHead>Rider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>OTP Hashes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs text-emerald-400">
                        #{j.trackingNumber || j.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {j.pickupContactName || "Store"} <br />
                        <span className="text-[10px] text-white/40">{j.pickupAddress}</span>
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {j.dropoffContactName || "Customer"} <br />
                        <span className="text-[10px] text-white/40">{j.dropoffAddress}</span>
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {j.deliveryPartner ? (
                          `${j.deliveryPartner.firstName} ${j.deliveryPartner.lastName}`
                        ) : (
                          <span className="text-amber-400 font-bold">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px]">
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-white/40">
                        Pickup: {j.pickupVerificationCode ? "Active" : "—"} | Dropoff:{" "}
                        {j.dropoffOtpHash ? "Hashed" : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {!j.deliveryPartner && j.status !== "DELIVERED" && j.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] text-emerald-400 border-emerald-500/30"
                            onClick={() => {
                              setSelectedJob(j);
                              setShowAssignModal(true);
                            }}
                          >
                            Assign Rider
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 4: PRICING & DISPATCH RULES (SSOT) ──────────────────────────── */}
      {tab === "pricing" && (
        <div className="space-y-6">
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Global Delivery Pricing & Dispatch Policies (SSOT)
              </CardTitle>
              <CardDescription>
                Admin Panel is the central single source of truth. Changes do not retroactively modify completed deliveries.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Rider Payout Share (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={payoutPercentage}
                    onChange={(e) => setPayoutPercentage(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Default 90% rider, 10% platform commission. Tips are 100% rider.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Base Delivery Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={baseChargePaise / 100}
                    onChange={(e) => setBaseChargePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Base pickup fee (default ₹30.00)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Per-Km Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={perKmChargePaise / 100}
                    onChange={(e) => setPerKmChargePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Rate per kilometer (default ₹10.00/km)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Minimum Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={minDeliveryChargePaise / 100}
                    onChange={(e) => setMinDeliveryChargePaise(Math.round(Number(e.target.value) * 100))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Floor pricing for any job (default ₹40.00)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Dispatch Acceptance Timeout (Seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={dispatchTimeoutSecs}
                    onChange={(e) => setDispatchTimeoutSecs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Configurable countdown before next rider offer (default 30s)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">
                    Rider Search Radius (km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="25"
                    value={searchRadiusKm}
                    onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Radius around merchant for eligible riders (default 5.0 km)
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableDelivery"
                    checked={isDeliveryEnabled}
                    onChange={(e) => setIsDeliveryEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500"
                  />
                  <label htmlFor="enableDelivery" className="text-xs text-white/80 font-medium">
                    Enable AtlasBasket Delivery Service across Mysuru
                  </label>
                </div>

                <Button
                  isLoading={saveSettingsMutation.isPending}
                  onClick={() =>
                    saveSettingsMutation.mutate({
                      riderPayoutPercentage: Number(payoutPercentage),
                      baseChargePaise,
                      perKmChargePaise,
                      minDeliveryChargePaise,
                      dispatchTimeoutSecs,
                      searchRadiusKm,
                      isDeliveryServiceEnabled: isDeliveryEnabled,
                    })
                  }
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Save Global Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail of Changes */}
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Configuration Audit Log
              </CardTitle>
              <CardDescription>Second-precision log of all policy modifications</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(!settingsLogsData?.logs || settingsLogsData.logs.length === 0) ? (
                <div className="text-center py-10 text-white/30 text-xs">
                  No configuration updates logged yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Changed</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead className="text-right">Timestamp (Asia/Kolkata)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settingsLogsData.logs.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs text-emerald-400">
                          {l.fieldName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white/50">{l.oldValue}</TableCell>
                        <TableCell className="font-mono text-xs text-white/90">{l.newValue}</TableCell>
                        <TableCell className="text-xs text-white/60">{l.adminEmail || "Admin"}</TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-white/40">
                          {new Date(l.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 5: EXTERNAL SHOPS ───────────────────────────────────────────── */}
      {tab === "shops" && (
        <Card className="border border-white/5 space-y-4">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xs font-bold text-white/90">
                  External Local Shops
                </CardTitle>
                <CardDescription>
                  Pharmacies, bakeries, florist, and local stores utilizing AtlasBasket delivery network
                </CardDescription>
              </div>

              <Button
                onClick={() => setShowShopModal(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Register Local Shop
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {shopsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-xs">
                No external shops registered yet. Click &quot;Register Local Shop&quot; to add one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner & Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold text-xs text-white/90">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {s.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {s.contactPerson} • {s.contactPhone}
                      </TableCell>
                      <TableCell className="text-xs text-white/60">{s.address}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "default" : "destructive"} className="text-[9px]">
                          {s.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] text-emerald-400 border-emerald-500/30"
                          onClick={() => {
                            const recipientName = prompt("Recipient Name:");
                            const recipientPhone = prompt("Recipient Phone:");
                            const dropoffAddress = prompt("Customer Dropoff Address in Mysuru:");
                            if (recipientName && recipientPhone && dropoffAddress) {
                              deliveryApi.requestShopDelivery(s.id, {
                                dropoffContactName: recipientName,
                                dropoffContactPhone: recipientPhone,
                                dropoffAddress,
                                packageDescription: "External store order",
                              }).then(() => {
                                showToast("Delivery requested for external shop!", "info");
                                queryClient.invalidateQueries({ queryKey: ["delivery-jobs"] });
                              }).catch((err) => showToast(err.message, "error"));
                            }
                          }}
                        >
                          Request Delivery
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 6: RIDER PAYOUTS ────────────────────────────────────────────── */}
      {tab === "payouts" && (
        <div className="space-y-6">
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-white/90">
                    Riders Awaiting Disbursal
                  </CardTitle>
                  <CardDescription>
                    Completed orders with pending balances ready for electronic settlement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingRidersPayout.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-xs">
                  All rider balances are currently reconciled and disbursed.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Completed Orders</TableHead>
                      <TableHead>Pending Balance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRidersPayout.map((pr: any) => (
                      <TableRow key={pr.riderId}>
                        <TableCell className="font-semibold text-xs text-white/90">
                          {pr.riderName}
                        </TableCell>
                        <TableCell className="text-xs text-white/60 font-mono">
                          {pr.bankName} • {pr.accountNumber} • {pr.ifsc}
                        </TableCell>
                        <TableCell className="text-xs text-white/70 font-mono">
                          {pr.completedCount} orders
                        </TableCell>
                        <TableCell className="text-base font-black text-emerald-400 font-mono">
                          ₹{(pr.pendingAmountPaise / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] h-7"
                            onClick={() => {
                              setPayoutRiderId(pr.riderId);
                              setPayoutAmountPaise(pr.pendingAmountPaise);
                              setPayoutUtr("");
                              setShowPayoutModal(true);
                            }}
                          >
                            Disburse Funds
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Past Disbursals Table */}
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Disbursal Records & UTR Ledger
              </CardTitle>
              <CardDescription>Historical payout receipts with bank transaction references</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-xs">
                  No past payout records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout #</TableHead>
                      <TableHead>Rider</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank UTR Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date (Asia/Kolkata)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((po: any) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-xs text-white/80">{po.payoutNumber}</TableCell>
                        <TableCell className="text-xs text-white/70">
                          {po.deliveryPartner
                            ? `${po.deliveryPartner.firstName} ${po.deliveryPartner.lastName}`
                            : "Rider"}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-emerald-400">
                          ₹{(po.amountPaise / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white/50">
                          {po.bankReference || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-[9px]">
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-white/40">
                          {new Date(po.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 7: DAMAGE & DISPUTES ────────────────────────────────────────── */}
      {tab === "incidents" && (
        <div className="space-y-6">
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Reported Incidents & Damage Claims
              </CardTitle>
              <CardDescription>
                Review package damage reports. Confirmed rider faults deduct 20% order penalty and issue a disciplinary strike.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-xs">
                  Zero reported incidents. All orders operating normally.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery #</TableHead>
                      <TableHead>Incident Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rider Response</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((inc: any) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-xs text-emerald-400">
                          #{inc.delivery?.trackingNumber || inc.deliveryId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-white/80">
                          {inc.incidentType}
                        </TableCell>
                        <TableCell className="text-xs text-white/60 max-w-xs truncate">
                          {inc.description}
                        </TableCell>
                        <TableCell className="text-xs text-white/60 max-w-xs truncate">
                          {inc.riderResponse || <span className="text-white/30 italic">No response</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">
                            {inc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inc.status === "PENDING" && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                              onClick={() => {
                                setSelectedIncident(inc);
                                setIncidentPenaltyPaise(
                                  Math.round((inc.delivery?.riderPayoutAmountPaise || 5000) * 0.2)
                                );
                                setIncidentResolutionNotes("");
                                setShowIncidentModal(true);
                              }}
                            >
                              Adjudicate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Strike Appeals Section */}
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">
                Rider Disciplinary Strike Appeals
              </CardTitle>
              <CardDescription>Riders appealing 3-strike suspensions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {strikeAppeals.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-xs">
                  No active strike appeals pending review.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rider</TableHead>
                      <TableHead>Original Strike Reason</TableHead>
                      <TableHead>Rider&apos;s Appeal Statement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strikeAppeals.map((sa: any) => (
                      <TableRow key={sa.id}>
                        <TableCell className="text-xs font-bold text-white/90">
                          {sa.deliveryPartner?.firstName} {sa.deliveryPartner?.lastName}
                        </TableCell>
                        <TableCell className="text-xs text-rose-400">{sa.reason}</TableCell>
                        <TableCell className="text-xs text-white/70 max-w-sm">
                          {sa.appealNotes}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                            onClick={() => {
                              deliveryApi.reviewStrikeAppeal(sa.id, {
                                decision: "OVERTURNED",
                                reviewNotes: "Appeal accepted by admin.",
                              }).then(() => {
                                showToast("Strike overturned! Rider reinstated.", "info");
                                queryClient.invalidateQueries({ queryKey: ["delivery-incidents"] });
                              });
                            }}
                          >
                            Overturn Strike
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => {
                              deliveryApi.reviewStrikeAppeal(sa.id, {
                                decision: "UPHELD",
                                reviewNotes: "Evidence confirms violation.",
                              }).then(() => {
                                showToast("Strike upheld.", "info");
                                queryClient.invalidateQueries({ queryKey: ["delivery-incidents"] });
                              });
                            }}
                          >
                            Uphold Strike
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 8: RIDER SUPPORT CHAT INBOX ─────────────────────────────────── */}
      {tab === "support" && (
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">
              Rider Dispatch Support Inbox
            </CardTitle>
            <CardDescription>Live real-time messaging with delivery partners on duty</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="border border-white/10 rounded-2xl p-3 space-y-2 max-h-[500px] overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 block mb-2">
                  Active Conversations
                </span>
                {conversations.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">No support inquiries</p>
                ) : (
                  conversations.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConvId(c.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedConvId === c.id
                          ? "bg-white/10 border-emerald-500/50 text-white"
                          : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white/90">
                          {c.deliveryPartner
                            ? `${c.deliveryPartner.firstName} ${c.deliveryPartner.lastName}`
                            : "Rider"}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {new Date(c.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate">
                        {c.messages?.[0]?.message || c.subject}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat View */}
              <div className="md:col-span-2 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[460px]">
                {!selectedConvId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-xs">
                    <MessageSquare className="w-8 h-8 mb-2" />
                    Select a conversation to reply to rider
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-3 p-2">
                      {conversations
                        .find((c: any) => c.id === selectedConvId)
                        ?.messages?.map((m: any) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${
                              m.senderType === "ADMIN" ? "items-end" : "items-start"
                            }`}
                          >
                            <span className="text-[10px] text-white/40 mb-1 px-1">
                              {m.senderType === "ADMIN" ? "Admin Dispatch" : m.senderName || "Rider"}
                            </span>
                            <div
                              className={`max-w-[75%] rounded-2xl p-3 text-xs ${
                                m.senderType === "ADMIN"
                                  ? "bg-emerald-500 text-slate-950 font-medium"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {m.message}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex gap-2">
                      <input
                        type="text"
                        value={supportReplyText}
                        onChange={(e) => setSupportReplyText(e.target.value)}
                        placeholder="Type reply to rider..."
                        className="flex-1 py-2 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                      <Button
                        size="sm"
                        disabled={!supportReplyText.trim()}
                        onClick={() => {
                          showToast("Reply sent to rider.", "info");
                          setSupportReplyText("");
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── REVIEW & 360° AGENT MANAGEMENT MODAL ─────────────────────────── */}
      <Dialog
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
        title={
          activeRider
            ? `Delivery Agent: ${activeRider.firstName} ${activeRider.lastName}`
            : "Delivery Agent Management"
        }
        description="Verify credentials, manage account status, review documents, and enforce 3-strike disciplinary policies"
        maxWidth="max-w-4xl"
      >
        {activeRider && (
          <div className="space-y-5 text-xs">
            {/* Top Status & Agent Hero Bar */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-400 shrink-0">
                  {activeRider.firstName?.[0] || "R"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white/95">
                      {activeRider.firstName} {activeRider.lastName}
                    </h3>
                    <Badge
                      variant={
                        activeRider.status === "ACTIVE"
                          ? "default"
                          : activeRider.status === "SUSPENDED"
                          ? "warning"
                          : "destructive"
                      }
                      className="text-[10px] font-bold"
                    >
                      {activeRider.status}
                    </Badge>
                    <Badge
                      variant={
                        activeRider.verificationStatus === "APPROVED"
                          ? "default"
                          : activeRider.verificationStatus === "PENDING"
                          ? "warning"
                          : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {activeRider.verificationStatus}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-white/50">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-white/30" /> {activeRider.phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-white/30" /> {activeRider.email}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                      ★ {activeRider.rating ? Number(activeRider.rating).toFixed(1) : "5.0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="block text-[9px] text-white/40 uppercase font-bold tracking-wider">
                    Strikes Count
                  </span>
                  <span
                    className={`text-xs font-mono font-black ${
                      (activeRider.strikeCount || 0) === 0
                        ? "text-white/60"
                        : (activeRider.strikeCount || 0) >= 3
                        ? "text-rose-400 animate-pulse"
                        : "text-amber-400"
                    }`}
                  >
                    {activeRider.strikeCount || 0} / 3 Strikes
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="block text-[9px] text-white/40 uppercase font-bold tracking-wider">
                    Duty State
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      activeRider.isAvailable ? "text-emerald-400" : "text-white/40"
                    }`}
                  >
                    {activeRider.isAvailable ? "● Online" : "○ Offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── PRIMARY ADMINISTRATIVE ACTIONS BAR ─────────────────────────── */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Administrative Action Controls
                </span>
                <span className="text-[10px] text-white/30">Actions apply immediately with audit log</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* 1. Verification Actions */}
                {activeRider.verificationStatus !== "APPROVED" && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                      isLoading={verifyRiderMutation.isPending}
                      onClick={() => openApproveRider(activeRider)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Agent for Fleet
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-blue-400 border-blue-500/30 hover:bg-blue-500/10 text-xs gap-1.5"
                      onClick={() => openRequestDocs(activeRider)}
                    >
                      <FileText className="w-4 h-4" />
                      Request Additional Docs
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => openRejectRider(activeRider)}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Application
                    </Button>
                  </>
                )}

                {/* 2. Account Lifecycle Actions */}
                {activeRider.verificationStatus === "APPROVED" && (
                  <>
                    {activeRider.status === "ACTIVE" && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5"
                          onClick={() => openSuspendRider(activeRider)}
                        >
                          <ShieldOff className="w-4 h-4" />
                          Suspend Agent
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5"
                          onClick={() => openIssueStrike(activeRider)}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Issue Disciplinary Strike
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => openBanRider(activeRider)}
                        >
                          <Ban className="w-4 h-4" />
                          Ban Agent Permanently
                        </Button>
                      </>
                    )}

                    {activeRider.status === "SUSPENDED" && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                          isLoading={updateRiderStatusMutation.isPending}
                          onClick={() => openReactivateRider(activeRider)}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Reactivate / Reinstate Agent
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5"
                          onClick={() => openIssueStrike(activeRider)}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Issue Additional Strike
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => openBanRider(activeRider)}
                        >
                          <Ban className="w-4 h-4" />
                          Ban Agent Permanently
                        </Button>
                      </>
                    )}

                    {activeRider.status === "BANNED" && (
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                        isLoading={updateRiderStatusMutation.isPending}
                        onClick={() => openReactivateRider(activeRider)}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Lift Ban & Reinstate Agent
                      </Button>
                    )}
                  </>
                )}

                {/* 3. Direct Message Shortcut */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 text-xs gap-1.5 ml-auto"
                  onClick={() => {
                    setShowRiderModal(false);
                    setTab("support");
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat in Support Inbox
                </Button>
              </div>
            </div>

            {/* Modal Internal Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-white/10 pb-2">
              {[
                { id: "profile", label: "Profile & Vehicle", icon: Users },
                {
                  id: "documents",
                  label: `KYC & Documents (${activeRider.documents?.length || 0})`,
                  icon: FileCheck,
                },
                {
                  id: "strikes",
                  label: `Strikes & Enforcement (${activeRider.strikes?.length || 0})`,
                  icon: AlertTriangle,
                },
                {
                  id: "deliveries",
                  label: `Delivery Jobs (${activeRider.deliveries?.length || activeRider.completedDeliveriesCount || 0})`,
                  icon: Truck,
                },
                {
                  id: "payouts",
                  label: `Banking & Payouts (${activeRider.payouts?.length || 0})`,
                  icon: DollarSign,
                },
              ].map((subTab) => {
                const Icon = subTab.icon;
                const active = riderModalTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setRiderModalTab(subTab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-white/10 text-white shadow-sm border border-white/10"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── MODAL TAB 1: PROFILE & VEHICLE ─────────────────────────────── */}
            {riderModalTab === "profile" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Personal Identity Card */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" /> Personal Identity & Residence
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white/40 text-[10px] block">Full Name</span>
                        <p className="font-semibold text-white/90">
                          {activeRider.firstName} {activeRider.lastName}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Active District</span>
                        <p className="font-semibold text-white/90">{activeRider.city || "Mysuru"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Phone Number</span>
                        <p className="font-mono text-white/90">{activeRider.phone}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Email Address</span>
                        <p className="font-mono text-white/70 truncate">{activeRider.email}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/40 text-[10px] block">Residential Address</span>
                        <p className="text-white/80">
                          {activeRider.residentialAddress || "Not provided / Address on file"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Emergency Contact</span>
                        <p className="text-white/70">
                          {activeRider.emergencyContactName
                            ? `${activeRider.emergencyContactName} (${activeRider.emergencyContactPhone || ""})`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Registered On</span>
                        <p className="text-white/70">
                          {activeRider.createdAt
                            ? new Date(activeRider.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle & Driving Credentials Card */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-blue-400" /> Vehicle & Driving Credentials
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white/40 text-[10px] block">Vehicle Classification</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-white/90 mt-0.5">
                          {activeRider.vehicleType?.replace(/_/g, " ") || "Bicycle"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Vehicle Plate Number</span>
                        <p className="font-mono text-white/90 font-bold">
                          {activeRider.vehicleNumber || "Exempt / Pending"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Driving Licence #</span>
                        <p className="font-mono text-white/90">
                          {activeRider.vehicleType === "BICYCLE"
                            ? "DL Exempt (Bicycle)"
                            : activeRider.licenseNumber || activeRider.drivingLicenseNumber || "Pending"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Vehicle RC Number</span>
                        <p className="font-mono text-white/90">
                          {activeRider.rcNumber || "Pending"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Insurance Policy #</span>
                        <p className="font-mono text-white/90">
                          {activeRider.insuranceNumber || "Pending"}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/40 text-[10px] block">Approval Timestamp</span>
                        <p className="text-white/70">
                          {activeRider.approvedAt
                            ? new Date(activeRider.approvedAt).toLocaleDateString()
                            : "Pending Admin Approval"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Customer Rating",
                      value: `★ ${activeRider.rating ? Number(activeRider.rating).toFixed(1) : "5.0"}`,
                      sub: `${activeRider.totalRatings || 0} reviews`,
                      color: "text-amber-400",
                    },
                    {
                      label: "Completed Jobs",
                      value: activeRider.completedDeliveriesCount || activeRider._count?.deliveries || 0,
                      sub: "100% verified drops",
                      color: "text-emerald-400",
                    },
                    {
                      label: "Cancelled Deliveries",
                      value: activeRider.cancelledDeliveriesCount || 0,
                      sub: "Acceptance dropoffs",
                      color: "text-rose-400",
                    },
                    {
                      label: "Active Disciplinary Strikes",
                      value: `${activeRider.strikeCount || 0} / 3`,
                      sub: (activeRider.strikeCount || 0) >= 3 ? "Auto-Suspended" : "Within quota",
                      color: (activeRider.strikeCount || 0) >= 3 ? "text-rose-400" : "text-white/90",
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/10"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                        {m.label}
                      </span>
                      <p className={`text-xl font-black font-mono ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── MODAL TAB 2: KYC & DOCUMENTS VERIFICATION ───────────────────── */}
            {riderModalTab === "documents" && (
              <div className="space-y-4">
                {/* Aadhaar Compliance Card */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        UIDAI Aadhaar Identity Verification
                      </span>
                      <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
                        UIDAI Compliant
                      </Badge>
                    </div>
                    <p className="font-mono text-emerald-400 text-xs font-bold">
                      Masked Number: {activeRider.aadhaarNumberMasked || "None provided / Purged"}
                    </p>
                    <p className="text-[10px] text-white/40">
                      Raw document data is automatically shredded per Indian data protection standards.
                    </p>
                  </div>

                  {activeRider.aadhaarNumberMasked && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs shrink-0"
                      isLoading={deleteAadhaarMutation.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to permanently purge this rider's Aadhaar records? This action cannot be reversed."
                          )
                        ) {
                          deleteAadhaarMutation.mutate(activeRider.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Purge Aadhaar Record
                    </Button>
                  )}
                </div>

                {/* Uploaded Verification Documents */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                    Mandatory Vehicle & Identity Documents
                  </span>

                  {(!activeRider.documents || activeRider.documents.length === 0) ? (
                    <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.02] text-white/40 text-xs">
                      No document uploads on file yet for this rider.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeRider.documents.map((doc: any) => {
                        const isDocApproved = doc.status === "APPROVED";
                        const isDocRejected = doc.status === "REJECTED";

                        return (
                          <div
                            key={doc.id}
                            className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-white/90 block">
                                  {doc.documentType?.replace(/_/g, " ")}
                                </span>
                                {doc.documentNumber && (
                                  <span className="font-mono text-[10px] text-white/50 block">
                                    Number: {doc.documentNumber}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant={
                                  isDocApproved
                                    ? "default"
                                    : isDocRejected
                                    ? "destructive"
                                    : "warning"
                                }
                                className="text-[9px]"
                              >
                                {doc.status}
                              </Badge>
                            </div>

                            {doc.rejectionReason && (
                              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300">
                                <strong>Rejection Reason:</strong> {doc.rejectionReason}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              {doc.documentUrl ? (
                                <a
                                  href={doc.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Uploaded Document
                                </a>
                              ) : (
                                <span className="text-[10px] text-white/30 italic">
                                  No file attached
                                </span>
                              )}

                              <div className="flex items-center gap-1.5">
                                {!isDocApproved && (
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                    isLoading={verifyDocMutation.isPending}
                                    onClick={() =>
                                      verifyDocMutation.mutate({
                                        documentId: doc.id,
                                        status: "APPROVED",
                                      })
                                    }
                                  >
                                    <Check className="w-3 h-3 mr-0.5" /> Approve
                                  </Button>
                                )}
                                {!isDocRejected && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => {
                                      setDocRejectModal({
                                        isOpen: true,
                                        docId: doc.id,
                                        docName: doc.documentType?.replace(/_/g, " "),
                                      });
                                      setDocRejectReason("");
                                    }}
                                  >
                                    <X className="w-3 h-3 mr-0.5" /> Reject
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── MODAL TAB 3: STRIKES & DISCIPLINARY RECORD ─────────────────── */}
            {riderModalTab === "strikes" && (
              <div className="space-y-4">
                {/* Strike Policy Banner */}
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      AtlasBasket 3-Strike Disciplinary Policy
                    </span>
                    <p className="text-[11px] text-rose-300/80">
                      Strike 1: First formal warning. Strike 2: Second warning. Strike 3: Automatic fleet suspension & order dispatch ban.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 gap-1.5"
                    onClick={() => openIssueStrike(activeRider)}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Issue Formal Strike
                  </Button>
                </div>

                {/* Strikes Table */}
                {(!activeRider.strikes || activeRider.strikes.length === 0) ? (
                  <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.02] text-white/40 text-xs">
                    Clean disciplinary record. Zero strikes issued to this delivery agent.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Strike #</TableHead>
                          <TableHead>Violation Reason</TableHead>
                          <TableHead>Issued Date</TableHead>
                          <TableHead>Appeal Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRider.strikes.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono font-bold text-xs text-rose-400">
                              Strike #{s.strikeNumber}
                            </TableCell>
                            <TableCell className="text-xs text-white/80 max-w-sm">
                              {s.reason}
                            </TableCell>
                            <TableCell className="text-xs text-white/50">
                              {new Date(s.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {s.isRevoked ? (
                                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[9px]">
                                  Revoked / Forgiven
                                </Badge>
                              ) : s.isAppealed ? (
                                <Badge variant="warning" className="text-[9px]">
                                  Appealed ({s.appealStatus || "PENDING"})
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px]">
                                  Active Strike
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!s.isRevoked && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                  isLoading={revokeStrikeMutation.isPending}
                                  onClick={() => {
                                    if (confirm("Revoke this strike? If the rider was suspended due to 3 strikes, this will restore them to active status.")) {
                                      revokeStrikeMutation.mutate({ strikeId: s.id });
                                    }
                                  }}
                                >
                                  Revoke Strike
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ─── MODAL TAB 4: DELIVERY JOBS HISTORY ─────────────────────────── */}
            {riderModalTab === "deliveries" && (
              <div className="space-y-4">
                {(!activeRider.deliveries || activeRider.deliveries.length === 0) ? (
                  <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.02] text-white/40 text-xs">
                    No delivery jobs completed yet by this agent.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tracking #</TableHead>
                          <TableHead>Store Pickup</TableHead>
                          <TableHead>Customer Dropoff</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Rider Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRider.deliveries.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs text-emerald-400">
                              #{d.deliveryNumber || d.trackingNumber || d.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-xs text-white/70 max-w-[160px] truncate">
                              {d.pickupContactName || "Store"} - {d.pickupAddress}
                            </TableCell>
                            <TableCell className="text-xs text-white/70 max-w-[160px] truncate">
                              {d.dropoffContactName || "Customer"} - {d.dropoffAddress}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px]">
                                {d.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-white/90">
                              ₹{((d.riderPayoutPaise || d.riderPayoutAmountPaise || 0) / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ─── MODAL TAB 5: BANKING & PAYOUTS ─────────────────────────────── */}
            {riderModalTab === "payouts" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-teal-400" /> Electronic Bank Account for Disbursals
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-white/40 text-[10px] block">Beneficiary Name</span>
                      <p className="font-semibold text-white/90">{activeRider.bankAccountName || `${activeRider.firstName} ${activeRider.lastName}`}</p>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block">Account Number</span>
                      <p className="font-mono text-white/90">
                        {activeRider.bankAccountNumber ? `••••${activeRider.bankAccountNumber.slice(-4)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block">IFSC Code</span>
                      <p className="font-mono text-white/90">{activeRider.bankIfsc || "—"}</p>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block">UPI VPA</span>
                      <p className="font-mono text-emerald-400">{activeRider.upiId || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Disbursal Records
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={() => {
                      setPayoutRiderId(activeRider.id);
                      setPayoutAmountPaise(50000);
                      setPayoutUtr("");
                      setShowPayoutModal(true);
                    }}
                  >
                    Record Bank Payout
                  </Button>
                </div>

                {(!activeRider.payouts || activeRider.payouts.length === 0) ? (
                  <div className="p-6 text-center border border-white/5 rounded-2xl bg-white/[0.02] text-white/40 text-xs">
                    Zero payouts recorded for this agent.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Bank Reference / UTR</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Settled Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRider.payouts.map((po: any) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono text-xs font-bold text-emerald-400">
                              ₹{(po.netAmountPaise / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-white/60">
                              {po.paymentReference || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-[9px]">
                                {po.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-white/40 font-mono">
                              {new Date(po.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white/30 font-mono">
                System Agent ID: {activeRider.id}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowRiderModal(false)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ─── GENERAL ACTION REASON PROMPT MODAL ──────────────────────────────── */}
      <Dialog
        isOpen={actionPromptModal.isOpen}
        onClose={() => setActionPromptModal((prev) => ({ ...prev, isOpen: false }))}
        title={actionPromptModal.title}
        description={actionPromptModal.description}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-white/60 block mb-1">
              {actionPromptModal.actionType === "REQUEST_DOCS"
                ? "Document / Correction Details (Required):"
                : actionPromptModal.actionType === "SUSPEND"
                ? "Reason for Suspension (Required):"
                : actionPromptModal.actionType === "BAN"
                ? "Reason for Debarment (Required):"
                : "Action Reason (Required):"}
            </label>
            <textarea
              rows={3}
              required
              value={actionModalReason}
              onChange={(e) => setActionModalReason(e.target.value)}
              placeholder={
                actionPromptModal.actionType === "REQUEST_DOCS"
                  ? "e.g. Please re-upload a clear driving licence photo and current vehicle insurance certificate."
                  : actionPromptModal.actionType === "SUSPEND"
                  ? "e.g. Multiple customer complaints of late deliveries and package damage."
                  : actionPromptModal.actionType === "BAN"
                  ? "e.g. Gross misconduct and multiple policy violations."
                  : "Enter detailed reason..."
              }
              className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionPromptModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={actionPromptModal.requireReason && !actionModalReason.trim()}
              isLoading={
                verifyRiderMutation.isPending || updateRiderStatusMutation.isPending
              }
              onClick={handleConfirmActionModal}
              className={
                actionPromptModal.actionType === "BAN"
                  ? "bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  : actionPromptModal.actionType === "SUSPEND"
                  ? "bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              }
            >
              {actionPromptModal.confirmText || "Confirm"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── ISSUE DISCIPLINARY STRIKE MODAL ─────────────────────────────────── */}
      <Dialog
        isOpen={showStrikeModal}
        onClose={() => setShowStrikeModal(false)}
        title={`Issue Disciplinary Strike: ${strikeRiderName}`}
        description="Formal disciplinary strikes are recorded against the delivery agent. 3 strikes will result in automatic suspension."
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <span className="font-bold block">Current Strike Standing:</span>
            <p className="text-[11px] mt-0.5">
              Agent currently has <strong>{strikeCurrentCount} / 3 strikes</strong>.
              {strikeCurrentCount >= 2 && (
                <span className="text-rose-400 font-bold block mt-1">
                  ⚠️ WARNING: Issuing this strike will trigger automatic fleet suspension under the 3-strike policy!
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="text-white/60 block mb-1">Incident / Severity Category:</label>
            <select
              value={strikeSeverity}
              onChange={(e) => setStrikeSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            >
              <option value="POLICY_VIOLATION" className="bg-slate-900">Policy Violation (General)</option>
              <option value="CUSTOMER_DISPUTE" className="bg-slate-900">Customer Dispute / Rude Behavior</option>
              <option value="ORDER_CANCELLATION" className="bg-slate-900">Excessive / Unjustified Cancellation</option>
              <option value="ITEM_DAMAGE" className="bg-slate-900">Confirmed Item Damage</option>
              <option value="UNAUTHORIZED_SUBSTITUTE" className="bg-slate-900">Unauthorized Substitute Driver</option>
              <option value="CRITICAL_MISCONDUCT" className="bg-slate-900">Critical Safety or Theft Violation</option>
            </select>
          </div>

          <div>
            <label className="text-white/60 block mb-1">
              Detailed Reason & Evidence Summary (Required):
            </label>
            <textarea
              rows={3}
              required
              value={strikeReason}
              onChange={(e) => setStrikeReason(e.target.value)}
              placeholder="e.g. Failed to verify dropoff OTP and abandoned customer package at wrong address."
              className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowStrikeModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!strikeReason.trim()}
              isLoading={issueStrikeMutation.isPending}
              onClick={() =>
                issueStrikeMutation.mutate({
                  riderId: strikeRiderId,
                  reason: strikeReason,
                  severity: strikeSeverity,
                })
              }
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Issue Strike #{strikeCurrentCount + 1}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── DOCUMENT REJECTION MODAL ────────────────────────────────────────── */}
      <Dialog
        isOpen={docRejectModal.isOpen}
        onClose={() => setDocRejectModal({ isOpen: false, docId: "", docName: "" })}
        title={`Reject Document: ${docRejectModal.docName}`}
        description="Explain why this document cannot be approved so the delivery agent can upload a valid replacement."
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-white/60 block mb-1">Rejection Reason:</label>
            <input
              type="text"
              required
              value={docRejectReason}
              onChange={(e) => setDocRejectReason(e.target.value)}
              placeholder="e.g. Expired driving licence, blurred photo, or name mismatch"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDocRejectModal({ isOpen: false, docId: "", docName: "" })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!docRejectReason.trim()}
              isLoading={verifyDocMutation.isPending}
              onClick={() =>
                verifyDocMutation.mutate({
                  documentId: docRejectModal.docId,
                  status: "REJECTED",
                  rejectionReason: docRejectReason,
                })
              }
            >
              Confirm Document Rejection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── MANUAL ASSIGN RIDER MODAL ────────────────────────────────────────── */}
      <Dialog
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Manual Rider Assignment"
        description="Select an active approved rider in Mysuru to manually assign this job"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-white/60 block mb-1">Eligible Rider:</label>
            <select
              value={selectedRiderIdForJob}
              onChange={(e) => setSelectedRiderIdForJob(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            >
              <option value="" className="bg-slate-900">Select an approved rider...</option>
              {riders
                .filter((r: any) => r.verificationStatus === "APPROVED")
                .map((r: any) => (
                  <option key={r.id} value={r.id} className="bg-slate-900">
                    {r.firstName} {r.lastName} ({r.vehicleType} • {r.isAvailable ? "Online" : "Offline"})
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedRiderIdForJob}
              isLoading={assignRiderMutation.isPending}
              onClick={() =>
                selectedJob &&
                assignRiderMutation.mutate({
                  jobId: selectedJob.id,
                  riderId: selectedRiderIdForJob,
                })
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── REGISTER LOCAL SHOP MODAL ────────────────────────────────────────── */}
      <Dialog
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
        title="Register External Local Shop"
        description="Enable local pharmacies, bakeries, and stores in Mysuru to request on-demand delivery"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-white/60 block mb-1">Business Name:</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Mysuru Central Bakery"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            />
          </div>

          <div>
            <label className="text-white/60 block mb-1">Category:</label>
            <select
              value={shopCategory}
              onChange={(e) => setShopCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            >
              <option value="GROCERY" className="bg-slate-900">Grocery Store</option>
              <option value="PHARMACY" className="bg-slate-900">Pharmacy</option>
              <option value="BAKERY" className="bg-slate-900">Bakery / Confectionery</option>
              <option value="RESTAURANT" className="bg-slate-900">Restaurant / Cafe</option>
              <option value="FLORIST" className="bg-slate-900">Florist</option>
              <option value="ELECTRONICS" className="bg-slate-900">Electronics</option>
              <option value="CLOTHING" className="bg-slate-900">Clothing Store</option>
              <option value="OTHER" className="bg-slate-900">Other Local Merchant</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 block mb-1">Owner / Manager:</label>
              <input
                type="text"
                value={shopOwner}
                onChange={(e) => setShopOwner(e.target.value)}
                placeholder="Manager Name"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="text-white/60 block mb-1">Phone Number:</label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-white/60 block mb-1">Store Address in Mysuru:</label>
            <input
              type="text"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="e.g. #42, Sayyaji Rao Road, Mysuru"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowShopModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!shopName || !shopPhone || !shopAddress}
              isLoading={createShopMutation.isPending}
              onClick={() =>
                createShopMutation.mutate({
                  name: shopName,
                  category: shopCategory,
                  contactPerson: shopOwner,
                  contactPhone: shopPhone,
                  address: shopAddress,
                  city: "Mysuru",
                })
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Save Shop
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── PROCESS PAYOUT MODAL ────────────────────────────────────────────── */}
      <Dialog
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Process Rider Bank Payout"
        description="Record electronic bank transfer with bank UTR transaction reference"
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <span className="text-white/60">Disbursal Amount:</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              ₹{(payoutAmountPaise / 100).toFixed(2)}
            </span>
          </div>

          <div>
            <label className="text-white/60 block mb-1">
              Bank UTR / Transaction Reference Number:
            </label>
            <input
              type="text"
              required
              value={payoutUtr}
              onChange={(e) => setPayoutUtr(e.target.value)}
              placeholder="e.g. UTR123456789012"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPayoutModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!payoutUtr.trim()}
              isLoading={processPayoutMutation.isPending}
              onClick={() =>
                processPayoutMutation.mutate({
                  riderId: payoutRiderId,
                  amountPaise: payoutAmountPaise,
                  bankReference: payoutUtr,
                  notes: "Settled via admin payout console",
                })
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Confirm Disbursal
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── RESOLVE INCIDENT MODAL ──────────────────────────────────────────── */}
      <Dialog
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Adjudicate Package Damage / Incident"
        description="Determine fault and calculate financial penalty per delivery policy"
      >
        {selectedIncident && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <span className="font-bold text-white block">
                Category: {selectedIncident.incidentType}
              </span>
              <p className="text-white/70">{selectedIncident.description}</p>
            </div>

            <div>
              <label className="text-white/60 block mb-1">Resolution Notes:</label>
              <textarea
                rows={3}
                value={incidentResolutionNotes}
                onChange={(e) => setIncidentResolutionNotes(e.target.value)}
                placeholder="Explain the adjudication decision..."
                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  resolveIncidentMutation.mutate({
                    id: selectedIncident.id,
                    payload: {
                      status: "RESOLVED_NO_FAULT",
                      resolutionNotes: incidentResolutionNotes || "Rider exonerated",
                    },
                  })
                }
              >
                No Fault / Exonerate Rider
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  resolveIncidentMutation.mutate({
                    id: selectedIncident.id,
                    payload: {
                      status: "RESOLVED_RIDER_FAULT",
                      faultPenaltyPaise: incidentPenaltyPaise,
                      resolutionNotes: incidentResolutionNotes || "Confirmed rider negligence",
                    },
                  })
                }
              >
                Rider At Fault (Apply 20% Penalty)
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
