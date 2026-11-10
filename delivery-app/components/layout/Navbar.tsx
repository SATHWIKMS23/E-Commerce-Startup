"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Truck, LogOut, User, Menu, X, Power } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface NavbarProps {
  rider?: any;
  onAvailabilityToggle?: (isOnline: boolean) => void;
}

export function Navbar({ rider, onAvailabilityToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Synced branding from Admin
  const [branding, setBranding] = useState<{
    brandName: string;
    brandLogoUrl: string | null;
    brandTagline: string;
    activeCity: string;
  }>({
    brandName: "AtlasBasket Delivery",
    brandLogoUrl: null,
    brandTagline: "Local Delivery Fleet",
    activeCity: "Mysuru",
  });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/delivery/settings/public")
      .then((res) => {
        if (isMounted && res.data?.settings) {
          const s = res.data.settings;
          setBranding({
            brandName: s.brandName || "AtlasBasket Delivery",
            brandLogoUrl: s.brandLogoUrl || null,
            brandTagline: s.brandTagline || "Local Delivery Fleet",
            activeCity: s.activeCity || "Mysuru",
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/delivery/auth/logout");
    } catch {}
    localStorage.removeItem("delivery_partner_token");
    localStorage.removeItem("delivery_partner_rider");
    router.push("/login");
  };

  const handleToggle = async () => {
    if (!rider || isToggling) return;
    setIsToggling(true);
    try {
      const nextState = !rider.isAvailable;
      const res = await apiClient.post("/api/delivery/availability", {
        isAvailable: nextState,
      });
      if (res.data?.success && onAvailabilityToggle) {
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

  const hasValidLogo = Boolean(!logoError && branding.brandLogoUrl && branding.brandLogoUrl.trim() !== "");

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07070a]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title (Synced with Admin, Responsive on all devices) */}
        <Link
          href={rider ? "/dashboard" : "/"}
          className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0"
        >
          {hasValidLogo ? (
            <img
              src={branding.brandLogoUrl!}
              alt={branding.brandName}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-lg shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-white group-hover:text-white/90 transition-colors truncate max-w-[120px] sm:max-w-none">
                {branding.brandName}
              </span>
              <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-medium text-white/50 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] shrink-0">
                Delivery
              </span>
            </div>
            <span className="hidden md:block text-[10px] text-white/40 font-mono -mt-0.5 truncate">
              {branding.activeCity} Fleet
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Authenticated) */}
        {rider && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {rider ? (
            <>
              {/* Online/Offline Toggle Button */}
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  rider.isAvailable
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <Power className={`h-3.5 w-3.5 ${isToggling ? "animate-spin" : ""}`} />
                <span>{rider.isAvailable ? "Online" : "Offline"}</span>
              </button>

              {/* Profile Link */}
              <Link
                href="/profile"
                className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                href="/login"
                className="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center justify-center"
              >
                <span className="hidden xs:inline">Become a Rider</span>
                <span className="xs:hidden">Join Fleet</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && rider && (
        <div className="md:hidden border-t border-white/10 bg-[#07070a]/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={handleToggle}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-white/80"
            >
              <Power className="h-4 w-4" />
              <span>{rider.isAvailable ? "Set Status: Offline" : "Set Status: Online"}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
