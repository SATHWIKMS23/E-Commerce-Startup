"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  Truck,
  ShieldCheck,
  Clock,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Bike,
  Sparkles,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  const [tripsPerDay, setTripsPerDay] = useState(14);
  const avgEarningPerTrip = 65; // ₹65 per delivery average in Mysuru

  const dailyEarning = tripsPerDay * avgEarningPerTrip;
  const monthlyEarning = dailyEarning * 26; // 26 working days

  return (
    <div className="flex flex-col min-h-screen bg-[#090a0f] text-slate-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[550px] sm:h-[550px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Now Launching Across Mysuru City</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Deliver locally. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Earn directly with every trip.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
              Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Register as a Rider</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl glass-button text-sm font-semibold flex items-center justify-center"
              >
                Rider Sign In
              </Link>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-12 max-w-3xl mx-auto">
              {[
                { label: "Rider Payout", value: "~90%", desc: "Direct earnings share" },
                { label: "Active City", value: "Mysuru", desc: "Local delivery zones" },
                { label: "Registration Fee", value: "₹0 Free", desc: "No upfront fees" },
                { label: "Vehicles", value: "Bikes & EVs", desc: "Bicycles welcome" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4 rounded-2xl text-left border border-white/5">
                  <div className="text-lg sm:text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs font-semibold text-blue-400 mt-0.5">{stat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Earnings Calculator */}
        <section className="py-16 border-y border-white/5 bg-slate-950/40 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">How much can you earn?</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Earnings vary based on completed trips and distance. Move the slider below to estimate.
              </p>
            </div>

            <div className="glass-panel p-6 sm:p-10 rounded-3xl space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">Deliveries per day:</span>
                  <span className="text-xl font-bold text-blue-400">{tripsPerDay} trips / day</span>
                </div>

                <input
                  type="range"
                  min="4"
                  max="30"
                  step="1"
                  value={tripsPerDay}
                  onChange={(e) => setTripsPerDay(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Part-time (4 trips)</span>
                  <span>Standard (15 trips)</span>
                  <span>Full-time (30 trips)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="glass-card p-5 rounded-2xl">
                  <span className="text-xs text-slate-400 block font-medium">Estimated Daily Earnings</span>
                  <span className="text-3xl font-extrabold text-white mt-1 block">
                    ₹{dailyEarning.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">₹{(avgEarningPerTrip).toFixed(0)} avg per delivery</span>
                </div>

                <div className="glass-card p-5 rounded-2xl border-blue-500/20 bg-blue-500/[0.04]">
                  <span className="text-xs text-blue-300 block font-medium">Estimated Monthly Earnings (26 days)</span>
                  <span className="text-3xl font-extrabold text-blue-400 mt-1 block">
                    ₹{monthlyEarning.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-slate-400">Directly deposited to your bank / UPI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How AtlasBasket Delivery Works</h2>
            <p className="text-xs sm:text-sm text-slate-400">Start delivering in 4 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Register & Verify",
                desc: "Sign up in 3 minutes. Upload your vehicle details and identity verification.",
              },
              {
                step: "02",
                title: "Go Online",
                desc: "Switch availability online whenever you are ready to accept nearby delivery offers.",
              },
              {
                step: "03",
                title: "Pickup & Deliver",
                desc: "Navigate to the shop, verify pickup with OTP/QR, and deliver to the customer.",
              },
              {
                step: "04",
                title: "Get Paid",
                desc: "Watch your balance update instantly after every successful drop-off.",
              },
            ].map((s) => (
              <div key={s.step} className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  Step {s.step}
                </span>
                <h3 className="text-base font-bold text-white pt-1">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Eligibility & Requirements */}
        <section className="py-14 border-t border-white/5 bg-slate-950/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="glass-panel p-6 sm:p-10 rounded-3xl space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <span>Rider Requirements</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                {[
                  "Must be 18 years of age or older",
                  "Valid driving license (Motorcycles & Scooters)",
                  "Bicycle riders exempt from motor vehicle license",
                  "Android or iOS smartphone with GPS",
                  "Valid Identity Verification (Aadhaar or equivalent)",
                  "Bank account or UPI ID for payout settlements",
                  "Zero registration fees or hidden deductions",
                  "Operates inside Mysuru service zones",
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[11px] text-slate-400">
                  By signing up, you agree to the{" "}
                  <Link href="/terms" className="text-blue-400 hover:underline">
                    Rider Terms & Policies
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-400 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
                <Link
                  href="/register"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shrink-0"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-400 space-y-2">
        <p>© 2026 AtlasBasket Delivery Platform. All rights reserved.</p>
        <div className="flex justify-center gap-4 text-[11px]">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms & Guidelines
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-white transition-colors">
            Rider Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
