"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Truck, Bell, LogOut, ShieldCheck, ShieldAlert, User, Menu, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { RiderProfile } from "@/types/delivery";

interface NavbarProps {
  rider?: any;
  onAvailabilityToggle?: (isOnline: boolean) => void;
}

export function Navbar({ rider, onAvailabilityToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/delivery/auth/logout");
      localStorage.removeItem("delivery_partner_token");
      router.push("/login");
    } catch {
      localStorage.removeItem("delivery_partner_token");
      router.push("/login");
    }
  };

  const handleToggle = async () => {
    if (!rider || isToggling) return;
    setIsToggling(true);
    try {
      const nextState = !rider.isAvailable;
      const res = await apiClient.post("/api/delivery/availability", {
        isAvailable: nextState,
      });
      if (res.data.success && onAvailabilityToggle) {
        onAvailabilityToggle(nextState);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to toggle status");
    } finally {
      setIsToggling(false);
    }
  };

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Offers", href: "/offers" },
    { label: "Earnings", href: "/earnings" },
    { label: "History", href: "/history" },
    { label: "Support", href: "/support" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href={rider ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              AtlasBasket <span className="text-blue-400 font-semibold text-xs px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">Delivery</span>
            </span>
            <span className="text-[10px] text-white/40 block -mt-1 font-mono">Mysuru Fleet</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        {rider && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-white/10 text-white border border-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {rider ? (
            <>
              {/* Online/Offline Toggle Button */}
              {rider.verificationStatus === "APPROVED" ? (
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    rider.isAvailable
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      rider.isAvailable ? "bg-emerald-400 animate-pulse" : "bg-white/30"
                    }`}
                  />
                  <span>{rider.isAvailable ? "ONLINE" : "OFFLINE"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  <ShieldAlert className="h-3 w-3" />
                  <span>Pending Approval</span>
                </div>
              )}

              {/* Profile Link */}
              <Link
                href="/profile"
                className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                title="Profile & Documents"
              >
                <User className="h-4 w-4" />
              </Link>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="hidden sm:flex h-9 w-9 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all"
              >
                Become a Rider
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {rider && mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/5 px-4 pt-3 pb-4 space-y-2 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
}
