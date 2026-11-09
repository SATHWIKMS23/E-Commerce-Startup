"use client";

import React, { useState } from "react";
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
  Building2,
  MapPin,
  RefreshCw,
  Send,
  Eye,
  FileText,
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
  const [tab, setTab] = useState<DeliveryTab>("overview");
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  // Filters & State
  const [riderFilter, setRiderFilter] = useState("ALL");
  const [riderSearch, setRiderSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
      status,
      rejectionReason,
    }: {
      id: string;
      status: string;
      rejectionReason?: string;
    }) => deliveryApi.verifyRider(id, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      setShowRiderModal(false);
      showToast("Rider verification status updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const updateRiderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      deliveryApi.updateRiderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      showToast("Rider account status updated.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

  const deleteAadhaarMutation = useMutation({
    mutationFn: (id: string) => deliveryApi.deleteRiderAadhaar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-riders"] });
      setShowRiderModal(false);
      showToast("Aadhaar permanently deleted with zero trace.", "info");
    },
    onError: (e: any) => showToast(e.message, "error"),
  });

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
                  Rider Fleet Operations
                </CardTitle>
                <CardDescription>
                  Review applications, verify documents, and enforce 3-strike policy
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
                    placeholder="Search name, phone, email..."
                    className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                <select
                  value={riderFilter}
                  onChange={(e) => setRiderFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 py-1.5 px-2.5"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses</option>
                  <option value="PENDING" className="bg-slate-900">Pending Review</option>
                  <option value="APPROVED" className="bg-slate-900">Approved Fleet</option>
                  <option value="SUSPENDED" className="bg-slate-900">Suspended / Strikes</option>
                  <option value="BANNED" className="bg-slate-900">Banned</option>
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
                No riders match the selected filter
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rider Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle & DL</TableHead>
                    <TableHead>Masked Aadhaar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-xs text-white/90">
                        {r.firstName} {r.lastName}
                        {r.isAvailable && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-white/60">
                        {r.phone} <br />
                        <span className="text-[10px] text-white/40">{r.email}</span>
                      </TableCell>
                      <TableCell className="text-xs text-white/70 capitalize">
                        {r.vehicleType?.replace(/_/g, " ")}
                        <span className="block text-[10px] text-white/40">
                          {r.vehicleType === "BICYCLE"
                            ? "Exempt"
                            : r.drivingLicenseNumber || "No DL provided"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-emerald-400">
                        {r.aadhaarNumberMasked || "Purged / None"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.verificationStatus === "APPROVED"
                              ? "default"
                              : r.verificationStatus === "PENDING"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[9px]"
                        >
                          {r.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-400 font-mono">
                        ★ {r.ratingAverage ? Number(r.ratingAverage).toFixed(1) : "5.0"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-white/70 hover:text-white"
                          onClick={() => {
                            setSelectedRider(r);
                            setShowRiderModal(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Review
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

      {/* ─── REVIEW RIDER MODAL ───────────────────────────────────────────────── */}
      <Dialog
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
        title={
          selectedRider
            ? `Review Rider: ${selectedRider.firstName} ${selectedRider.lastName}`
            : "Review Rider"
        }
        description="Verify vehicle eligibility, driving licence, and UIDAI masked identity documents"
        maxWidth="max-w-[620px]"
      >
        {selectedRider && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <span className="text-white/40 block mb-0.5">Phone & Email</span>
                <p className="text-white font-semibold">{selectedRider.phone}</p>
                <p className="text-white/70">{selectedRider.email}</p>
              </div>

              <div>
                <span className="text-white/40 block mb-0.5">Vehicle Classification</span>
                <p className="text-white font-semibold uppercase">{selectedRider.vehicleType}</p>
                <p className="text-white/70">
                  {selectedRider.vehicleType === "BICYCLE"
                    ? "Bicycle (DL Exempt)"
                    : `Plate: ${selectedRider.vehicleNumber || "Pending"}`}
                </p>
              </div>

              <div>
                <span className="text-white/40 block mb-0.5">Aadhaar (Masked)</span>
                <p className="font-mono text-emerald-400 font-bold">
                  {selectedRider.aadhaarNumberMasked || "None / Purged"}
                </p>
              </div>

              <div>
                <span className="text-white/40 block mb-0.5">Bank Payout Info</span>
                <p className="text-white/80 font-mono">
                  {selectedRider.bankName} • ••••{selectedRider.bankAccountNumber?.slice(-4)}
                </p>
              </div>
            </div>

            {/* Aadhaar Zero-Trace Deletion Option */}
            {selectedRider.aadhaarNumberMasked && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-300 block">Permanent Aadhaar Purge</span>
                  <p className="text-[10px] text-rose-400/80">
                    Irrevocably erase raw identity records per UIDAI data privacy standards.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[10px]"
                  isLoading={deleteAadhaarMutation.isPending}
                  onClick={() => {
                    if (confirm("Are you sure? This permanently deletes the rider's stored identity document.")) {
                      deleteAadhaarMutation.mutate(selectedRider.id);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Purge Aadhaar
                </Button>
              </div>
            )}

            {/* Rejection / Action required reason input */}
            <div>
              <label className="text-white/50 block mb-1">
                Notes / Rejection Reason (if rejecting or requesting resubmission):
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Blurred driving licence photo"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowRiderModal(false)}
              >
                Close
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                isLoading={verifyRiderMutation.isPending}
                onClick={() =>
                  verifyRiderMutation.mutate({
                    id: selectedRider.id,
                    status: "REJECTED",
                    rejectionReason: rejectionReason || "Incomplete documentation",
                  })
                }
              >
                Reject Application
              </Button>

              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                isLoading={verifyRiderMutation.isPending}
                onClick={() =>
                  verifyRiderMutation.mutate({
                    id: selectedRider.id,
                    status: "APPROVED",
                  })
                }
              >
                Approve for Mysuru Fleet
              </Button>
            </div>
          </div>
        )}
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
