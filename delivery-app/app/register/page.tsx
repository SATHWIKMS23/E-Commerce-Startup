"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { apiClient } from "@/lib/apiClient";
import {
  User,
  Bike,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [operationalDistricts, setOperationalDistricts] = useState<
    Array<{ id: string; name: string; state: string }>
  >([]);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Personal
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    dateOfBirth: "",
    city: "",
    residentialAddress: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    // Step 2: Vehicle
    vehicleType: "MOTORCYCLE" as "BICYCLE" | "MOTORCYCLE" | "SCOOTER" | "EV",
    vehicleNumber: "",
    licenseNumber: "",
    rcNumber: "",
    insuranceNumber: "",
    drivingLicenseDocUrl: "",
    rcDocUrl: "",
    insuranceDocUrl: "",
    // Step 3: Identity Verification
    aadhaarNumber: "",
    aadhaarDocUrl: "",
    // Step 4: Payout Details
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    upiId: "",
  });

  // Fetch operational districts enabled by admin in DB
  useEffect(() => {
    apiClient
      .get("/api/delivery/districts")
      .then((res) => {
        if (res.data?.districts) {
          setOperationalDistricts(res.data.districts);
          if (res.data.districts.length === 1) {
            setForm((prev) => ({ ...prev, city: res.data.districts[0].name }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill profile if user is authenticated via Google / NextAuth session
  useEffect(() => {
    const rawRider = localStorage.getItem("delivery_partner_rider");
    const storedRider = rawRider ? JSON.parse(rawRider) : (session as any)?.rider;

    if (storedRider || session?.user) {
      setIsGoogleUser(true);
      const email = storedRider?.email || session?.user?.email || "";
      const fullName = session?.user?.name || `${storedRider?.firstName || ""} ${storedRider?.lastName || ""}`.trim();
      const parts = fullName.split(" ");
      const firstName = storedRider?.firstName || parts[0] || "";
      const lastName = storedRider?.lastName || parts.slice(1).join(" ") || "";

      setForm((prev) => ({
        ...prev,
        email: email || prev.email,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        phone: storedRider?.phone?.startsWith("G_") ? "" : (storedRider?.phone || prev.phone),
        city: storedRider?.city || prev.city,
        vehicleType: storedRider?.vehicleType || prev.vehicleType,
        vehicleNumber: storedRider?.vehicleNumber || prev.vehicleNumber,
        licenseNumber: storedRider?.licenseNumber || prev.licenseNumber,
        bankAccountName: storedRider?.bankAccountName || prev.bankAccountName,
        bankAccountNumber: storedRider?.bankAccountNumber || prev.bankAccountNumber,
        bankIfsc: storedRider?.bankIfsc || prev.bankIfsc,
        upiId: storedRider?.upiId || prev.upiId,
      }));
    }
  }, [session, sessionStatus]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signIn("google", { callbackUrl: "/register?step=details" });
    } catch (err: any) {
      setError(err?.message || "Google registration failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.phone || !form.email || (!isGoogleUser && !form.password)) {
        setError("Please complete all required personal details.");
        return false;
      }
      if (form.phone.trim().length < 10 || form.phone.startsWith("G_")) {
        setError("Please enter a valid 10-digit mobile phone number.");
        return false;
      }
      if (!form.city) {
        setError("Please select an active operational district to deliver in.");
        return false;
      }
      if (form.dateOfBirth) {
        const dob = new Date(form.dateOfBirth);
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 18) {
          setError("You must be at least 18 years old to deliver.");
          return false;
        }
      } else {
        setError("Date of birth is required to verify age eligibility (18+).");
        return false;
      }
    } else if (step === 2) {
      if (form.vehicleType !== "BICYCLE" && !form.licenseNumber && !form.drivingLicenseDocUrl) {
        setError("Valid driving license is required for motorized vehicles.");
        return false;
      }
    } else if (step === 3) {
      if (!form.aadhaarNumber && !form.aadhaarDocUrl) {
        setError("Please provide your Aadhaar number or document for identity verification.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(4, prev + 1));
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem("delivery_partner_token") || (session as any)?.backendToken;

    try {
      if (token && isGoogleUser) {
        // Update existing Google-authenticated provisional rider with verification details
        const res = await apiClient.put("/api/delivery/riders/me", form);
        if (res.data?.rider) {
          localStorage.setItem("delivery_partner_rider", JSON.stringify(res.data.rider));
        }
        router.push("/dashboard?registered=true");
      } else {
        // Standard full registration
        const res = await apiClient.post("/api/delivery/auth/register", form);
        if (res.data.success) {
          if (res.data.token) {
            localStorage.setItem("delivery_partner_token", res.data.token);
          }
          if (res.data.rider) {
            localStorage.setItem("delivery_partner_rider", JSON.stringify(res.data.rider));
          }
          router.push("/dashboard?registered=true");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07070a] text-zinc-100">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle monochrome ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-white/[0.025] blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Rider Registration
            </h1>
            <p className="text-xs text-zinc-400">
              Deliver orders from local shops and earn with every trip
            </p>
          </div>

          {/* Google Sign In Callout (If not already signed in) */}
          {!isGoogleUser ? (
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-left">
                <span className="text-xs font-semibold text-white block">Speed up with Google</span>
                <span className="text-[11px] text-zinc-400 block">
                  Sign in with Google first, then submit vehicle details for verification
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={googleLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          ) : (
            <div className="p-3 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Signed in as <strong>{form.email}</strong> via Google. Please submit remaining details below for verification.
                </span>
              </div>
            </div>
          )}

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between relative px-2">
            {[
              { num: 1, label: "Personal", icon: User },
              { num: 2, label: "Vehicle", icon: Bike },
              { num: 3, label: "Identity", icon: Shield },
              { num: 4, label: "Payout", icon: CreditCard },
            ].map((s) => {
              const Icon = s.icon;
              const isPast = step > s.num;
              const isCurrent = step === s.num;

              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-white text-zinc-950 font-bold shadow-sm"
                        : isPast
                        ? "bg-white/10 text-zinc-200 border border-white/20"
                        : "bg-white/[0.03] text-zinc-600 border border-white/[0.08]"
                    }`}
                  >
                    {isPast ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-[10px] ${
                      isCurrent
                        ? "font-bold text-white"
                        : isPast
                        ? "font-medium text-zinc-300"
                        : "text-zinc-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Card */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl shadow-2xl space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-white/[0.06] pb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="e.g. Gowda"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        disabled={isGoogleUser}
                        value={form.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {!isGoogleUser && (
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Create Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 6 characters"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Date of Birth * (Must be 18+)
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Operating District * (Admin-Approved Zones)
                    </label>
                    <select
                      name="city"
                      required
                      value={form.city}
                      onChange={handleChange}
                      className="w-full bg-[#0d0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                      <option value="" className="bg-[#0c0c10] text-zinc-400">
                        {operationalDistricts.length > 0
                          ? "Select your operational district..."
                          : "Loading enabled districts..."}
                      </option>
                      {operationalDistricts.map((d) => (
                        <option key={d.id} value={d.name} className="bg-[#0c0c10]">
                          {d.name} ({d.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Residential Address
                    </label>
                    <textarea
                      name="residentialAddress"
                      rows={2}
                      value={form.residentialAddress}
                      onChange={handleChange}
                      placeholder="Area, Street, Locality"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        placeholder="Contact person"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="Mobile number"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Vehicle Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-white/[0.06] pb-2">
                    Vehicle Information
                  </h3>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Select Vehicle Type *
                    </label>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                      {[
                        { type: "BICYCLE", label: "Bicycle (No license needed)" },
                        { type: "MOTORCYCLE", label: "Motorcycle / Bike" },
                        { type: "SCOOTER", label: "Scooter" },
                        { type: "EV", label: "Electric 2-Wheeler" },
                      ].map((v) => (
                        <button
                          key={v.type}
                          type="button"
                          onClick={() => setForm({ ...form, vehicleType: v.type as any })}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                            form.vehicleType === v.type
                              ? "bg-white/10 border-white/30 text-white"
                              : "bg-white/[0.02] border-white/10 text-zinc-400 hover:bg-white/[0.05]"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.vehicleType !== "BICYCLE" && (
                    <>
                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Vehicle Registration Number (RC)
                        </label>
                        <input
                          type="text"
                          name="vehicleNumber"
                          value={form.vehicleNumber}
                          onChange={handleChange}
                          placeholder="e.g. KA-09-EA-1234"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Driving License Number *
                        </label>
                        <input
                          type="text"
                          name="licenseNumber"
                          value={form.licenseNumber}
                          onChange={handleChange}
                          placeholder="e.g. KA0920220001234"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Driving License Photo / Document Link
                        </label>
                        <input
                          type="url"
                          name="drivingLicenseDocUrl"
                          value={form.drivingLicenseDocUrl}
                          onChange={handleChange}
                          placeholder="https://... storage reference"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 3: Identity Verification */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-white/[0.06] pb-2">
                    Identity Verification
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <Lock className="h-4 w-4 text-zinc-400" />
                      <span>Data Protection & Privacy Notice</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Your identity document is masked and securely stored with restricted administrative access. Once verified, you may request permanent deletion under our document retention policy.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Aadhaar Number (Will be masked: XXXX-XXXX-1234)
                    </label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      maxLength={14}
                      value={form.aadhaarNumber}
                      onChange={handleChange}
                      placeholder="12-digit Aadhaar number"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Aadhaar Document / ID Photo Link
                    </label>
                    <input
                      type="url"
                      name="aadhaarDocUrl"
                      value={form.aadhaarDocUrl}
                      onChange={handleChange}
                      placeholder="https://... secure storage link"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Payout Details */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-white/[0.06] pb-2">
                    Payment & Payout Information
                  </h3>

                  <p className="text-[11px] text-zinc-400">
                    Your weekly delivery earnings will be deposited to this account.
                  </p>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      UPI ID (Recommended for fastest settlement)
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={form.upiId}
                      onChange={handleChange}
                      placeholder="e.g. yourname@okhdfcbank"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/[0.08]"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Or Bank Account
                    </span>
                    <div className="flex-grow border-t border-white/[0.08]"></div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="bankAccountName"
                      value={form.bankAccountName}
                      onChange={handleChange}
                      placeholder="Name as in bank passbook"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="password"
                        name="bankAccountNumber"
                        value={form.bankAccountNumber}
                        onChange={handleChange}
                        placeholder="Account number"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        name="bankIfsc"
                        value={form.bankIfsc}
                        onChange={handleChange}
                        placeholder="e.g. SBIN0001234"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 font-medium transition-colors"
                  >
                    Already registered? Sign in
                  </Link>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto transition-colors"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto transition-colors disabled:opacity-50"
                  >
                    <span>{loading ? "Submitting Application..." : "Submit Registration"}</span>
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
