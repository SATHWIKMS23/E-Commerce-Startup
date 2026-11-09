"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Personal
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    dateOfBirth: "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.password) {
        setError("Please complete all required personal details.");
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

    try {
      const res = await apiClient.post("/api/delivery/auth/register", form);
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem("delivery_partner_token", res.data.token);
        }
        router.push("/dashboard?registered=true");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090a0f] text-slate-100">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Rider Registration</h1>
            <p className="text-xs text-slate-400">Join the AtlasBasket local delivery fleet in Mysuru</p>
          </div>

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
                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isCurrent
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white/5 text-white/30 border border-white/5"
                    }`}
                  >
                    {isPast ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      isCurrent ? "text-blue-400" : isPast ? "text-emerald-400" : "text-white/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="e.g. Gowda"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Create Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Date of Birth * (Must be 18+)
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Residential Address
                    </label>
                    <textarea
                      name="residentialAddress"
                      rows={2}
                      value={form.residentialAddress}
                      onChange={handleChange}
                      placeholder="Area, Street, Mysuru"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Emergency Contact Name
                      </label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        placeholder="Contact person"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="Mobile number"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Vehicle Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                    Vehicle Information
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Select Vehicle Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
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
                              ? "bg-blue-600/20 border-blue-500 text-blue-300"
                              : "bg-slate-900/80 border-white/10 text-white/70 hover:bg-slate-800"
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
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Vehicle Registration Number (RC)
                        </label>
                        <input
                          type="text"
                          name="vehicleNumber"
                          value={form.vehicleNumber}
                          onChange={handleChange}
                          placeholder="e.g. KA-09-EA-1234"
                          className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Driving License Number *
                        </label>
                        <input
                          type="text"
                          name="licenseNumber"
                          value={form.licenseNumber}
                          onChange={handleChange}
                          placeholder="e.g. KA0920220001234"
                          className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                          Driving License Photo / Document Link
                        </label>
                        <input
                          type="url"
                          name="drivingLicenseDocUrl"
                          value={form.drivingLicenseDocUrl}
                          onChange={handleChange}
                          placeholder="https://... or upload storage reference"
                          className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 3: Identity Verification */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                    Identity Verification
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Lock className="h-4 w-4" />
                      <span>Data Protection & Privacy Notice</span>
                    </div>
                    <p className="text-[11px] text-blue-200/80 leading-relaxed">
                      Your identity document is masked and securely stored with restricted administrative access. Once verified, you may request permanent deletion under our document retention policy.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Aadhaar Number (Will be masked: XXXX-XXXX-1234)
                    </label>
                    <input
                      type="text"
                      name="aadhaarNumber"
                      maxLength={14}
                      value={form.aadhaarNumber}
                      onChange={handleChange}
                      placeholder="12-digit Aadhaar number"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Aadhaar Document / ID Photo Link
                    </label>
                    <input
                      type="url"
                      name="aadhaarDocUrl"
                      value={form.aadhaarDocUrl}
                      onChange={handleChange}
                      placeholder="https://... secure storage link"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Payout Details */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
                    Payment & Payout Information
                  </h3>

                  <p className="text-[11px] text-slate-400">
                    Your weekly delivery earnings will be deposited to this account.
                  </p>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      UPI ID (Recommended for fastest settlement)
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={form.upiId}
                      onChange={handleChange}
                      placeholder="e.g. yourname@okhdfcbank"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase">
                      Or Bank Account
                    </span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      name="bankAccountName"
                      value={form.bankAccountName}
                      onChange={handleChange}
                      placeholder="Name as in bank passbook"
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="password"
                        name="bankAccountNumber"
                        value={form.bankAccountNumber}
                        onChange={handleChange}
                        placeholder="Account number"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        name="bankIfsc"
                        value={form.bankIfsc}
                        onChange={handleChange}
                        placeholder="e.g. SBIN0001234"
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white glass-button flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <Link href="/login" className="text-xs text-blue-400 hover:underline">
                    Already registered? Sign in
                  </Link>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer ml-auto disabled:opacity-50"
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
